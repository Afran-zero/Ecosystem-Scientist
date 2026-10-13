"use client";

import { useState } from "react";
import { useLiveSimulation } from "@/components/game/hooks";
import { compareRuns } from "@/simulation/experiments";
import { livabilityIndex } from "@/simulation/livability";
import type { DayRecord, ExperimentRecord, GameConfig } from "@/types";
import { Chart } from "./charts";

/**
 * Results (spec 4.3). Every series is read from a saved run's day records, never from sample data.
 * Nothing here runs the simulation.
 */

export default function ResultsPanel({ config }: { config: GameConfig }) {
  const store = useLiveSimulation();
  const runs = store.savedExperiments;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baselineId, setBaselineId] = useState<string | null>(null);

  if (runs.length === 0) {
    return <p className="text-sm text-cream-soft">No results yet. Run a control and an experiment on the Experiments tab. Runs are kept in this browser.</p>;
  }

  const selected = runs.find((r) => r.id === selectedId) ?? runs[runs.length - 1];
  const controls = runs.filter((r) => r.role === "control");
  const baseline = runs.find((r) => r.id === baselineId) ?? controls[controls.length - 1] ?? runs[0];
  const speciesIds = config.species.map((s) => s.id);
  const cmp = compareRuns(baseline, selected, speciesIds);
  const days = selected.statistics;
  const shared = Math.min(baseline.statistics.length, days.length);
  const speciesCount = config.species.length;
  const lastShared = Math.max(0, shared - 1);
  const livabilityChange = round1(livabilityIndex(days[lastShared], speciesCount) - livabilityIndex(baseline.statistics[lastShared], speciesCount));

  const populationData = days.map((d) => ({ day: d.day + 1, ...d.counts }));
  const grassData = days.map((d) => ({ day: d.day + 1, grass: round1(d.grassCoveragePercent), trees: d.treeCount }));
  const livabilityData = days.map((d) => ({ day: d.day + 1, livability: livabilityIndex(d, speciesCount) }));
  const birthDeathData = days.map((d) => ({
    day: d.day + 1,
    births: sum(d.births),
    deaths: sum(d.deaths),
  }));
  const eatenData = days.map((d) => ({ day: d.day + 1, ...d.eaten }));
  const envData = days.map((d) => ({ day: d.day + 1, ...d.env }));
  const compData = Array.from({ length: shared }, (_, i) => ({
    day: i + 1,
    baseline: sum(baseline.statistics[i].counts),
    experiment: sum(days[i].counts),
  }));
  const compLivability = Array.from({ length: shared }, (_, i) => ({
    day: i + 1,
    baseline: livabilityIndex(baseline.statistics[i], speciesCount),
    experiment: livabilityIndex(days[i], speciesCount),
  }));

  const totals = Object.fromEntries(
    config.species.map((s) => [
      s.id,
      {
        births: sumBy(days, (d) => d.births[s.id] ?? 0),
        deaths: sumBy(days, (d) => d.deaths[s.id] ?? 0),
        eaten: sumBy(days, (d) => d.eaten[s.id] ?? 0),
      },
    ]),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <RunPicker label="Run" runs={runs} value={selected.id} onChange={setSelectedId} />
        <RunPicker label="Compare with" runs={runs} value={baseline.id} onChange={setBaselineId} />
      </div>

      <section className="rounded border border-brown p-3 text-sm text-cream">
        <h3 className="mb-2 font-semibold text-cream">What changed (day {shared})</h3>
        <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {config.species.map((s) => (
            <li key={s.id}>
              {s.displayName}: {cmp.countDelta[s.id] >= 0 ? "+" : ""}
              {cmp.countDelta[s.id]} animals
            </li>
          ))}
          <li>
            Grass: {cmp.grassDeltaPercent >= 0 ? "+" : ""}
            {cmp.grassDeltaPercent.toFixed(1)} points
          </li>
          <li>
            Livability: {livabilityChange >= 0 ? "+" : ""}
            {livabilityChange} points
          </li>
        </ul>
        {cmp.extinctInExperiment.length > 0 ? (
          <p className="mt-2 text-rust-light">Died out in this run but not in the comparison: {cmp.extinctInExperiment.join(", ")}.</p>
        ) : null}
      </section>

      <section className="overflow-x-auto rounded border border-brown p-3" aria-labelledby="totals-title">
        <h3 id="totals-title" className="mb-2 text-sm font-semibold text-cream">
          Totals over the run: born, eaten by predators, died
        </h3>
        <table className="w-full min-w-[24rem] text-left text-xs text-cream">
          <thead className="text-cream-muted">
            <tr>
              <th className="py-1 pr-3">Species</th>
              <th className="py-1 pr-3">Born</th>
              <th className="py-1 pr-3">Eaten by predators</th>
              <th className="py-1 pr-3">Died (all causes)</th>
            </tr>
          </thead>
          <tbody>
            {config.species.map((s) => (
              <tr key={s.id} className="border-t border-brown">
                <td className="py-1 pr-3">{s.displayName}</td>
                <td className="py-1 pr-3 tabular-nums">{totals[s.id].births}</td>
                <td className="py-1 pr-3 tabular-nums">{s.huntable ? totals[s.id].eaten : "–"}</td>
                <td className="py-1 pr-3 tabular-nums">{totals[s.id].deaths}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-cream-muted">
          Eaten animals are also counted in deaths. A predator&apos;s kill is a death of its prey.
        </p>
      </section>

      <div className="eco-grid">
        <Chart title="Population, each animal" yLabel="animals" data={populationData} series={config.species.map((s) => ({ key: s.id, label: s.displayName }))} />
        <Chart title="Grass coverage" yLabel="%" data={grassData} series={[{ key: "grass", label: "Grass coverage %" }]} />
        <Chart title="Trees" yLabel="count" data={grassData} series={[{ key: "trees", label: "Trees" }]} />
        <Chart title="Livability" yLabel="index, 0–100" data={livabilityData} series={[{ key: "livability", label: "Livability" }]} />
        <Chart
          title="Births and deaths, all species"
          yLabel="per day"
          data={birthDeathData}
          series={[
            { key: "births", label: "Births" },
            { key: "deaths", label: "Deaths" },
          ]}
        />
        <Chart
          title="Animals eaten by predators"
          yLabel="per day, by prey"
          data={eatenData}
          series={config.species.filter((s) => s.huntable).map((s) => ({ key: s.id, label: `${s.displayName} eaten` }))}
        />
        <Chart
          title="Environment"
          yLabel="values"
          data={envData}
          series={[
            { key: "temperatureC", label: "Temperature °C" },
            { key: "rainfallMmPerDay", label: "Rainfall mm" },
            { key: "pollution", label: "Pollution" },
            { key: "waterQuality", label: "Water quality" },
          ]}
        />
        <Chart
          title="Baseline comparison"
          yLabel="total animals"
          data={compData}
          series={[
            { key: "baseline", label: `${baseline.id} (${baseline.role ?? "run"})`, dashed: true },
            { key: "experiment", label: `${selected.id} (${selected.role ?? "run"})` },
          ]}
        />
        <Chart
          title="Livability, compared"
          yLabel="index, 0–100"
          data={compLivability}
          series={[
            { key: "baseline", label: `${baseline.id}`, dashed: true },
            { key: "experiment", label: `${selected.id}` },
          ]}
        />
      </div>
      <p className="text-xs text-cream-muted">
        Runs saved: {runs.length}. Saved in this browser, so they are still here after a reload.
        {store.droppedRunCount > 0 ? ` ${store.droppedRunCount} older run(s) could not be kept because browser storage is full.` : ""}
      </p>
    </div>
  );
}

function RunPicker({
  label,
  runs,
  value,
  onChange,
}: {
  label: string;
  runs: readonly ExperimentRecord[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-cream">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded border border-brown bg-walnut-dark px-2 py-1 text-sm">
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id} · {r.role ?? "run"} · seed {r.seed} · {r.durationDays} d
          </option>
        ))}
      </select>
    </label>
  );
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function sum(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function sumBy(items: readonly DayRecord[], f: (d: DayRecord) => number): number {
  return items.reduce((acc, d) => acc + f(d), 0);
}
