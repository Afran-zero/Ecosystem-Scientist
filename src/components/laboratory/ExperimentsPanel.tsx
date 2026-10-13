"use client";

import { useState } from "react";
import { MIN_EVIDENCE_CHARS } from "@/missions/mission";
import { liveSimulation, type SavedRun } from "@/game/liveSimulation";
import { validateSettings } from "@/simulation/controls";
import { compareRuns, runExperiment } from "@/simulation/experiments";
import type { ExperimentRecord } from "@/types";
import { useLiveSimulation } from "@/components/game/hooks";

const SEED_MAX = 2147483647;

/**
 * Experiment workflow (spec 4.4): settings are validated, a run starts from a fresh state with
 * the chosen seed, and the record is saved. The live island is not touched by a run. On a mission
 * the saved experiment can be submitted as evidence, and the mission scores it.
 */
export default function ExperimentsPanel() {
  const store = useLiveSimulation();
  const live = store.liveWorld;
  const settings = store.currentSettings;
  const mission = store.mission;
  const [seedText, setSeedText] = useState("2026");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [evidence, setEvidence] = useState("");
  const [submitRun, setSubmitRun] = useState<string | null>(null);

  if (!live) return <p className="text-sm text-slate-300">The island has not loaded yet.</p>;

  const seedNum = Number(seedText);
  const seedOk = Number.isInteger(seedNum) && seedNum >= 0 && seedNum <= SEED_MAX;
  const check = validateSettings(settings);
  const canRun = seedOk && check.ok && !busy;
  const saved = store.savedExperiments;
  const experiments = saved.filter((r) => r.role !== "control");
  const chosen = experiments.find((r) => r.id === submitRun) ?? experiments[experiments.length - 1];
  const evidenceOk = evidence.trim().length >= MIN_EVIDENCE_CHARS;

  const run = (role: "control" | "experiment") => {
    if (!live || !canRun) return;
    setBusy(true);
    setMessage(role === "control" ? "Running the control…" : "Running the experiment…");
    // Let the message paint before the run starts. A run is synchronous.
    setTimeout(() => {
      try {
        // The control is the island's own starting state, with the chosen duration.
        const runSettings = role === "control" ? { ...store.islandDefaultSettings, durationDays: settings.durationDays } : settings;
        const n = store.savedExperiments.length + 1;
        const record: ExperimentRecord = runExperiment({
          config: live.config,
          world: live.world,
          env: live.env,
          settings: runSettings,
          seed: seedNum,
          baseGrassPercent: live.baseGrassPercent,
          id: `run-${n}`,
          createdAt: new Date().toISOString(),
        });
        const saveAs: SavedRun = {
          ...record,
          missionId: mission?.id ?? "sandbox",
          role,
          label: role === "control" ? (mission ? "Control (mission start)" : "Control (default settings)") : `Experiment ${n}`,
        };
        store.saveExperiment(saveAs);
        setSubmitRun(saveAs.id);
        setMessage(`Saved run-${n}. ${role === "control" ? "Control" : "Experiment"} over ${settings.durationDays} days, seed ${seedNum}.`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "The run failed.");
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const submit = () => {
    if (!chosen || !mission || !evidenceOk) return;
    const outcome = store.submitEvidence(chosen, evidence);
    if (outcome) {
      // Close the lab so the results screen is the thing the player sees next.
      store.closeLab();
    }
  };

  const control = [...saved].reverse().find((r) => r.role === "control");
  const controlLabel = mission ? "Run control (mission start, no changes)" : "Run control (default settings)";

  return (
    <div className="space-y-5">
      {mission ? (
        <section className="rounded border border-amber-300/30 bg-amber-400/5 p-4 text-sm text-slate-200">
          <h3 className="text-sm font-semibold text-amber-100">Mission: {mission.title}</h3>
          <p className="mt-1 text-xs text-slate-300">{mission.briefing}</p>
        </section>
      ) : null}

      <section className="rounded border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-100">1. Settings to test</h3>
        <p className="mt-1 text-xs text-slate-400">
          Change them on the Environment and Populations tabs. Duration: {settings.durationDays} days.
        </p>
        {check.ok ? (
          <p className="mt-2 text-xs text-emerald-300">All settings are valid.</p>
        ) : (
          <ul className="mt-2 list-disc pl-5 text-xs text-rose-300">
            {Object.values(check.errors).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-100">2. Seed and run</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-200" htmlFor="seed">
            Seed
          </label>
          <input
            id="seed"
            type="number"
            min={0}
            max={SEED_MAX}
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") e.stopPropagation();
            }}
            className="w-32 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
            aria-invalid={!seedOk}
          />
          {!seedOk ? <span className="text-xs text-rose-300">Seed must be a whole number from 0 to {SEED_MAX}.</span> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canRun}
            onClick={() => run("control")}
            className="rounded border border-slate-500 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-40"
          >
            {controlLabel}
          </button>
          <button
            type="button"
            disabled={!canRun}
            onClick={() => run("experiment")}
            className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Run experiment (my settings)
          </button>
          <button
            type="button"
            onClick={() => store.resetSettings()}
            className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            {mission ? "Reset settings to the mission start" : "Reset settings"}
          </button>
        </div>
        {message ? (
          <p role="status" className="mt-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">
          A run starts from its own fresh state, with the populations and grass set above. It never changes the live island.
        </p>
      </section>

      {mission ? (
        <section className="rounded border border-emerald-400/30 p-4">
          <h3 className="text-sm font-semibold text-slate-100">3. Submit evidence to the mission</h3>
          {experiments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Run an experiment first. Then choose it here and explain what you saw.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-slate-200">
                Experiment to submit
                <select
                  value={chosen?.id ?? ""}
                  onChange={(e) => setSubmitRun(e.target.value)}
                  className="ml-2 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                >
                  {experiments.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id}: {r.durationDays} days, seed {r.seed}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-200">
                What did you change, and what did you observe? Write at least {MIN_EVIDENCE_CHARS} characters.
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") e.stopPropagation();
                  }}
                  rows={4}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2 text-sm"
                  aria-describedby="evidence-count"
                />
              </label>
              <p id="evidence-count" className={`text-xs ${evidenceOk ? "text-emerald-300" : "text-slate-400"}`}>
                {evidence.trim().length} of {MIN_EVIDENCE_CHARS} characters
              </p>
              <button
                type="button"
                disabled={!chosen || !evidenceOk}
                onClick={submit}
                className="rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-40"
              >
                Submit to the mission
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded border border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Saved runs ({saved.length})</h3>
          {saved.length > 0 ? (
            <button type="button" onClick={() => store.clearExperiments()} className="text-xs text-slate-400 underline">
              Clear saved runs
            </button>
          ) : null}
        </div>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No runs yet. Run a control first, then an experiment, and compare them on the Results tab.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 pr-3">Run</th>
                  <th className="py-1 pr-3">Role</th>
                  <th className="py-1 pr-3">Seed</th>
                  <th className="py-1 pr-3">Days</th>
                  <th className="py-1 pr-3">Animals at end</th>
                  <th className="py-1 pr-3">Grass at end</th>
                  <th className="py-1 pr-3">vs control</th>
                </tr>
              </thead>
              <tbody>
                {saved.map((r) => {
                  const last = r.statistics[r.statistics.length - 1];
                  const total = last ? Object.values(last.counts).reduce((a, b) => a + b, 0) : 0;
                  const vs = control && control !== r ? compareRuns(control, r, live.config.species.map((s) => s.id)) : null;
                  const extinct = vs?.extinctInExperiment ?? [];
                  return (
                    <tr key={r.id} className="border-t border-slate-800">
                      <td className="py-1 pr-3">{r.id}</td>
                      <td className="py-1 pr-3">{r.role ?? "run"}</td>
                      <td className="py-1 pr-3">{r.seed}</td>
                      <td className="py-1 pr-3">{r.durationDays}</td>
                      <td className="py-1 pr-3">{total}</td>
                      <td className="py-1 pr-3">{last ? `${last.grassCoveragePercent.toFixed(1)}%` : "–"}</td>
                      <td className="py-1 pr-3">
                        {!vs ? "–" : extinct.length ? `extinct: ${extinct.join(", ")}` : `grass ${vs.grassDeltaPercent >= 0 ? "+" : ""}${vs.grassDeltaPercent.toFixed(1)} pts`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
