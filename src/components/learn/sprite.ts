/**
 * Render a single animal sprite from the Tiny Creatures sheet.
 * Same math as the in-game Sprite component, but available to the learn/* islands
 * so the species cards, pyramid and food-web nodes all use the same art source.
 */
const SHEET_COLUMNS = 10;
const CELL = 17;
const SHEET_W = 170;
const SHEET_H = 306;

export function creatureSpriteStyle(frame: number, scale = 4): React.CSSProperties {
  const col = frame % SHEET_COLUMNS;
  const row = Math.floor(frame / SHEET_COLUMNS);
  return {
    display: "inline-block",
    flex: "0 0 auto",
    width: 16 * scale,
    height: 16 * scale,
    backgroundImage: "url(/assets/animals/creatures.png)",
    backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
    backgroundPosition: `-${col * CELL * scale}px -${row * CELL * scale}px`,
    imageRendering: "pixelated",
  };
}

export type TrophicLevel = "producer" | "herbivore" | "omnivore" | "carnivore";

/** Color tokens that match the About / How-to-play copy on the main menu. */
export const TROPHIC_COLORS: Record<TrophicLevel, { text: string; ring: string; bg: string; label: string }> = {
  producer: { text: "text-moss-light", ring: "ring-moss-light/40", bg: "bg-honey-hover/10", label: "Producer" },
  herbivore: { text: "text-moss-light", ring: "ring-moss-light/40", bg: "bg-moss-light/10", label: "Herbivore" },
  omnivore: { text: "text-honey", ring: "ring-honey/40", bg: "bg-golden/10", label: "Omnivore" },
  carnivore: { text: "text-rust-light", ring: "ring-rust-light/40", bg: "bg-rust/10", label: "Carnivore" },
};

/** Plain-language description for each edge kind in the food web. */
export const EDGE_KIND_VERB: Record<"grazes" | "forages" | "hunts", string> = {
  grazes: "grazes on",
  forages: "forages on",
  hunts: "hunts",
};

export const EDGE_KIND_EXPLAIN: Record<"grazes" | "forages" | "hunts", string> = {
  grazes: "Eats only plants. Energy flows from a producer to a primary consumer.",
  forages: "Picks seeds, shoots and small animals from the ground. A flexible omnivore link.",
  hunts: "Kills and eats another animal. Energy flows up to a secondary or tertiary consumer.",
};
