"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveSimulation, useMissions } from "@/components/game/hooks";
import CreditFooter from "@/components/CreditFooter";

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
    <main className="paper">
      <section className="relative isolate overflow-hidden">
        <img
          src="/assets/ui/hero-island.png"
          alt="Pixel-art island with grassland, trees and a pond"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35 [image-rendering:pixelated]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/40 via-ink/60 to-cream" />
        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
          <div className="eco-panel-paper max-w-2xl px-6 py-5 sm:px-8">
          <p className="eco-rise text-xs font-semibold uppercase tracking-[0.3em] text-moss-light">A pixel-art ecology game</p>
          <h1 className="eco-rise mt-4 font-display text-4xl text-honey sm:text-6xl" style={{ animationDelay: "60ms" }}>
            Ecosystem Scientist
          </h1>
          <p className="eco-rise mt-5 max-w-2xl text-base leading-relaxed text-cream-soft sm:text-lg" style={{ animationDelay: "120ms" }}>
            Explore one island, watch the animals live their lives, and test what happens when the conditions change. Then restore three damaged
            corners of the island.
          </p>

          </div>

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
          <p className="mt-4 text-xs text-cream-muted">New game starts the hub island. Mission progress is saved in this browser.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 sm:px-6 md:grid-cols-2 xl:max-w-6xl">
        <Link
          id="about"
          href="/about"
          aria-labelledby="about-title"
          className="eco-panel group block p-6 transition hover:-translate-y-0.5 hover:border-honey/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-honey sm:p-8"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="about-title" className="font-display text-2xl text-honey">
              About
            </h2>
            <span aria-hidden="true" className="eco-btn-ghost text-xs uppercase tracking-wider">
              Open →
            </span>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-cream-soft">
            <p>
              <strong className="text-cream">Ecosystem Scientist</strong> is a small pixel-art island where seven species live out their lives in
              a working simulation. Grass grows back when it is grazed. Trees seed into the forest. Rabbits, cows, chickens, mice, foxes and the rest
              eat, flee, hunt, breed and die by rules you can read on screen and in the source files.
            </p>
            <p>
              The simulation is kept separate from the graphics, so the same settings and seed always give the same result. Numbers live in plain
              JSON files, the model is open, and the lab lets you check your own conclusions against the data.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2 text-[11px] text-cream-soft">
              <li className="eco-chip">Species browser</li>
              <li className="eco-chip">Trophic pyramid</li>
              <li className="eco-chip">Project story</li>
            </ul>
          </div>
        </Link>

        <Link
          id="how-to-play"
          href="/how-to-play"
          aria-labelledby="how-title"
          className="eco-panel group block p-6 transition hover:-translate-y-0.5 hover:border-honey/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-honey sm:p-8"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="how-title" className="font-display text-2xl text-honey">
              How to play
            </h2>
            <span aria-hidden="true" className="eco-btn-ghost text-xs uppercase tracking-wider">
              Open →
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-cream-soft">
            Your goal is to understand how the island works and to restore three damaged corners of it. Wander freely, run experiments in the lab, and
            submit missions when you think you have fixed a corner.
          </p>

          <ol className="mt-4 space-y-2 text-sm leading-relaxed text-cream-soft">
            <li><span className="font-semibold text-cream">1. Explore</span> the biomes and watch the animals.</li>
            <li><span className="font-semibold text-cream">2. Inspect</span> a creature with <kbd className="rounded border border-cream/20 bg-walnut-dark px-1 font-mono text-[0.7rem] text-honey">E</kbd> for its field guide.</li>
            <li><span className="font-semibold text-cream">3. Use the lab</span> to design a fair experiment.</li>
            <li><span className="font-semibold text-cream">4. Restore a mission</span> by meeting its criteria.</li>
          </ol>

          <ul className="mt-4 flex flex-wrap gap-2 text-[11px] text-cream-soft">
            <li className="eco-chip">Step-through tutorial</li>
            <li className="eco-chip">Interactive food web</li>
            <li className="eco-chip">Controls recap</li>
          </ul>
        </Link>
      </div>

      <CreditFooter />
    </main>
  );
}
