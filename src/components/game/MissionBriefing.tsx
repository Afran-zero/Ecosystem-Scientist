"use client";

import { CONTROL_SPECS } from "@/simulation/controls";
import type { ControlKey, MissionDef } from "@/types";
import { useLiveSimulation, useMissions } from "./hooks";
import Modal from "./Modal";

/**
 * The briefing for a mission access point (plan M4). It states the problem, the starting state, the
 * controls the player may change, and the criteria. Completion is never shown as a promise.
 */

const ENV_LABELS: { key: keyof MissionDef["start"]["env"]; label: string; unit: string }[] = [
  { key: "temperatureC", label: "Temperature", unit: "°C" },
  { key: "rainfallMmPerDay", label: "Rainfall", unit: "mm/day" },
  { key: "sunlightPercent", label: "Sunlight", unit: "%" },
  { key: "soilQuality", label: "Soil quality", unit: "/100" },
  { key: "pollution", label: "Pollution", unit: "/100" },
  { key: "waterQuality", label: "Water quality", unit: "/100" },
];

export const SPECIES_NAMES: Record<string, string> = {
  rabbit: "Rabbits",
  cow: "Cows",
  chicken: "Chickens",
  mouse: "Mice",
  fox: "Foxes",
};

export default function MissionBriefing({ missionId, onClose }: { missionId: string; onClose: () => void }) {
  const store = useLiveSimulation();
  const missions = useMissions();
  const m = missions.find((x) => x.id === missionId);

  if (!m) {
    return (
      <Modal title="Mission briefing" onClose={onClose}>
        <p className="text-sm text-cream-soft">Loading the briefing…</p>
      </Modal>
    );
  }

  const progress = store.progressFor(m.id);
  const onThisIsland = store.islandId === m.id;
  const controls = CONTROL_SPECS.filter((c) => m.allowedControls.includes(c.key as ControlKey));

  const enter = () => {
    if (onThisIsland) {
      onClose();
      return;
    }
    store.travel(m.id);
  };

  return (
    <Modal title={m.title} onClose={onClose} wide>
      <div className="space-y-5 text-sm text-cream">
        <div className="flex flex-wrap items-center gap-2">
          <span className={progress.status === "completed" ? "eco-chip eco-chip-good" : "eco-chip"}>
            {progress.status === "completed" ? "Completed" : progress.status === "in-progress" ? "In progress" : "Not started"}
          </span>
          <span className="eco-chip">At least {m.minDurationDays} days</span>
        </div>

        <section>
          <h3 className="eco-heading">The problem</h3>
          <p className="mt-1 leading-relaxed">{m.problem}</p>
        </section>

        <section>
          <h3 className="eco-heading">Your task</h3>
          <p className="mt-1 leading-relaxed">{m.briefing}</p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="eco-heading">Starting state</h3>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-cream-soft">
              {ENV_LABELS.map((e) => (
                <li key={e.key}>
                  {e.label}: {m.start.env[e.key]} {e.unit}
                </li>
              ))}
              {Object.entries(m.start.populations)
                .filter(([, n]) => n > 0)
                .map(([id, n]) => (
                  <li key={id}>
                    {SPECIES_NAMES[id] ?? id}: {n}
                  </li>
                ))}
            </ul>
          </section>
          <section>
            <h3 className="eco-heading">You may change</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {controls.map((c) => (
                <li key={c.key} className="eco-chip">
                  {c.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-cream-muted">Everything else stays at the starting value.</p>
          </section>
        </div>

        <section>
          <h3 className="eco-heading">Success criteria</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-cream-soft">
            {m.objectives.map((o) => (
              <li key={o.id}>{o.text}</li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="button" onClick={enter} className="eco-btn-primary">
            {onThisIsland ? "Stay on this island" : progress.status === "completed" ? "Replay from the damaged start" : "Enter the island"}
          </button>
          <button type="button" onClick={onClose} className="eco-btn">
            Not now
          </button>
        </div>
      </div>
    </Modal>
  );
}
