"use client";

import { useMemo, useState } from "react";
import type { FoodWebEdge, SpeciesDef } from "@/types";
import SpeciesCard from "./SpeciesCard";
import SpeciesDialog from "./SpeciesDialog";

interface FieldGuide {
  latin: string;
  habitat: string;
  diet: string;
  behaviour: string;
  facts: string[];
}

type FilterKey = "all" | "producer" | "herbivore" | "omnivore" | "carnivore";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "producer", label: "Producers" },
  { key: "herbivore", label: "Herbivores" },
  { key: "omnivore", label: "Omnivores" },
  { key: "carnivore", label: "Carnivores" },
];

/**
 * The interactive species browser on /about. Filter chips narrow the list,
 * clicking a card opens a detailed dialog with stats and facts.
 * Grass and trees are not in species.json — we render them as two "Producer" cards
 * so the browser reflects the full cast, not just the animals.
 */
export default function SpeciesExplorer({
  species,
  facts,
  edges,
  filter: controlledFilter,
  onFilterChange,
}: {
  species: SpeciesDef[];
  facts: Record<string, FieldGuide>;
  edges: FoodWebEdge[];
  filter?: FilterKey;
  onFilterChange?: (next: FilterKey) => void;
}) {
  const [internalFilter, setInternalFilter] = useState<FilterKey>("all");
  const filter = controlledFilter ?? internalFilter;
  const setFilter = (next: FilterKey) => {
    if (onFilterChange) onFilterChange(next);
    setInternalFilter(next);
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const producers = useMemo(
    () => [
      { id: "grass", displayName: "Grass", sprite: 0, classification: "producer" as const, speedTilesPerHour: 0, detectionRadius: 0, metabolismPerHour: 0, grazePerHour: 0, huntable: false, predator: false, maxPopulation: 0, minReproductiveAgeHours: 0, reproductionProbabilityPerDay: 0, reproductionCooldownHours: 0, minHealth: 0, minEnergy: 0, mortalityPerDay: 0, maxAgeHours: 0, startingPopulationHub: 0 },
      { id: "tree", displayName: "Trees", sprite: 1, classification: "producer" as const, speedTilesPerHour: 0, detectionRadius: 0, metabolismPerHour: 0, grazePerHour: 0, huntable: false, predator: false, maxPopulation: 0, minReproductiveAgeHours: 0, reproductionProbabilityPerDay: 0, reproductionCooldownHours: 0, minHealth: 0, minEnergy: 0, mortalityPerDay: 0, maxAgeHours: 0, startingPopulationHub: 0 },
    ],
    []
  );

  const all: SpeciesDef[] = useMemo(() => [...producers, ...species], [producers, species]);
  const filtered = useMemo(
    () => (filter === "all" ? all : all.filter((s) => s.classification === filter)),
    [all, filter]
  );

  return (
    <div className="eco-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-amber-100">The cast of the island</h2>
          <p className="mt-1 text-sm text-slate-400">Filter by trophic level, then click a card to read the field guide.</p>
        </div>
        <p className="text-xs text-slate-500">
          {filtered.length} of {all.length} shown
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={["eco-chip", active ? "eco-chip-good" : ""].join(" ")}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <ul
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Species"
      >
        {filtered.map((sp, i) => (
          <li key={sp.id}>
            <SpeciesCard
              species={sp}
              selected={selectedId === sp.id}
              onSelect={() => setSelectedId(sp.id)}
              delayMs={i * 70}
            />
          </li>
        ))}
      </ul>

      {selectedId ? (
        <SpeciesDialog
          species={species}
          edges={edges}
          facts={facts}
          speciesId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
