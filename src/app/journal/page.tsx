"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useJson, useLiveSimulation } from "@/components/game/hooks";
import Sprite from "@/components/game/Sprite";
import type { SpeciesDef } from "@/types";

/**
 * The field journal (plan M4.11). Species appear once the player has inspected one on an island.
 * Observations are recorded then too, and the journal is saved with the mission progress.
 */

interface FieldGuide {
  latin: string;
  habitat: string;
  diet: string;
  behaviour: string;
}
type FactFile = Record<string, FieldGuide>;
interface SpeciesFile {
  species: (SpeciesDef & { sprite: number })[];
}
interface FoodWebFile {
  edges: { prey: string; predator: string; kind: string }[];
}

const KIND_WORD: Record<string, string> = { grazes: "grazes on", forages: "forages on", hunts: "hunts" };

export default function JournalPage() {
  const store = useLiveSimulation();
  useEffect(() => store.hydrate(), [store]);
  const species = useJson<SpeciesFile>("/data/species.json");
  const web = useJson<FoodWebFile>("/data/food-web.json");
  const guides = useJson<FactFile>("/data/animal-facts.json");

  const journal = store.journal;
  const name = (id: string) => {
    if (id === "grass") return "Grass";
    return species?.species.find((s) => s.id === id)?.displayName ?? id;
  };
  const seenIn = (id: string) => journal.observations.filter((o) => o.speciesId === id);
  const labOpened = journal.discovered.includes("research-lab");

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/90">Field journal</p>
          <h1 className="mt-2 font-display text-3xl text-amber-100 sm:text-4xl">What you have met on the island</h1>
        </div>
        <Link href="/" className="eco-btn">
          Main menu
        </Link>
      </header>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
        A species is added the first time you inspect one with E. Each inspection is recorded with the island, the day and what the animal was doing.
        The lab is recorded when you first open it.
      </p>
      <p className="mt-2 text-xs text-slate-400">
        {journal.discovered.filter((d) => d !== "research-lab").length} of {species?.species.length ?? "…"} species discovered · Research lab{" "}
        {labOpened ? "opened" : "not opened yet"}
      </p>

      <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Species">
        {(species?.species ?? []).map((sp) => {
          const found = journal.discovered.includes(sp.id);
          const guide = guides?.[sp.id];
          const eats = (web?.edges ?? []).filter((e) => e.predator === sp.id);
          const eatenBy = (web?.edges ?? []).filter((e) => e.prey === sp.id);
          const sightings = seenIn(sp.id);
          if (!found) {
            return (
              <article key={sp.id} className="eco-panel flex flex-col items-start gap-3 p-5 opacity-70">
                <Sprite frame={sp.sprite} scale={3} />
                <h2 className="font-display text-lg text-slate-400">Not yet discovered</h2>
                <p className="text-sm text-slate-400">Walk up to one on the island and press E to add it to the journal.</p>
              </article>
            );
          }
          return (
            <article key={sp.id} className="eco-panel eco-rise flex flex-col gap-3 p-5">
              <div className="flex items-start gap-4">
                <Sprite frame={sp.sprite} scale={3} />
                <div>
                  <h2 className="font-display text-xl text-amber-100">{sp.displayName}</h2>
                  <p className="text-xs italic text-slate-400">{guide?.latin}</p>
                  <span className="eco-chip mt-1 capitalize">{sp.classification}</span>
                </div>
              </div>
              {guide ? (
                <dl className="space-y-2 text-sm text-slate-300">
                  <div>
                    <dt className="eco-heading text-xs uppercase tracking-wider">Habitat</dt>
                    <dd>{guide.habitat}</dd>
                  </div>
                  <div>
                    <dt className="eco-heading text-xs uppercase tracking-wider">Diet</dt>
                    <dd>{guide.diet}</dd>
                  </div>
                </dl>
              ) : null}
              <p className="text-sm text-slate-300">
                {eats.length ? `Eats: ${eats.map((e) => name(e.prey)).join(", ")}. ` : "Eats nothing in this model. "}
                {eatenBy.length ? `Eaten by: ${eatenBy.map((e) => name(e.predator)).join(", ")}.` : "No predator in this model."}
              </p>
              <p className="mt-auto text-xs text-slate-400">
                {sightings.length} observation{sightings.length === 1 ? "" : "s"}
                {sightings.length ? `. Last: ${sightings[sightings.length - 1].text}` : ""}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="eco-heading text-lg">Trophic relationships</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
            {(web?.edges ?? []).map((e) => (
              <li key={`${e.prey}-${e.predator}`}>
                <span className="text-slate-100">{name(e.predator)}</span> {KIND_WORD[e.kind] ?? "eats"}{" "}
                <span className="text-slate-100">{name(e.prey)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="eco-heading text-lg">Observations</h2>
          {journal.observations.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No observations yet.</p>
          ) : (
            <ol className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-2 text-sm text-slate-300">
              {[...journal.observations].reverse().slice(0, 100).map((o) => (
                <li key={o.id} className="rounded border border-white/10 px-3 py-2">
                  {o.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
