"use client";

import { useState } from "react";
import { useLiveSimulation } from "@/components/game/hooks";
import { CONTROL_SPECS } from "@/simulation/controls";
import type { ControlKey } from "@/types";

/**
 * Live intervention (plan M3.4). Changes the running island, not an experiment. It is offered only
 * on a mission, only for the controls that mission allows, and only after the player reviews the
 * change. Mission scores come from experiments, so an intervention never changes a score.
 */

const ENV_KEYS = ["temperatureC", "rainfallMmPerDay", "sunlightPercent", "soilQuality", "pollution"] as const;
const POP_KEYS = ["rabbit", "cow", "chicken", "mouse", "fox"] as const;

interface Change {
  key: ControlKey;
  label: string;
  unit: string;
  from: number;
  to: number;
}

export default function InterventionPanel() {
  const store = useLiveSimulation();
  const live = store.liveWorld;
  const mission = store.mission;
  const [reviewing, setReviewing] = useState(false);
  if (!live) return null;

  if (!mission) {
    return (
      <section className="max-w-2xl rounded border border-brown p-4 text-sm text-cream-soft">
        <h3 className="text-sm font-semibold text-cream">Change the live island</h3>
        <p className="mt-2">Live changes are offered on a restoration mission, for the controls that mission allows. On the hub island, the island keeps its own state.</p>
      </section>
    );
  }

  const allowed = new Set<string>(mission.allowedControls);
  const env = live.sim.environment;
  const counts = live.sim.countBySpecies();
  const settings = store.currentSettings;
  const specOf = (key: ControlKey) => CONTROL_SPECS.find((c) => c.key === key)!;

  const changes: Change[] = [];
  for (const key of ENV_KEYS) {
    if (!allowed.has(key)) continue;
    const from = env[key];
    const to = settings[key];
    if (from !== to) changes.push({ key, from, to, label: specOf(key).label, unit: specOf(key).unit });
  }
  for (const key of POP_KEYS) {
    if (!allowed.has(key)) continue;
    const from = counts[key] ?? 0;
    const to = settings[key];
    if (from !== to) changes.push({ key, from, to, label: specOf(key).label, unit: "animals" });
  }

  const apply = () => {
    const envChange: Partial<Record<(typeof ENV_KEYS)[number], number>> = {};
    const population: Record<string, number> = {};
    for (const c of changes) {
      if ((ENV_KEYS as readonly string[]).includes(c.key)) envChange[c.key as (typeof ENV_KEYS)[number]] = c.to;
      else population[c.key] = c.to;
    }
    const summary = changes.map((c) => `${c.label} ${c.from} → ${c.to} ${c.unit}`).join("; ");
    const label = `Day ${live.sim.currentDay + 1}: ${summary}`;
    if (store.applyIntervention({ env: envChange, population }, label)) setReviewing(false);
  };

  return (
    <section className="max-w-2xl rounded border border-honey/30 bg-honey/5 p-4 text-sm text-ink" aria-labelledby="intervention-title">
      <h3 id="intervention-title" className="text-sm font-semibold text-honey">
        Change the live island
      </h3>
      <p className="mt-2 text-xs text-cream-soft">
        This changes the island you are standing on. It does not change experiments, and it does not change how a mission is scored. Only the controls
        this mission allows can change.
      </p>

      {changes.length === 0 ? (
        <p className="mt-3 text-cream-muted">The live island already matches the lab settings for the controls this mission allows.</p>
      ) : !reviewing ? (
        <div className="mt-3">
          <p className="text-cream">Set in the lab, not yet on the island:</p>
          <ul className="mt-1 list-disc pl-5">
            {changes.map((c) => (
              <li key={c.key}>
                {c.label}: {c.from} → {c.to} {c.unit}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setReviewing(true)} className="mt-3 rounded bg-honey px-3 py-2 font-semibold text-ink hover:bg-honey-hover">
            Review the change
          </button>
        </div>
      ) : (
        <div role="alertdialog" aria-label="Confirm live change" className="mt-3 rounded border border-honey/50 p-3">
          <p className="font-semibold text-honey">Apply these changes to the live island now?</p>
          <ul className="mt-1 list-disc pl-5">
            {changes.map((c) => (
              <li key={c.key}>
                {c.label}: {c.from} → {c.to} {c.unit}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={apply} className="rounded bg-honey px-3 py-2 font-semibold text-ink hover:bg-honey-hover">
              Apply to the live island
            </button>
            <button type="button" onClick={() => setReviewing(false)} className="rounded border border-soil px-3 py-2 hover:bg-walnut">
              Cancel
            </button>
          </div>
        </div>
      )}

      {store.interventions.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cream-muted">Changes made on this island</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-cream-soft">
            {store.interventions.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
