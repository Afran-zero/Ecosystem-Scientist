import type { GameConfig, SimulationSnapshot, WorldMap } from "@/types";
import { isBlocked } from "./world";

/**
 * Checks from spec 5.8. Returns a list of violations, empty when the state is valid.
 * Tests run this after every step. The app can run it on a sample of steps.
 */
export function checkInvariants(snap: SimulationSnapshot, config: GameConfig, world: WorldMap): string[] {
  const problems: string[] = [];
  const bySpecies = new Map(config.species.map((s) => [s.id, s]));

  const ids = new Set<string>();
  const counts: Record<string, number> = {};
  for (const sp of config.species) counts[sp.id] = 0;

  for (const a of snap.animals) {
    if (ids.has(a.id)) problems.push(`duplicate animal id ${a.id}`);
    ids.add(a.id);
    const sp = bySpecies.get(a.speciesId);
    if (!sp) {
      problems.push(`animal ${a.id} has unknown species ${a.speciesId}`);
      continue;
    }
    if (!a.alive) continue;
    counts[a.speciesId]++;
    for (const [name, v] of Object.entries({ x: a.x, y: a.y, health: a.health, energy: a.energy, hunger: a.hunger })) {
      if (!Number.isFinite(v)) problems.push(`animal ${a.id} ${name} is not finite`);
    }
    if (a.health < 0 || a.energy < 0) problems.push(`animal ${a.id} has negative health or energy`);
    if (a.health > 100 || a.energy > 100) problems.push(`animal ${a.id} health or energy above 100`);
    if (isBlocked(world, a.x, a.y)) problems.push(`animal ${a.id} stands on a blocked tile`);
  }

  for (const sp of config.species) {
    if (counts[sp.id] < 0) problems.push(`negative population for ${sp.id}`);
    if (counts[sp.id] > sp.maxPopulation) {
      problems.push(`${sp.id} population ${counts[sp.id]} exceeds cap ${sp.maxPopulation}`);
    }
  }

  for (const [name, v] of Object.entries(snap.grass)) {
    if (!Number.isFinite(v)) problems.push(`grass ${name} is not finite`);
    else if (v < 0 || v > config.plant.maxCoverage + 1e-9) problems.push(`grass ${name} out of range: ${v}`);
  }

  for (const [name, v] of Object.entries(snap.env)) {
    if (typeof v === "number" && !Number.isFinite(v)) problems.push(`env ${name} is not finite`);
  }

  for (const d of snap.days) {
    for (const [sp, n] of Object.entries(d.counts)) {
      if (n < 0 || !Number.isFinite(n)) problems.push(`day ${d.day}: bad count for ${sp}`);
    }
  }

  return problems;
}
