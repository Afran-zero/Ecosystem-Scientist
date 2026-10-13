"use client";

import { useEffect, useState } from "react";
import { CONTROL_SPECS } from "@/simulation/controls";
import { liveSimulation } from "@/game/liveSimulation";
import type { ControlKey, ControlSpec } from "@/types";

/**
 * One control: a slider and a number box, kept in step. The box accepts text, but a value only
 * reaches the simulation after it passes validation. Invalid text shows an error, and the last
 * accepted value stays in place (spec 4.2). A control the active mission does not allow is locked.
 */
function ControlRow({
  spec,
  value,
  error,
  locked,
  fallback,
}: {
  spec: ControlSpec;
  value: number;
  error?: string;
  locked: boolean;
  fallback: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) {
      // Keep the typed text so the user can fix it, but do not change the setting.
      return;
    }
    liveSimulation.setSetting(spec.key, n);
  };

  return (
    <div className={`grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-slate-700/60 py-3 ${locked ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={`ctl-${spec.key}`} className="text-sm font-medium text-slate-100">
          {spec.label}
        </label>
        <span className="text-xs text-slate-400">
          {spec.min}–{spec.max} {spec.unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`ctl-${spec.key}`}
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          disabled={locked}
          onChange={(e) => liveSimulation.setSetting(spec.key, Number(e.target.value))}
          className="w-40 accent-emerald-500 sm:w-56"
          aria-describedby={error ? `err-${spec.key}` : undefined}
        />
        <input
          type="number"
          aria-label={`${spec.label} value`}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={text}
          disabled={locked}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(String(value))}
          onKeyDown={(e) => {
            // Keep typing in this box away from the island's keyboard controls.
            if (e.key !== "Escape") e.stopPropagation();
          }}
          className="w-20 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-right text-sm"
          aria-invalid={Boolean(error)}
        />
        <span className="w-16 text-xs text-slate-400">{spec.unit}</span>
        <button
          type="button"
          disabled={locked}
          onClick={() => liveSimulation.setSetting(spec.key, fallback)}
          className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          Reset
        </button>
      </div>
      {locked ? <p className="col-span-2 text-xs text-amber-200/80">Locked for this mission. It is part of the damaged starting state.</p> : null}
      {spec.note ? <p className="col-span-2 text-xs text-slate-400">{spec.note}</p> : null}
      {error ? (
        <p id={`err-${spec.key}`} role="alert" className="col-span-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function ControlPanel({ group }: { group: ControlSpec["group"] }) {
  const settings = liveSimulation.currentSettings;
  const errors = liveSimulation.currentSettingsErrors;
  const defaults = liveSimulation.islandDefaultSettings;
  const mission = liveSimulation.mission;
  const specs = CONTROL_SPECS.filter((c) => c.group === group);
  return (
    <div>
      {specs.map((spec) => (
        <ControlRow
          key={spec.key}
          spec={spec}
          value={settings[spec.key as ControlKey]}
          error={errors[spec.key as ControlKey]}
          locked={mission !== null && !mission.allowedControls.includes(spec.key as ControlKey)}
          fallback={defaults[spec.key as ControlKey]}
        />
      ))}
      <div className="pt-3">
        <button
          type="button"
          onClick={() => liveSimulation.resetSettings()}
          className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
        >
          {mission ? "Reset all to the mission start" : "Reset all to defaults"}
        </button>
      </div>
    </div>
  );
}
