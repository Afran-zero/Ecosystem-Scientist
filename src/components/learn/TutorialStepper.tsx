"use client";

import { useEffect, useState } from "react";

export interface TutorialStep {
  title: string;
  body: string;
  hint?: string;
  /** Tailwind color classes for the step's accent. */
  accent: string;
  ring: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "1. Explore the island",
    body:
      "Walk around with W A S D or the arrow keys. Each biome looks different: dark forest in the north, open meadow to the west, grassland in the south, the pond in the centre, and the coast running around the edge. Watch how the animals use each habitat.",
    hint: "Move: W A S D or arrow keys",
    accent: "text-emerald-300",
    ring: "ring-emerald-400/40",
  },
  {
    title: "2. Inspect an animal",
    body:
      "Walk up to any animal and press E. Its field guide shows where it sits in the food web, how it lives in real life, and a few facts you can page through. Pause first with Space if the animal keeps moving.",
    hint: "Inspect: E",
    accent: "text-lime-300",
    ring: "ring-lime-400/40",
  },
  {
    title: "3. Use the research lab",
    body:
      "Walk to the Research lab and press E. Change one environment variable or starting population, run a control and an experiment with the same seed, then open the Results tab to compare them. The Food web tab explains chains and trophic levels, and the Experiments tab keeps a log of your runs.",
    hint: "Open the lab: E at the lab marker",
    accent: "text-amber-300",
    ring: "ring-amber-400/40",
  },
  {
    title: "4. Restore a mission",
    body:
      "Walk to a mission marker on the island and press E for the briefing. Each mission tells you which controls you may change, the minimum number of days to run, and the criteria your ecosystem must meet. Submit your evidence when the simulation is paused on the final day. The results screen explains which criteria passed and why.",
    hint: "Mission briefing: E at a mission marker",
    accent: "text-rose-300",
    ring: "ring-rose-400/40",
  },
  {
    title: "5. Read the field journal",
    body:
      "Open the Field journal from the main menu to see which missions are complete, your running field-guide notes, and a summary of the lab experiments you have run. The journal grows as you play.",
    hint: "Journal: link on the main menu",
    accent: "text-cyan-300",
    ring: "ring-cyan-400/40",
  },
  {
    title: "6. Design a fair experiment",
    body:
      "Change one variable at a time between your control and your experiment. Keep the seed the same so the only difference is your change. Run long enough for the system to settle — usually more days than feels necessary. Read the failure reasons on the results screen before retrying a mission.",
    hint: "Tip: one variable, one seed, long enough to settle",
    accent: "text-violet-300",
    ring: "ring-violet-400/40",
  },
];

/**
 * Step-through tutorial used on /how-to-play. Progress dots show where you are.
 * Left/Right arrow keys also navigate, and the body re-mounts on each step to
 * replay the rise-in animation.
 */
export default function TutorialStepper({ steps = TUTORIAL_STEPS }: { steps?: TutorialStep[] }) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setCurrent((i) => Math.min(steps.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setCurrent((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length]);

  return (
    <div className="eco-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-amber-100">Tutorial</h2>
          <p className="mt-1 text-sm text-slate-400">
            Step {current + 1} of {steps.length} · use the arrows or buttons to navigate
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-wider text-slate-500">Tip: try ← and →</p>
      </div>

      <ol className="mt-5 flex flex-wrap items-center gap-2" aria-label="Progress">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                aria-current={active ? "step" : undefined}
                className={[
                  "h-2.5 w-6 rounded-full transition",
                  done ? "bg-emerald-500/80" : active ? "bg-amber-300 w-10" : "bg-white/15 hover:bg-white/30",
                ].join(" ")}
              />
            </li>
          );
        })}
      </ol>

      <div key={current} className="eco-rise mt-6 rounded-lg border border-white/10 bg-slate-950/40 p-5">
        <h3 className={`font-display text-xl ${step.accent}`}>{step.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{step.body}</p>
        {step.hint ? (
          <p className="mt-3 inline-block rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-amber-200/90">
            {step.hint}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrent((i) => Math.max(0, i - 1))}
          disabled={current === 0}
          className="eco-btn disabled:opacity-40"
        >
          ← Back
        </button>
        {current < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrent((i) => Math.min(steps.length - 1, i + 1))}
            className="eco-btn-primary"
          >
            Next →
          </button>
        ) : (
          <a href="/" className="eco-btn-primary">
            Start playing
          </a>
        )}
      </div>
    </div>
  );
}
