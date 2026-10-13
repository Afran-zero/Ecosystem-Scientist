import type { DayRecord } from "@/types";

/**
 * Livability index, 0 to 100, for one simulated day. It is a stated composite, like the ecosystem
 * health score (decision D-28), so the lab can show it as a line over time. Four equal parts:
 *   - grass coverage (food and cover),
 *   - water quality,
 *   - clean air and land (100 minus pollution),
 *   - share of the species that are still present.
 * The weights are a teaching choice, not a biological measure. Change them here only.
 */
export function livabilityIndex(day: DayRecord, speciesCount: number): number {
  const grass = clamp(day.grassCoveragePercent, 0, 100);
  const water = clamp(day.env.waterQuality, 0, 100);
  const clean = clamp(100 - day.env.pollution, 0, 100);
  const present = Object.values(day.counts).filter((n) => n > 0).length;
  const species = speciesCount > 0 ? (clamp(present, 0, speciesCount) / speciesCount) * 100 : 0;
  return Math.round(((grass + water + clean + species) / 4) * 10) / 10;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
