"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/game/Modal";
import type { FoodWebEdge, SpeciesDef } from "@/types";
import { creatureSpriteStyle, TROPHIC_COLORS } from "./sprite";

interface FieldGuide {
  latin: string;
  habitat: string;
  diet: string;
  behaviour: string;
  facts: string[];
}

const KIND_VERB: Record<"grazes" | "forages" | "hunts", string> = {
  grazes: "grazes on",
  forages: "forages on",
  hunts: "hunts",
};

function lifespanText(hours: number): string {
  const years = hours / 24 / 365;
  return years < 3 ? `${years.toFixed(1)} years` : `${Math.round(years)} years`;
}

function nameOf(species: SpeciesDef[], id: string): string {
  if (id === "grass") return "Grass";
  return species.find((s) => s.id === id)?.displayName ?? id;
}

/**
 * The detailed species dialog used on the /about page. Mirrors the structure of
 * the in-game AnimalDialog but does not depend on the live simulation: it shows
 * the static stats from species.json plus the field-guide text from animal-facts.json.
 */
export default function SpeciesDialog({
  species,
  facts,
  speciesId,
  edges,
  onClose,
}: {
  species: SpeciesDef[];
  facts: Record<string, FieldGuide>;
  speciesId: string;
  edges: FoodWebEdge[];
  onClose: () => void;
}) {
  const sp = species.find((s) => s.id === speciesId);
  const guide = facts[speciesId];
  useEffect(() => {
    /* prevent body scroll while the dialog is open, matching the in-game Modal feel */
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!sp) return null;
  const colors = TROPHIC_COLORS[sp.classification];
  const eats = edges.filter((e) => e.predator === sp.id);
  const eatenBy = edges.filter((e) => e.prey === sp.id);

  return (
    <Modal title={sp.displayName} onClose={onClose} wide>
      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <span
            aria-hidden="true"
            className={`rounded bg-slate-900/60 ring-1 ${colors.ring}`}
            style={creatureSpriteStyle(sp.sprite, 7)}
          />
          <span className={`eco-chip capitalize ${colors.bg}`}>
            <span className={colors.text}>● </span>
            {colors.label}
          </span>
          {guide ? <span className="text-xs italic text-slate-400">{guide.latin}</span> : null}
        </div>

        <div className="space-y-4">
          <section aria-label="Stats" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Max population" value={String(sp.maxPopulation)} />
            <Stat label="Speed" value={`${sp.speedTilesPerHour.toFixed(1)} t/h`} />
            <Stat label="Detection" value={`${sp.detectionRadius} tiles`} />
            <Stat label="Lifespan" value={lifespanText(sp.maxAgeHours)} />
            <Stat label="Breeds from" value={`${Math.round(sp.minReproductiveAgeHours / 24)} days`} />
            <Stat label="Repro / day" value={`${Math.round(sp.reproductionProbabilityPerDay * 100)}%`} />
            <Stat label="Daily mortality" value={`${(sp.mortalityPerDay * 100).toFixed(2)}%`} />
            <Stat label="Starting (hub)" value={String(sp.startingPopulationHub)} />
          </section>

          <section className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
            <Field
              title="Eats"
              text={eats.length ? eats.map((e) => `${KIND_VERB[e.kind]} ${nameOf(species, e.prey)}`).join("; ") : "Nothing in this model."}
            />
            <Field
              title="Eaten by"
              text={eatenBy.length ? eatenBy.map((e) => `${nameOf(species, e.predator)} ${e.kind} it`).join("; ") : "No predator in this model."}
            />
            {guide ? <Field title="Habitat" text={guide.habitat} /> : null}
            {guide ? <Field title="Diet in the wild" text={guide.diet} /> : null}
            {guide ? <Field title="Behaviour" text={guide.behaviour} /> : null}
          </section>

          {guide ? <FactSubtitle facts={guide.facts} /> : <p className="text-sm text-slate-400">Loading field notes…</p>}
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function Field({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/90">{title}</p>
      <p className="mt-1 leading-relaxed">{text}</p>
    </div>
  );
}

/** A subtitle strip that shows one fact at a time, with a button to roll another. */
function FactSubtitle({ facts }: { facts: string[] }) {
  const pick = (avoid: number | null) => {
    if (facts.length < 2) return 0;
    let i = Math.floor(Math.random() * facts.length);
    while (i === avoid) i = Math.floor(Math.random() * facts.length);
    return i;
  };
  const [index, setIndex] = useState(() => pick(null));

  return (
    <div className="rounded-lg border border-amber-300/20 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">Did you know?</p>
        <button type="button" onClick={() => setIndex(pick(index))} className="eco-btn-ghost text-xs">
          Another fact
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-[3.5rem] text-base leading-relaxed text-slate-100">
        {facts[index]}
      </p>
      <p className="mt-1 text-right text-xs text-slate-500">
        Fact {index + 1} of {facts.length}
      </p>
    </div>
  );
}
