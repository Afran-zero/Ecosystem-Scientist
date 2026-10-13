import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { liveSimulation, type LiveWorld } from "@/game/liveSimulation";
import { missionDefaults, parseMissions } from "@/missions/mission";
import { parseEnvironment } from "@/simulation/config";
import { buildRun, runExperiment } from "@/simulation/experiments";
import { parseWorldMap } from "@/simulation/world";
import type { ControlKey, MissionDef } from "@/types";
import { loadConfig } from "../helpers";

// Plan M4.10: the three missions can be completed in any of the six orders, and each one passes
// wherever it sits in the order. The hub stays open throughout.
const read = (rel: string) => JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf-8"));
const config = loadConfig();
const missions = parseMissions(read("public/data/missions.json"), ["hub", "mission-meadow", "mission-forest", "mission-pond"]);
const REFERENCE: Record<string, Partial<Record<ControlKey, number>>> = {
  "mission-meadow": { rainfallMmPerDay: 90, sunlightPercent: 100, soilQuality: 100, rabbit: 16, cow: 3 },
  "mission-forest": { soilQuality: 100, sunlightPercent: 100, rainfallMmPerDay: 100, pollution: 0, rabbit: 16, mouse: 24, fox: 3 },
  "mission-pond": { pollution: 10, rainfallMmPerDay: 70, soilQuality: 80, sunlightPercent: 85, rabbit: 8, mouse: 10, fox: 3 },
};
const EVIDENCE = "Reference run: the changed settings were tested over the full duration and compared with the default run.";

function islandFor(m: MissionDef): LiveWorld {
  const world = parseWorldMap(read(`public/maps/${m.mapId}.json`));
  const env = parseEnvironment(m.start.env);
  const settings = { ...missionDefaults(m), ...REFERENCE[m.id] };
  const sim = buildRun({ config, world, env, settings, seed: 2026, baseGrassPercent: m.start.grassPercent });
  return { islandId: m.id, mission: m, config, world, sim, env, baseGrassPercent: m.start.grassPercent };
}

function reference(m: MissionDef) {
  const island = islandFor(m);
  const record = runExperiment({
    config,
    world: island.world,
    env: island.env,
    settings: { ...missionDefaults(m), ...REFERENCE[m.id] },
    seed: 1,
    baseGrassPercent: m.start.grassPercent,
    id: `${m.id}-reference`,
  });
  return { ...record, role: "experiment" as const };
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

describe("mission order (plan M4.10)", () => {
  it("has exactly six orders to test", () => {
    expect(permutations(missions).length).toBe(6);
  });

  for (const order of permutations(missions)) {
    const label = order.map((m) => m.id).join(" → ");
    it(`completes in the order ${label}`, () => {
      for (const m of order) {
        liveSimulation.attach(islandFor(m));
        const outcome = liveSimulation.submitEvidence(reference(m), EVIDENCE);
        expect(outcome?.passed, `${m.id}: ${outcome?.objectives.filter((o) => !o.passed).map((o) => o.text).join("; ")}`).toBe(true);
      }
      for (const m of order) {
        expect(liveSimulation.progressFor(m.id).status).toBe("completed");
      }
    });
  }
});
