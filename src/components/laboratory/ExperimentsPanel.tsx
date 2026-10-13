"use client";

import { useState } from "react";
import { MIN_EVIDENCE_CHARS } from "@/missions/mission";
import { liveSimulation, type SavedRun } from "@/game/liveSimulation";
import { validateSettings } from "@/simulation/controls";
import { compareRuns, runExperiment } from "@/simulation/experiments";
import type { ExperimentRecord, ExperimentSettings } from "@/types";
import { useLiveSimulation } from "@/components/game/hooks";

const SEED_MAX = 2147483647;

/**
 * Experiment workflow (spec 4.4). Settings are validated, a run starts from a fresh state with the
 * chosen seed, and the record is saved in this browser. A run never changes the island. The only
 * way a run changes the island is "make this the new base", which asks first and is undone by
 * "return to the original base". On a mission the saved experiment can be submitted as evidence.
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
  const [makeBase, setMakeBase] = useState(false);
  const [pendingBase, setPendingBase] = useState<ExperimentSettings | null>(null);
  const [confirmReturn, setConfirmReturn] = useState(false);

  if (!live) return <p className="text-sm text-cream-soft">The island has not loaded yet.</p>;

  const seedNum = Number(seedText);
  const seedOk = Number.isInteger(seedNum) && seedNum >= 0 && seedNum <= SEED_MAX;
  const check = validateSettings(settings);
  const canRun = seedOk && check.ok && !busy;
  const saved = store.savedExperiments;
  const experiments = saved.filter((r) => r.role !== "control");
  const chosen = experiments.find((r) => r.id === submitRun) ?? experiments[experiments.length - 1];
  const evidenceOk = evidence.trim().length >= MIN_EVIDENCE_CHARS;
  const baseAllowed = !mission;

  const run = (role: "control" | "experiment") => {
    if (!live || !canRun) return;
    setBusy(true);
    setMessage(role === "control" ? "Running the control…" : "Running the experiment…");
    // Let the message paint before the run starts. A run is synchronous.
    setTimeout(() => {
      try {
        // The control is the island's own base, with the chosen duration.
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
          label: role === "control" ? (mission ? "Control (mission start)" : "Control (island base)") : `Experiment ${n}`,
        };
        store.saveExperiment(saveAs);
        setSubmitRun(saveAs.id);
        const dropped = store.droppedRunCount;
        setMessage(
          `Saved run-${n}. ${role === "control" ? "Control" : "Experiment"} over ${settings.durationDays} days, seed ${seedNum}.` +
            (dropped > 0 ? ` Browser storage is full: ${dropped} older run${dropped === 1 ? "" : "s"} could not be kept.` : ""),
        );
        if (role === "experiment" && makeBase && baseAllowed) setPendingBase({ ...runSettings });
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
  const controlLabel = mission ? "Run control (mission start, no changes)" : "Run control (island base)";
  const hubBase = store.hubBase;

  return (
    <div className="space-y-5">
      {mission ? (
        <section className="rounded border border-honey/30 bg-honey/5 p-4 text-sm text-ink">
          <h3 className="text-sm font-semibold text-honey">Mission: {mission.title}</h3>
          <p className="mt-1 text-xs text-cream-soft">{mission.briefing}</p>
        </section>
      ) : (
        <section className="rounded border border-brown p-4 text-sm text-cream">
          <h3 className="text-sm font-semibold text-cream">Island base</h3>
          <p className="mt-1 text-xs text-cream-soft">
            {hubBase
              ? "The hub starts from a base you set in the lab. Experiments do not change it unless you tick the box below."
              : "The hub starts from its original base. Experiments do not change it unless you tick the box below."}
          </p>
          {hubBase ? (
            confirmReturn ? (
              <div role="alertdialog" aria-label="Return to the original base" className="mt-3 rounded border border-honey/50 p-3">
                <p>Return the live hub to its original base? The island is rebuilt from the start. Saved runs are kept.</p>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReturn(false);
                      store.clearHubBase();
                    }}
                    className="rounded bg-honey px-3 py-2 font-semibold text-ink hover:bg-honey-hover"
                  >
                    Return to the original base
                  </button>
                  <button type="button" onClick={() => setConfirmReturn(false)} className="rounded border border-soil px-3 py-2 hover:bg-walnut">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmReturn(true)} className="mt-3 rounded border border-soil px-3 py-2 hover:bg-walnut">
                Return to the original base
              </button>
            )
          ) : null}
        </section>
      )}

      <section className="rounded border border-brown p-4">
        <h3 className="text-sm font-semibold text-cream">1. Settings to test</h3>
        <p className="mt-1 text-xs text-cream-muted">
          Change them on the Environment and Populations tabs. Duration: {settings.durationDays} days.
        </p>
        {check.ok ? (
          <p className="mt-2 text-xs text-moss-light">All settings are valid.</p>
        ) : (
          <ul className="mt-2 list-disc pl-5 text-xs text-rust-light">
            {Object.values(check.errors).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border border-brown p-4">
        <h3 className="text-sm font-semibold text-cream">2. Seed and run</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="text-sm text-cream" htmlFor="seed">
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
            className="w-32 rounded border border-brown bg-walnut-dark px-2 py-1 text-sm"
            aria-invalid={!seedOk}
          />
          {!seedOk ? <span className="text-xs text-rust-light">Seed must be a whole number from 0 to {SEED_MAX}.</span> : null}
        </div>

        <label className={`mt-4 flex items-start gap-2 text-sm ${baseAllowed ? "text-cream" : "text-cream-muted"}`}>
          <input
            type="checkbox"
            checked={makeBase}
            disabled={!baseAllowed}
            onChange={(e) => setMakeBase(e.target.checked)}
            className="mt-1 accent-honey"
          />
          <span>
            Make this experiment the island&apos;s new base
            <span className="block text-xs text-cream-muted">
              {baseAllowed
                ? "Off by default. If ticked, the run's settings become the base after you confirm, and the live island is rebuilt from them."
                : "Not available on a mission. A mission always starts from its defined damaged state."}
            </span>
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canRun}
            onClick={() => run("control")}
            className="rounded border border-soil px-3 py-2 text-sm text-cream hover:bg-walnut disabled:opacity-40"
          >
            {controlLabel}
          </button>
          <button
            type="button"
            disabled={!canRun}
            onClick={() => run("experiment")}
            className="rounded bg-honey px-3 py-2 text-sm font-medium text-ink hover:bg-honey-hover disabled:opacity-40"
          >
            Run experiment (my settings)
          </button>
          <button
            type="button"
            onClick={() => store.resetSettings()}
            className="rounded border border-brown px-3 py-2 text-sm text-cream-soft hover:bg-walnut"
          >
            {mission ? "Reset settings to the mission start" : "Reset settings to the island base"}
          </button>
        </div>

        {pendingBase ? (
          <div role="alertdialog" aria-label="Confirm new base" className="mt-4 rounded border border-honey/50 p-3 text-sm text-cream">
            <p className="font-semibold text-honey">Make these settings the island&apos;s new base?</p>
            <p className="mt-1 text-xs text-cream-soft">
              The live hub is rebuilt from them now. Saved runs are kept. You can return to the original base at any time.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const base = pendingBase;
                  setPendingBase(null);
                  setMakeBase(false);
                  store.setHubBase(base);
                }}
                className="rounded bg-honey px-3 py-2 font-semibold text-ink hover:bg-honey-hover"
              >
                Yes, make it the new base
              </button>
              <button type="button" onClick={() => setPendingBase(null)} className="rounded border border-soil px-3 py-2 hover:bg-walnut">
                Not now
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <p role="status" className="mt-3 text-sm text-cream">
            {message}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-cream-muted">
          A run starts from its own fresh state, with the settings above. It never changes the live island unless you make it the base.
          Runs are saved in this browser (localStorage), so they are still here after a reload.
        </p>
      </section>

      {mission ? (
        <section className="rounded border border-moss-light/30 p-4">
          <h3 className="text-sm font-semibold text-cream">3. Submit evidence to the mission</h3>
          {experiments.length === 0 ? (
            <p className="mt-2 text-sm text-cream-muted">Run an experiment first. Then choose it here and explain what you saw.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-cream">
                Experiment to submit
                <select
                  value={chosen?.id ?? ""}
                  onChange={(e) => setSubmitRun(e.target.value)}
                  className="ml-2 rounded border border-brown bg-walnut-dark px-2 py-1 text-sm"
                >
                  {experiments.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id}: {r.durationDays} days, seed {r.seed}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-cream">
                What did you change, and what did you observe? Write at least {MIN_EVIDENCE_CHARS} characters.
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") e.stopPropagation();
                  }}
                  rows={4}
                  className="mt-1 w-full rounded border border-brown bg-walnut-dark p-2 text-sm"
                  aria-describedby="evidence-count"
                />
              </label>
              <p id="evidence-count" className={`text-xs ${evidenceOk ? "text-moss-light" : "text-cream-muted"}`}>
                {evidence.trim().length} of {MIN_EVIDENCE_CHARS} characters
              </p>
              <button
                type="button"
                disabled={!chosen || !evidenceOk}
                onClick={submit}
                className="rounded bg-honey px-3 py-2 text-sm font-semibold text-ink hover:bg-honey-hover disabled:opacity-40"
              >
                Submit to the mission
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded border border-brown p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-cream">Saved runs ({saved.length})</h3>
          {saved.length > 0 ? (
            <button type="button" onClick={() => store.clearExperiments()} className="text-xs text-cream-muted underline">
              Clear saved runs
            </button>
          ) : null}
        </div>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-cream-muted">No runs yet. Run a control first, then an experiment, and compare them on the Results tab.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs text-cream">
              <thead className="text-cream-muted">
                <tr>
                  <th className="py-1 pr-3">Run</th>
                  <th className="py-1 pr-3">Role</th>
                  <th className="py-1 pr-3">Seed</th>
                  <th className="py-1 pr-3">Days</th>
                  <th className="py-1 pr-3">Animals at end</th>
                  <th className="py-1 pr-3">Grass at end</th>
                  <th className="py-1 pr-3">vs control</th>
                  <th className="py-1 pr-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {saved.map((r) => {
                  const last = r.statistics[r.statistics.length - 1];
                  const total = last ? Object.values(last.counts).reduce((a, b) => a + b, 0) : 0;
                  const vs = control && control !== r ? compareRuns(control, r, live.config.species.map((s) => s.id)) : null;
                  const extinct = vs?.extinctInExperiment ?? [];
                  return (
                    <tr key={r.id} className="border-t border-brown">
                      <td className="py-1 pr-3">{r.id}</td>
                      <td className="py-1 pr-3">{r.role ?? "run"}</td>
                      <td className="py-1 pr-3">{r.seed}</td>
                      <td className="py-1 pr-3">{r.durationDays}</td>
                      <td className="py-1 pr-3">{total}</td>
                      <td className="py-1 pr-3">{last ? `${last.grassCoveragePercent.toFixed(1)}%` : "–"}</td>
                      <td className="py-1 pr-3">
                        {!vs ? "–" : extinct.length ? `extinct: ${extinct.join(", ")}` : `grass ${vs.grassDeltaPercent >= 0 ? "+" : ""}${vs.grassDeltaPercent.toFixed(1)} pts`}
                      </td>
                      <td className="py-1 pr-3">
                        <button type="button" onClick={() => store.deleteExperiment(r.id)} className="text-cream-muted underline hover:text-rust-light">
                          Delete
                        </button>
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
