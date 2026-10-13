"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveSimulation } from "@/components/game/hooks";
import { projectRun } from "@/simulation/experiments";
import { livabilityIndex } from "@/simulation/livability";
import type { DayRecord } from "@/types";
import { Chart } from "./charts";

/**
 * Live response to the lab's settings. Each change is simulated with the same seed as the
 * experiments, for a short horizon, and shown next to the island's base. It is a preview only:
 * nothing is saved, and the island is not touched. Full-length runs are on the Experiments tab.
 */

const PREVIEW_SEED = 2026;
const PREVIEW_DAYS_MAX = 60;
const DEBOUNCE_MS = 350;

interface Preview {
  key: string;
  now: DayRecord[];
  base: DayRecord[];
  days: number;
}

export default function ProjectionCharts() {
  const store = useLiveSimulation();
  const live = store.liveWorld;
  const settings = store.currentSettings;
  const baseSettings = store.islandDefaultSettings;
  const key = `${live?.islandId ?? ""}|${JSON.stringify(settings)}|${JSON.stringify(baseSettings)}`;
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    if (!live) return;
    const days = Math.min(settings.durationDays, PREVIEW_DAYS_MAX);
    const timer = window.setTimeout(() => {
      const shared = { config: live.config, world: live.world, env: live.env, baseGrassPercent: live.baseGrassPercent, seed: PREVIEW_SEED };
      setPreview({
        key,
        days,
        now: projectRun({ ...shared, settings }, days),
        base: projectRun({ ...shared, settings: baseSettings }, days),
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // key already contains every input the preview depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = preview && preview.key === key ? preview : null;
  const species = live?.config.species ?? [];
  const speciesCount = species.length;

  const rows = useMemo(() => {
    if (!current || !live) return [];
    const count = (d: DayRecord | undefined, id: string) => d?.counts[id] ?? 0;
    const endNow = current.now[current.now.length - 1];
    const endBase = current.base[current.base.length - 1];
    const sumOf = (days: DayRecord[], f: (d: DayRecord) => Record<string, number>, id: string) =>
      days.reduce((a, d) => a + (f(d)[id] ?? 0), 0);
    return [
      ...species.map((s) => ({
        label: s.displayName,
        base: count(endBase, s.id),
        now: count(endNow, s.id),
        born: sumOf(current.now, (d) => d.births, s.id),
        eaten: sumOf(current.now, (d) => d.eaten, s.id),
      })),
      {
        label: "Grass coverage (%)",
        base: endBase ? round1(endBase.grassCoveragePercent) : 0,
        now: endNow ? round1(endNow.grassCoveragePercent) : 0,
        born: null,
        eaten: null,
      },
      {
        label: "Livability (0–100)",
        base: endBase ? livabilityIndex(endBase, speciesCount) : 0,
        now: endNow ? livabilityIndex(endNow, speciesCount) : 0,
        born: null,
        eaten: null,
      },
    ];
  }, [current, live, species, speciesCount]);

  if (!live) return null;
  const series = (f: (d: DayRecord) => number) => {
    if (!current) return [];
    return current.now.map((d, i) => ({
      day: d.day + 1,
      now: f(d),
      base: current.base[i] ? f(current.base[i]) : 0,
    }));
  };

  return (
    <section aria-labelledby="projection-title" className="space-y-4">
      <div>
        <h3 id="projection-title" className="text-sm font-semibold text-cream">
          Live response to these settings
        </h3>
        <p className="mt-1 max-w-3xl text-xs text-cream-muted">
          Each setting is simulated for up to {PREVIEW_DAYS_MAX} days with seed {PREVIEW_SEED}, and compared with the island&apos;s base (dashed).
          The preview updates a moment after you stop changing a value. Experiments run the full duration and are saved.
          {current ? ` Showing ${current.days} days.` : ""} {!current ? "Updating…" : ""}
        </p>
      </div>

      {current ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-xs text-cream">
            <thead className="text-cream-muted">
              <tr>
                <th className="py-1 pr-3">At day {current.days}</th>
                <th className="py-1 pr-3">Base</th>
                <th className="py-1 pr-3">Your settings</th>
                <th className="py-1 pr-3">Change</th>
                <th className="py-1 pr-3">Born (run)</th>
                <th className="py-1 pr-3">Eaten by predators (run)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const diff = r.now - r.base;
                return (
                  <tr key={r.label} className="border-t border-brown">
                    <td className="py-1 pr-3">{r.label}</td>
                    <td className="py-1 pr-3 tabular-nums">{r.base}</td>
                    <td className="py-1 pr-3 tabular-nums">{r.now}</td>
                    <td className={`py-1 pr-3 tabular-nums ${diff < 0 ? "text-rust-light" : diff > 0 ? "text-moss-light" : ""}`}>
                      {diff > 0 ? "+" : ""}
                      {round1(diff)}
                    </td>
                    <td className="py-1 pr-3 tabular-nums">{r.born ?? "–"}</td>
                    <td className="py-1 pr-3 tabular-nums">{r.eaten ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {current ? (
        <div className="eco-grid">
          {species.map((s) => (
            <Chart
              key={s.id}
              title={`${s.displayName} population`}
              yLabel="animals"
              data={series((d) => d.counts[s.id] ?? 0)}
              series={[
                { key: "now", label: "Your settings", colour: "#F2C14E" },
                { key: "base", label: "Base", dashed: true },
              ]}
            />
          ))}
          <Chart
            title="Grass coverage"
            yLabel="%"
            data={series((d) => round1(d.grassCoveragePercent))}
            series={[
              { key: "now", label: "Your settings", colour: "#F2C14E" },
              { key: "base", label: "Base", dashed: true },
            ]}
          />
          <Chart
            title="Livability"
            yLabel="index, 0–100"
            data={series((d) => livabilityIndex(d, speciesCount))}
            series={[
              { key: "now", label: "Your settings", colour: "#7FD1C0" },
              { key: "base", label: "Base", dashed: true },
            ]}
          />
          <Chart
            title="Births and deaths, all species"
            yLabel="per day"
            data={current.now.map((d) => ({
              day: d.day + 1,
              births: Object.values(d.births).reduce((a, b) => a + b, 0),
              deaths: Object.values(d.deaths).reduce((a, b) => a + b, 0),
            }))}
            series={[
              { key: "births", label: "Born" },
              { key: "deaths", label: "Died" },
            ]}
          />
          <Chart
            title="Animals eaten by predators"
            yLabel="per day, by prey"
            data={current.now.map((d) => ({ day: d.day + 1, ...d.eaten }))}
            series={species.filter((s) => s.huntable).map((s) => ({ key: s.id, label: `${s.displayName} eaten` }))}
          />
        </div>
      ) : null}
    </section>
  );
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
