import Link from "next/link";
import FoodWebExplorer from "@/components/learn/FoodWebExplorer";
import TutorialStepper from "@/components/learn/TutorialStepper";
import type { FoodWebEdge, SpeciesDef } from "@/types";

import speciesData from "../../../public/data/species.json";
import foodWebData from "../../../public/data/food-web.json";

interface SpeciesFile {
  species: SpeciesDef[];
}
interface FoodWebFile {
  edges: FoodWebEdge[];
}

/**
 * /how-to-play — the tutorial stepper and the food-web explorer.
 * JSON is imported at build time so the page renders without a fetch round-trip.
 */
export default function HowToPlayPage() {
  const species = (speciesData as SpeciesFile).species;
  const edges = (foodWebData as FoodWebFile).edges;

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-moss-light">How to play</p>
          <h1 className="mt-2 font-display text-3xl text-honey sm:text-4xl">From your first step to a fair experiment</h1>
        </div>
        <Link href="/" className="eco-btn">
          ← Main menu
        </Link>
      </header>

      <section className="eco-panel eco-rise mt-8 p-6 sm:p-8">
        <h2 className="font-display text-2xl text-honey">Your goal</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream-soft">
          Understand how the island works and restore three damaged corners of it. Wander freely, run experiments in the lab, and submit a mission
          when you think you have fixed a corner. Mission progress is saved in this browser.
        </p>
        <div className="mt-5 grid gap-3 rounded-lg border border-cream/10 bg-cream/5 p-4 text-sm sm:grid-cols-2">
          <p className="font-semibold text-cream sm:col-span-2">Controls recap</p>
          <Control keys="W A S D or arrows" text="Move" />
          <Control keys="E" text="Inspect, open the lab, read a briefing" />
          <Control keys="Space" text="Pause or resume" />
          <Control keys="1 · 2 · 3" text="Speed 1×, 5×, 10×" />
          <Control keys="Esc" text="Close a dialog or the lab" />
        </div>
      </section>

      <div className="mt-8 space-y-6">
        <TutorialStepper />
        <FoodWebExplorer edges={edges} species={species} />
      </div>
    </main>
  );
}

function Control({ keys, text }: { keys: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <kbd className="shrink-0 rounded border border-cream/20 bg-walnut-dark px-2 py-0.5 font-mono text-xs text-honey">{keys}</kbd>
      <span className="text-cream-soft">{text}</span>
    </div>
  );
}
