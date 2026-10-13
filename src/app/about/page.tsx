import Link from "next/link";
import LearnClient from "@/components/learn/LearnClient";
import type { FoodWebEdge, SpeciesDef } from "@/types";

import speciesData from "../../../public/data/species.json";
import factsData from "../../../public/data/animal-facts.json";
import foodWebData from "../../../public/data/food-web.json";

interface SpeciesFile {
  species: SpeciesDef[];
}
interface FoodWebFile {
  edges: FoodWebEdge[];
}
interface FactFile {
  [id: string]: { latin: string; habitat: string; diet: string; behaviour: string; facts: string[] };
}

/** animal-facts.json has a $comment key; strip it before treating the rest as FactFile. */
function factsFromRaw(raw: Record<string, unknown>): FactFile {
  const out: FactFile = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "$comment") continue;
    out[k] = v as FactFile[string];
  }
  return out;
}

/**
 * /about — the project story plus the interactive species browser and trophic pyramid.
 * JSON is imported at build time so the page renders without a fetch round-trip.
 * The two interactive islands share filter state via the LearnClient wrapper.
 */
export default function AboutPage() {
  const species = (speciesData as SpeciesFile).species;
  const facts = factsFromRaw(factsData as unknown as Record<string, unknown>);
  const edges = (foodWebData as FoodWebFile).edges;

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-moss-light">About</p>
          <h1 className="mt-2 font-display text-3xl text-honey sm:text-4xl">The island, the model, the goal</h1>
        </div>
        <Link href="/" className="eco-btn">
          ← Main menu
        </Link>
      </header>

      <section className="eco-panel eco-rise mt-8 p-6 sm:p-8">
        <h2 className="font-display text-2xl text-honey">Project story</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-cream-soft">
          <p>
            <strong className="text-cream">Ecosystem Scientist</strong> is a small pixel-art island where seven species live out their lives in a
            working simulation. Grass grows back when it is grazed. Trees seed into the forest. Rabbits, cows, chickens, mice, foxes and the rest eat,
            flee, hunt, breed and die by rules you can read on screen and in the source files.
          </p>
          <p>
            The simulation is kept separate from the graphics. The same settings, species data and seed always produce the same result, so an
            experiment is repeatable. Numbers live in plain JSON files in <code className="rounded bg-cream/10 px-1 font-mono text-[0.8rem] text-honey">public/data/</code>{" "}
            and the engine in <code className="rounded bg-cream/10 px-1 font-mono text-[0.8rem] text-honey">src/simulation/</code>, so the model can
            be inspected and changed without touching the renderer.
          </p>
          <p>
            It is an educational model, not a forecast. Where it simplifies — energy flow in a few trophic levels, no disease, no climate cycles — the
            game says so. The research lab shows the population charts, the food web and the baseline comparison so you can check your own
            conclusions against the data rather than against the art.
          </p>
        </div>
      </section>

      <div className="mt-8">
        <LearnClient species={species} facts={facts} edges={edges} />
      </div>

      <section className="eco-panel eco-rise mt-8 p-6 sm:p-8">
        <h2 className="font-display text-2xl text-honey">What you will learn</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-cream-soft">
          <li>How food chains and food webs connect plants and animals, and why energy is lost at each step up the chain.</li>
          <li>What limits a population: food, shelter, predators and the carrying capacity of the habitat.</li>
          <li>How disturbances such as overgrazing, pollution or habitat loss reach the animals through the plants they depend on.</li>
          <li>How to design a fair experiment: change one variable at a time, hold the seed constant, compare against a baseline run.</li>
          <li>How to read evidence — population curves, trophic-level breakdowns, pass / fail criteria — instead of guessing.</li>
        </ul>
        <p className="mt-5 text-xs text-cream-muted">
          Art: <em>Tiny Islands</em> by Majadroid and <em>Tiny Creatures</em> by Clint Bellanger, with tiles from Kenney. Both packs are CC0 —
          attribution is not required, and it is appreciated.
        </p>
      </section>
    </main>
  );
}
