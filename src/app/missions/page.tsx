"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveSimulation, useMissions } from "@/components/game/hooks";
import { SPECIES_NAMES } from "@/components/game/MissionBriefing";

/**
 * The three restoration missions (plan M4.10). Any order is allowed, and the hub stays open.
 * Each card opens its island at the damaged starting state.
 */
export default function MissionsPage() {
  const store = useLiveSimulation();
  const missions = useMissions();
  useEffect(() => store.hydrate(), [store]);

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/90">Restoration missions</p>
          <h1 className="mt-2 font-display text-3xl text-amber-100 sm:text-4xl">Choose a damaged island</h1>
        </div>
        <Link href="/" className="eco-btn">
          Main menu
        </Link>
      </header>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
        Each mission starts from a damaged state you can see on the island. You can do them in any order. Inside each one, change only the controls the
        briefing allows, run the simulation, and submit your evidence. Completion is decided by the measured criteria.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {missions.map((m) => {
          const progress = store.progressFor(m.id);
          const done = progress.status === "completed";
          const label = done ? "Completed" : progress.status === "in-progress" ? "In progress" : "Not started";
          return (
            <article key={m.id} className="eco-panel eco-rise flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl text-amber-100">{m.title}</h2>
                <span className={done ? "eco-chip eco-chip-good shrink-0" : "eco-chip shrink-0"}>{label}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{m.problem}</p>

              <p className="eco-heading mt-5 text-xs uppercase tracking-wider">Starting state</p>
              <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {Object.entries(m.start.populations)
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => (
                    <li key={id} className="eco-chip">
                      {SPECIES_NAMES[id] ?? id} {n}
                    </li>
                  ))}
              </ul>

              <p className="eco-heading mt-5 text-xs uppercase tracking-wider">Goals</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {m.objectives.map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ul>

              <p className="mb-4 mt-4 text-xs text-slate-400">
                Run at least {m.minDurationDays} days. {progress.submissions.length} submission{progress.submissions.length === 1 ? "" : "s"} so far.
              </p>

              <Link href={`/game?island=${m.id}`} className="eco-btn-primary mt-auto w-full py-2.5">
                {done ? "Replay this mission" : "Start this mission"}
              </Link>
            </article>
          );
        })}
      </div>
      {missions.length === 0 ? <p className="mt-8 text-sm text-slate-400">Loading the missions…</p> : null}
    </main>
  );
}
