"use client";

import { useMemo, useState } from "react";
import type { GameConfig } from "@/types";

/**
 * A short lesson on food chains and food webs, placed beside the food-web diagram. Every chain,
 * trophic level and "in this model" note is computed from food-web.json and species.json, so the
 * lesson always describes the island the player is actually running.
 */

const LEVEL_NAMES = ["Producer", "Primary consumer", "Secondary consumer", "Tertiary consumer"];

interface Analysis {
  names: Record<string, string>;
  level: Record<string, number>;
  chains: string[][];
  omnivoreNotes: string[];
}

function analyse(config: GameConfig): Analysis {
  const names: Record<string, string> = { grass: "Grass" };
  for (const s of config.species) names[s.id] = s.displayName;

  // Trophic level: the shortest route from a producer, counting one step per feeding link.
  const level: Record<string, number> = { grass: 1 };
  for (let pass = 0; pass < config.species.length + 1; pass++) {
    for (const e of config.foodWeb) {
      const prey = level[e.prey];
      if (prey === undefined) continue;
      const next = prey + 1;
      if (level[e.predator] === undefined || next < level[e.predator]) level[e.predator] = next;
    }
  }

  // Every chain from grass up to an animal that nothing in the model eats.
  const chains: string[][] = [];
  const walk = (path: string[]) => {
    const here = path[path.length - 1];
    const eaters = config.foodWeb.filter((e) => e.prey === here).map((e) => e.predator);
    if (eaters.length === 0) {
      chains.push(path);
      return;
    }
    for (const predator of eaters) walk([...path, predator]);
  };
  walk(["grass"]);

  const omnivoreNotes = config.species
    .filter((s) => s.classification === "omnivore")
    .map((s) => {
      const eats = config.foodWeb.filter((e) => e.predator === s.id).map((e) => names[e.prey]);
      return eats.length
        ? `${s.displayName} are omnivores. In this model they feed only on ${eats.join(" and ").toLowerCase()}, so they sit at level ${level[s.id]} here.`
        : `${s.displayName} are omnivores, but this model gives them no feeding links yet.`;
    });

  return { names, level, chains, omnivoreNotes };
}

export default function FoodChainLesson({ config }: { config: GameConfig }) {
  const a = useMemo(() => analyse(config), [config]);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});

  const fox = config.species.find((s) => s.classification === "carnivore");
  const foxLevel = fox ? a.level[fox.id] : undefined;
  const rabbitLevel = a.level.rabbit;

  return (
    <div className="space-y-5 text-sm text-slate-200">
      <section>
        <h3 className="eco-heading">Food chains and food webs</h3>
        <p className="mt-1 leading-relaxed">
          A <strong>food chain</strong> is one route that energy takes through an ecosystem, for example grass, then a rabbit, then a fox. Each arrow means
          &ldquo;is eaten by&rdquo;. A <strong>food web</strong> is all the chains in an ecosystem together. Most animals eat more than one thing, so the
          chains overlap.
        </p>
      </section>

      <section>
        <h3 className="eco-heading">Trophic levels</h3>
        <p className="mt-1 leading-relaxed">
          A trophic level is how many feeding steps an organism is from the plants. Plants make their own food from light, so they are level 1. Animals
          that eat plants are level 2. Animals that eat those animals are level 3.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {config.species
            .slice()
            .sort((x, y) => (a.level[x.id] ?? 9) - (a.level[y.id] ?? 9))
            .map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded border border-slate-700 px-3 py-2">
                <span>{s.displayName}</span>
                <span className="text-xs text-slate-300">
                  Level {a.level[s.id] ?? "–"}: {LEVEL_NAMES[(a.level[s.id] ?? 1) - 1] ?? "Consumer"}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section>
        <h3 className="eco-heading">Chains on this island</h3>
        <ul className="mt-2 space-y-1.5">
          {a.chains.map((chain) => (
            <li key={chain.join(">")} className="flex flex-wrap items-center gap-1.5">
              {chain.map((id, i) => (
                <span key={`${id}-${i}`} className="flex items-center gap-1.5">
                  <span className="rounded bg-slate-800 px-2 py-0.5">{a.names[id] ?? id}</span>
                  {i < chain.length - 1 ? <span aria-hidden="true" className="text-slate-500">→</span> : null}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="eco-heading">Why chains are short</h3>
        <p className="mt-1 leading-relaxed">
          At each step most of the energy is lost, mostly as heat from moving and keeping warm. A common rule of thumb is that only about one tenth of
          what one level eats becomes new body mass at the next level. So there is far less energy at the top than at the bottom, and few animals can sit
          at the top of a long chain.
        </p>
        {foxLevel !== undefined ? (
          <p className="mt-2 text-slate-300">In this model the fox is at level {foxLevel}, so it depends on the grass through prey animals.</p>
        ) : null}
      </section>

      {a.omnivoreNotes.length ? (
        <section>
          <h3 className="eco-heading">A note on omnivores</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-300">
            {a.omnivoreNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="eco-heading">Check yourself</h3>
        <Question
          id="arrow"
          q="In the food web diagram, an arrow runs from rabbit to fox. Which animal does the arrow point to?"
          a="The fox. The arrow points from the food to the animal that eats it."
          answered={answered}
          onReveal={(id) => setAnswered((s) => ({ ...s, [id]: true }))}
        />
        <Question
          id="level"
          q="What trophic level is an animal that eats only rabbits?"
          a={rabbitLevel !== undefined ? `Level ${rabbitLevel + 1}. A rabbit is level ${rabbitLevel}, so its eater is one step further from the plants.` : "One level above the rabbit."}
          answered={answered}
          onReveal={(id) => setAnswered((s) => ({ ...s, [id]: true }))}
        />
        <Question
          id="energy"
          q="Why is a food chain rarely longer than four or five links?"
          a="Energy is lost at every step, so there is too little left to support many levels of animals."
          answered={answered}
          onReveal={(id) => setAnswered((s) => ({ ...s, [id]: true }))}
        />
      </section>
    </div>
  );
}

function Question({
  id,
  q,
  a,
  answered,
  onReveal,
}: {
  id: string;
  q: string;
  a: string;
  answered: Record<string, boolean>;
  onReveal: (id: string) => void;
}) {
  const open = Boolean(answered[id]);
  return (
    <div className="mt-3">
      <p className="text-slate-100">{q}</p>
      {open ? (
        <p className="mt-1 text-emerald-200">{a}</p>
      ) : (
        <button type="button" onClick={() => onReveal(id)} className="eco-btn mt-2 text-xs">
          Show the answer
        </button>
      )}
    </div>
  );
}
