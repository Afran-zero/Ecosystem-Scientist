"use client";

import { explainOutcome, interventionRows, restorationRows } from "@/missions/explain";
import { useLiveSimulation, useMissions } from "./hooks";
import Modal from "./Modal";

/**
 * Results after an experiment is submitted as evidence (plan M4.8). The verdict, the criteria, the
 * intervention, the restoration summary and the explanation all come from the stored run.
 */

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function MissionResult({ onClose }: { onClose: () => void }) {
  const store = useLiveSimulation();
  const missions = useMissions();
  const result = store.lastResult;
  if (!result) return null;

  const m = missions.find((x) => x.id === result.missionId);
  if (!m) {
    return (
      <Modal title="Mission results" onClose={onClose}>
        <p className="text-sm text-cream-soft">Loading the results…</p>
      </Modal>
    );
  }

  const { record, outcome, start } = result;
  const config = store.liveWorld?.config;
  if (!config) return null;
  const { environment, animals } = restorationRows(record, start, config);
  const changes = interventionRows(m, record);
  const explanation = explainOutcome(m, record, outcome, start, config);

  return (
    <Modal title={`${m.title}: results`} onClose={onClose} wide>
      <div className="space-y-6 text-sm text-cream">
        <div className={`rounded-lg border p-4 ${outcome.passed ? "border-moss-light/40 bg-honey-hover/10" : "border-honey/30 bg-honey/5"}`}>
          <p className="font-display text-xl text-honey">{outcome.passed ? "Mission complete" : "Not complete yet"}</p>
          <p className="mt-1 text-cream-soft">
            {outcome.passed
              ? "The run met every criterion and your evidence was recorded. Progress is saved in this browser."
              : "At least one criterion is not met, or the submission is incomplete. The list below shows what to change."}
          </p>
        </div>

        <section>
          <h3 className="eco-heading">Success criteria</h3>
          <table className="mt-2 w-full text-left">
            <thead className="text-xs text-cream-muted">
              <tr>
                <th className="py-1 pr-3">Criterion</th>
                <th className="py-1 pr-3">Measured</th>
                <th className="py-1 pr-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {outcome.objectives.map((o) => (
                <tr key={o.id} className="border-t border-cream/10">
                  <td className="py-1.5 pr-3">{o.text}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{Number.isFinite(o.measured) ? fmt(o.measured) : "–"}</td>
                  <td className={`py-1.5 pr-3 font-medium ${o.passed ? "text-moss-light" : "text-rust-light"}`}>{o.passed ? "Met" : "Not met"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {outcome.problems.length ? (
            <ul className="mt-3 list-disc pl-5 text-honey">
              {outcome.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="eco-heading">Intervention</h3>
            {changes.length ? (
              <ul className="mt-2 space-y-1">
                {changes.map((c) => (
                  <li key={c.label}>
                    {c.label}: {fmt(c.from)} → {fmt(c.to)} {c.unit}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-cream-muted">No changes from the starting state. This run is a control.</p>
            )}
            <p className="mt-2 text-cream-muted">
              Duration: {record.durationDays} days (seed {record.seed})
            </p>
          </div>
          <div>
            <h3 className="eco-heading">Your evidence</h3>
            <blockquote className="mt-2 rounded border-l-2 border-honey/50 pl-3 italic text-cream-soft">{result.evidence}</blockquote>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="eco-heading">Restoration summary: environment</h3>
            <table className="mt-2 w-full text-left">
              <tbody>
                {environment.map((r) => (
                  <tr key={r.label} className="border-t border-cream/10">
                    <td className="py-1 pr-3">{r.label}</td>
                    <td className="py-1 pr-3 tabular-nums">
                      {fmt(r.from)} → {fmt(r.to)} {r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="eco-heading">Restoration summary: animals</h3>
            <table className="mt-2 w-full text-left">
              <tbody>
                {animals.map((r) => (
                  <tr key={r.label} className="border-t border-cream/10">
                    <td className="py-1 pr-3">{r.label}</td>
                    <td className="py-1 pr-3 tabular-nums">
                      {r.from} → {r.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="eco-heading">What the data shows</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-cream-soft">
            {explanation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="button" onClick={onClose} className="eco-btn-primary">
            Back to the island
          </button>
          <button type="button" onClick={() => store.resetIsland(m.id)} className="eco-btn">
            Reset this mission to its start
          </button>
        </div>
      </div>
    </Modal>
  );
}
