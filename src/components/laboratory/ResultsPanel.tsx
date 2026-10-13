"use client";

import { useState, useSyncExternalStore } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { liveSimulation } from "@/game/liveSimulation";
import { compareRuns } from "@/simulation/experiments";
import type { ExperimentRecord, GameConfig } from "@/types";

/**
 * Charts (spec 4.3). Every series is read from a run's day records, never from sample data.
 * Each run in the list has been simulated and saved. Nothing here runs the simulation.
 */

const COLOURS: Record<string, string> = {
  rabbit: "#facc15",
  cow: "#e2e8f0",
  chicken: "#fb923c",
  mouse: "#a78bfa",
  fox: "#f87171",
  grass: "#4ade80",
  trees: "#22c55e",
  births: "#60a5fa",
  deaths: "#f43f5e",
  temperatureC: "#fb7185",
  rainfallMmPerDay: "#38bdf8",
  pollution: "#a3a3a3",
  waterQuality: "#2dd4bf",
  baseline: "#94a3b8",
  experiment: "#34d399",
};

function Chart({
  title,
  data,
  series,
  yLabel,
}: {
  title: string;
  data: Record<string, number | string>[];
  series: { key: string; label: string }[];
  yLabel: string;
}) {
  return (
    <figure className="rounded border border-slate-700 p-3">
      <figcaption className="mb-2 text-sm font-medium text-slate-100">
        {title} <span className="text-xs font-normal text-slate-400">({yLabel})</span>
      </figcaption>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400">Run a simulation to see this chart.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} label={{ value: "day", position: "insideBottom", offset: -2, fill: "#94a3b8", fontSize: 11 }} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {series.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLOURS[s.key] ?? "#cbd5e1"} dot={false} isAnimationActive={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
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
    <label className="flex items-center gap-2 text-sm text-slate-200">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm">
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.id} · {r.role ?? "run"} · seed {r.seed} · {r.durationDays} d
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ResultsPanel({ config }: { config: GameConfig }) {
  useSyncExternalStore(liveSimulation.subscribe, liveSimulation.getVersion, liveSimulation.getVersion);
  const runs = liveSimulation.savedExperiments;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baselineId, setBaselineId] = useState<string | null>(null);

  if (runs.length === 0) {
    return <p className="text-sm text-slate-300">No results yet. Run a control and an experiment on the Experiments tab.</p>;
  }

  const selected = runs.find((r) => r.id === selectedId) ?? runs[runs.length - 1];
  const controls = runs.filter((r) => r.role === "control");
  const baseline = runs.find((r) => r.id === baselineId) ?? controls[controls.length - 1] ?? runs[0];
  const speciesIds = config.species.map((s) => s.id);
  const cmp = compareRuns(baseline, selected, speciesIds);

  const days = selected.statistics;
  const populationData = days.map((d) => ({ day: d.day + 1, ...d.counts }));
  const vegetationData = days.map((d) => ({ day: d.day + 1, grass: round1(d.grassCoveragePercent) }));
  const birthDeathData = days.map((d) => ({
    day: d.day + 1,
    births: Object.values(d.births).reduce((a, b) => a + b, 0),
    deaths: Object.values(d.deaths).reduce((a, b) => a + b, 0),
  }));
  const envData = days.map((d) => ({ day: d.day + 1, ...d.env }));
  const compData = Array.from({ length: Math.min(baseline.statistics.length, days.length) }, (_, i) => ({
    day: i + 1,
    baseline: Object.values(baseline.statistics[i].counts).reduce((a, b) => a + b, 0),
    experiment: Object.values(days[i].counts).reduce((a, b) => a + b, 0),
  }));

  const totals = Object.fromEntries(
    config.species.map((s) => [s.id, { births: sumBy(days, (d) => d.births[s.id] ?? 0), deaths: sumBy(days, (d) => d.deaths[s.id] ?? 0) }]),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <RunPicker label="Run" runs={runs} value={selected.id} onChange={setSelectedId} />
        <RunPicker label="Compare with" runs={runs} value={baseline.id} onChange={setBaselineId} />
      </div>

      <section className="rounded border border-slate-700 p-3 text-sm text-slate-200">
        <h3 className="mb-2 font-semibold text-slate-100">What changed (day {Math.min(baseline.statistics.length, days.length)})</h3>
        <ul className="grid gap-1 sm:grid-cols-2">
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
        </ul>
        {cmp.extinctInExperiment.length > 0 ? (
          <p className="mt-2 text-rose-300">Died out in this run but not in the comparison: {cmp.extinctInExperiment.join(", ")}.</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-400">
          Totals over the run: {config.species.map((s) => `${s.displayName} ${totals[s.id].births} born, ${totals[s.id].deaths} died`).join("; ")}.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Chart
          title="Population"
          yLabel="animals"
          data={populationData}
          series={config.species.map((s) => ({ key: s.id, label: s.displayName }))}
        />
        <Chart
          title={`Vegetation (trees: ${days.length ? days[days.length - 1].treeCount : 0})`}
          yLabel="grass coverage %"
          data={vegetationData}
          series={[{ key: "grass", label: "Grass coverage %" }]}
        />
        <Chart
          title="Births and deaths"
          yLabel="per day, all species"
          data={birthDeathData}
          series={[
            { key: "births", label: "Births" },
            { key: "deaths", label: "Deaths" },
          ]}
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
            { key: "baseline", label: `${baseline.id} (${baseline.role ?? "run"})` },
            { key: "experiment", label: `${selected.id} (${selected.role ?? "run"})` },
          ]}
        />
      </div>
    </div>
  );
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function sumBy<T>(items: readonly T[], f: (t: T) => number): number {
  return items.reduce((acc, t) => acc + f(t), 0);
}
