"use client";

import { useState } from "react";
import { useJson, useLiveSimulation } from "./hooks";
import Modal from "./Modal";
import Sprite from "./Sprite";
import type { GameConfig } from "@/types";

/**
 * The dialog for an animal the player inspects with E. The field-guide text comes from
 * animal-facts.json. The relationships, lifespan and live readings come from the simulation and
 * its configuration, so they always match the island.
 */

interface FieldGuide {
  latin: string;
  habitat: string;
  diet: string;
  behaviour: string;
  facts: string[];
}

type FactFile = Record<string, FieldGuide>;

/** Plain-language names for the simulation's behaviour states. */
const STATE_LABELS: Record<string, string> = {
  idle: "Idle",
  wander: "Wandering",
  searchFood: "Looking for food",
  eat: "Eating",
  hunt: "Hunting",
  flee: "Fleeing",
  rest: "Resting",
  reproduce: "Reproducing",
  dead: "Dead",
};

function nameOf(config: GameConfig, id: string): string {
  if (id === "grass") return "Grass";
  return config.species.find((s) => s.id === id)?.displayName ?? id;
}

export default function AnimalDialog({
  animalId,
  speciesId,
  onClose,
}: {
  animalId: string;
  speciesId: string;
  onClose: () => void;
}) {
  const live = useLiveSimulation().liveWorld;
  const facts = useJson<FactFile>("/data/animal-facts.json");
  if (!live) return null;

  const animal = live.sim.liveAnimals.find((a) => a.id === animalId) ?? null;
  const species = live.config.species.find((s) => s.id === speciesId);
  if (!species) return null;

  const guide = facts?.[species.id];
  const count = live.sim.countBySpecies()[species.id] ?? 0;
  const eats = live.config.foodWeb.filter((e) => e.predator === species.id).map((e) => nameOf(live.config, e.prey));
  const eatenBy = live.config.foodWeb.filter((e) => e.prey === species.id).map((e) => nameOf(live.config, e.predator));
  const lifespanYears = species.maxAgeHours / 24 / 365;
  const lifespanText = lifespanYears < 3 ? lifespanYears.toFixed(1) : String(Math.round(lifespanYears));
  const breedsFromDays = Math.round(species.minReproductiveAgeHours / 24);

  return (
    <Modal title={species.displayName} onClose={onClose} wide>
      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <Sprite frame={species.sprite} scale={6} />
          <span className="eco-chip capitalize">{species.classification}</span>
          {guide ? <span className="text-xs italic text-cream-muted">{guide.latin}</span> : null}
        </div>

        <div className="space-y-4">
          <section aria-label="This animal now" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="On the island" value={String(count)} />
            <Stat label="Doing" value={animal ? (STATE_LABELS[animal.state] ?? animal.state) : "No longer alive"} />
            <Stat label="Energy" value={animal ? `${Math.round(animal.energy)} / 100` : "–"} />
            <Stat label="Age" value={animal ? `${Math.floor(animal.ageHours / 24)} days` : "–"} />
          </section>

          <section className="grid gap-3 text-sm text-cream sm:grid-cols-2">
            <Field title="Eats" text={eats.length ? eats.join(", ") : "Nothing in this model. It is a food source."} />
            <Field title="Eaten by" text={eatenBy.length ? eatenBy.join(", ") : "No predator in this model."} />
            <Field title="Lifespan in this model" text={`Up to about ${lifespanText} years. Breeds from about ${breedsFromDays} days old.`} />
            {guide ? <Field title="Habitat" text={guide.habitat} /> : null}
            {guide ? <Field title="Diet in the wild" text={guide.diet} /> : null}
            {guide ? <Field title="Behaviour" text={guide.behaviour} /> : null}
          </section>

          {guide ? <FactSubtitle key={species.id} facts={guide.facts} /> : <p className="text-sm text-cream-muted">Loading field notes…</p>}
        </div>
      </div>
    </Modal>
  );
}

/** A subtitle strip that shows one random fact at a time, and another on request. */
function FactSubtitle({ facts }: { facts: string[] }) {
  const pick = (avoid: number | null) => {
    if (facts.length < 2) return 0;
    let i = Math.floor(Math.random() * facts.length);
    while (i === avoid) i = Math.floor(Math.random() * facts.length);
    return i;
  };
  const [index, setIndex] = useState(() => pick(null));

  return (
    <div className="on-dark rounded-lg border border-honey/40 bg-ink/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="on-dark-honey text-xs font-semibold uppercase tracking-wider">Did you know?</p>
        <button type="button" onClick={() => setIndex(pick(index))} className="eco-btn-ghost text-xs">
          Another fact
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-[3.5rem] text-base leading-relaxed text-cream">
        {facts[index]}
      </p>
      <p className="mt-1 text-right text-xs text-cream-muted">
        Fact {index + 1} of {facts.length}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cream/10 bg-cream/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-cream-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-cream">{value}</p>
    </div>
  );
}

function Field({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-moss-light">{title}</p>
      <p className="mt-1 leading-relaxed">{text}</p>
    </div>
  );
}
