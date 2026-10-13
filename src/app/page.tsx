"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveSimulation, useMissions } from "@/components/game/hooks";

/**
 * The opening screen: a hero with the island, the main actions, then About and How to play.
 * Mission progress is read from the browser's save, so the menu can show how far the player got.
 */
export default function MainMenu() {
  const store = useLiveSimulation();
  const missions = useMissions();
  useEffect(() => store.hydrate(), [store]);

  const completed = missions.filter((m) => store.progressFor(m.id).status === "completed").length;

  return (
    <main className="min-h-dvh">
      <section className="relative isolate overflow-hidden">
        <img
          src="/assets/ui/hero-island.png"
          alt="Pixel-art island with grassland, trees and a pond"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35 [image-rendering:pixelated]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-[var(--eco-ground)]" />
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
          <p className="eco-rise text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/90">A pixel-art ecology game</p>
          <h1 className="eco-rise mt-4 font-display text-4xl text-amber-100 sm:text-6xl" style={{ animationDelay: "60ms" }}>
            Ecosystem Scientist
          </h1>
          <p className="eco-rise mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg" style={{ animationDelay: "120ms" }}>
            Explore one island, watch the animals live their lives, and test what happens when the conditions change. Then restore three damaged
            corners of the island.
          </p>

          <nav className="eco-rise mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row" aria-label="Main menu" style={{ animationDelay: "180ms" }}>
            <Link href="/game" className="eco-btn-primary flex-1 py-3 text-base">
              New game
            </Link>
            <Link href="/missions" className="eco-btn flex-1 py-3 text-base">
              Missions {missions.length ? `(${completed} of ${missions.length} complete)` : ""}
            </Link>
            <Link href="/journal" className="eco-btn flex-1 py-3 text-base">
              Field journal
            </Link>
          </nav>
          <p className="mt-4 text-xs text-slate-500">New game starts the hub island. Mission progress is saved in this browser.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 md:grid-cols-2">
        <section id="about" aria-labelledby="about-title" className="eco-panel p-6 sm:p-8">
          <h2 id="about-title" className="font-display text-2xl text-amber-100">
            About
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-300">
            <p>
              Ecosystem Scientist is a small island where seven species live out their lives in a simulation. Grass grows and is grazed. Trees seed
              into the forest. Rabbits, cows, chickens, mice and foxes eat, flee, hunt, breed and die by rules you can read.
            </p>
            <p>
              The simulation is separate from the graphics. The same settings and seed always give the same result. The numbers live in data files, so
              the model can be inspected and changed.
            </p>
            <p>
              It is an educational model, not a forecast. Where it simplifies, the game says so. The lab shows the population charts, the food web and
              the baseline comparison so you can check your own conclusions against the data.
            </p>
            <div>
              <p className="font-semibold text-slate-200">What you will learn</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>How food chains and food webs connect plants and animals, and why energy is lost at each step.</li>
                <li>What limits a population: food, shelter, predators and the number of animals it can support.</li>
                <li>How pollution and habitat loss reach the animals through the plants they depend on.</li>
              </ul>
            </div>
            <p className="text-xs text-slate-500">
              Art: Tiny Islands by Majadroid and Tiny Creatures by Clint Bellanger with Kenney. Both packs are CC0. Attribution is not required, and it
              is appreciated.
            </p>
          </div>
        </section>

        <section id="how-to-play" aria-labelledby="how-title" className="eco-panel p-6 sm:p-8">
          <h2 id="how-title" className="font-display text-2xl text-amber-100">
            How to play
          </h2>
          <ol className="mt-4 space-y-4 text-sm leading-relaxed text-slate-300">
            <li>
              <span className="font-semibold text-slate-100">1. Explore.</span> Walk around the island with the keys below. Forest, pond, meadow,
              grassland and the coast each look different.
            </li>
            <li>
              <span className="font-semibold text-slate-100">2. Inspect animals.</span> Walk up to an animal and press E. Its field guide shows where it
              sits in the food web, how it lives, and facts you can page through.
            </li>
            <li>
              <span className="font-semibold text-slate-100">3. Use the lab.</span> Walk to the Research lab and press E. Change the environment and
              starting populations, run a control and an experiment with the same seed, then compare them on the Results tab. The Food web tab explains
              chains and levels.
            </li>
            <li>
              <span className="font-semibold text-slate-100">4. Restore a mission.</span> Walk to a mission marker and press E for the briefing. Change
              only the allowed controls, run at least the minimum number of days, and submit your evidence. The results screen shows which criteria were
              met and why.
            </li>
          </ol>

          <div className="mt-6 grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm sm:grid-cols-2">
            <p className="font-semibold text-slate-100 sm:col-span-2">Controls</p>
            <Key keys="W A S D or arrows" text="Move" />
            <Key keys="E" text="Inspect, open the lab, read a briefing, or leave a mission" />
            <Key keys="Space" text="Pause or resume the island" />
            <Key keys="1 · 2 · 3" text="Speed 1×, 5×, 10×" />
            <Key keys="Esc" text="Close a dialog or the lab" />
          </div>
        </section>
      </div>
    </main>
  );
}

function Key({ keys, text }: { keys: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <kbd className="shrink-0 rounded border border-white/20 bg-slate-900 px-2 py-0.5 font-mono text-xs text-amber-100">{keys}</kbd>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}
