"use client";

import { useState } from "react";
import type { FoodWebEdge, SpeciesDef } from "@/types";
import SpeciesExplorer from "./SpeciesExplorer";
import TrophicPyramid from "./TrophicPyramid";
import type { TrophicLevel } from "./sprite";

interface FactFile {
  [id: string]: { latin: string; habitat: string; diet: string; behaviour: string; facts: string[] };
}

type ExplorerFilter = "all" | "producer" | "herbivore" | "omnivore" | "carnivore";

const LEVEL_TO_FILTER: Record<TrophicLevel, ExplorerFilter> = {
  producer: "producer",
  herbivore: "herbivore",
  omnivore: "omnivore",
  carnivore: "carnivore",
};

/**
 * Coordinates the species explorer and the trophic pyramid on /about.
 * Picking a tier in the pyramid filters the species cards, and vice versa.
 */
export default function LearnClient({
  species,
  facts,
  edges,
}: {
  species: SpeciesDef[];
  facts: FactFile;
  edges: FoodWebEdge[];
}) {
  const [filter, setFilter] = useState<ExplorerFilter>("all");

  return (
    <div className="space-y-6">
      <SpeciesExplorer
        species={species}
        facts={facts}
        edges={edges}
        filter={filter}
        onFilterChange={setFilter}
      />
      <TrophicPyramid
        species={species}
        selectedFilter={filter === "all" ? "all" : (filter as TrophicLevel)}
        onSelectFilter={(level) => setFilter(level === "all" ? "all" : LEVEL_TO_FILTER[level])}
      />
    </div>
  );
}
