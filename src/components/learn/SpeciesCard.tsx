"use client";

import type { SpeciesDef } from "@/types";
import { creatureSpriteStyle, TROPHIC_COLORS } from "./sprite";

/**
 * A compact card showing one species. Click to open the detailed dialog.
 * The sprite comes from the same Tiny Creatures sheet used in the game, so the
 * preview matches what the player will see on the island.
 */
export default function SpeciesCard({
  species,
  selected,
  onSelect,
  delayMs = 0,
}: {
  species: SpeciesDef;
  selected: boolean;
  onSelect: () => void;
  delayMs?: number;
}) {
  const colors = TROPHIC_COLORS[species.classification];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "eco-panel eco-rise group flex w-full flex-col items-start gap-3 p-4 text-left transition",
        "hover:-translate-y-0.5 hover:border-honey/30 focus:outline-none",
        selected ? "ring-2 ring-honey/60" : "",
      ].join(" ")}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex w-full items-start gap-3">
        <span
          aria-hidden="true"
          className={`rounded bg-walnut-dark/60 ring-1 ${colors.ring}`}
          style={creatureSpriteStyle(species.sprite, 4)}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight text-honey">{species.displayName}</h3>
          <span className={`mt-1 inline-block text-[11px] font-semibold uppercase tracking-wider ${colors.text}`}>
            {colors.label}
          </span>
        </div>
      </div>
      <p className="text-xs text-cream-muted">
        Speed {species.speedTilesPerHour.toFixed(1)} tiles/h · Max pop {species.maxPopulation}
      </p>
      <p className="mt-auto text-[11px] uppercase tracking-wider text-honey group-hover:text-honey">
        Open details →
      </p>
    </button>
  );
}
