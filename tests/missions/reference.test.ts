import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateMission, missionDefaults, parseMissions } from "@/missions/mission";
import { runExperiment } from "@/simulation/experiments";
import { parseEnvironment } from "@/simulation/config";
import { parseWorldMap } from "@/simulation/world";
import type { ControlKey, MissionDef } from "@/types";
import { loadConfig } from "../helpers";

// Plan M4.7: each mission has a reference strategy that passes and a control that fails.
// The strategies below are the ones tools/mission-check.ts found to pass on 10 of 10 seeds (run with `npx tsx tools/mission-check.ts 10`).
const REFERENCE: Record<string, Partial<Record<ControlKey, number>>> = {
  "mission-meadow": { rainfallMmPerDay: 90, sunlightPercent: 100, soilQuality: 100, rabbit: 16, cow: 3 },
  "mission-forest": { soilQuality: 100, sunlightPercent: 100, rainfallMmPerDay: 100, pollution: 0, rabbit: 16, mouse: 24, fox: 3 },
  "mission-pond": { pollution: 10, rainfallMmPerDay: 70, soilQuality: 80, sunlightPercent: 85, rabbit: 8, mouse: 10, fox: 3 },
};

const read = (rel: string) => JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf-8"));
const config = loadConfig();
const maps = {
  "mission-meadow": parseWorldMap(read("public/maps/mission-meadow.json")),
  "mission-forest": parseWorldMap(read("public/maps/mission-forest.json")),
  "mission-pond": parseWorldMap(read("public/maps/mission-pond.json")),
};
const missions: MissionDef[] = parseMissions(read("public/data/missions.json"), ["hub", ...Object.keys(maps)]);
const EVIDENCE = "Reference run: the changed settings were tested over the full duration and compared with the default run.";

function runFor(m: MissionDef, overrides: Partial<Record<ControlKey, number>>, seed: number) {
  const rec = runExperiment({
    config,
    world: maps[m.mapId as keyof typeof maps],
    env: parseEnvironment(m.start.env),
    settings: { ...missionDefaults(m), ...overrides },
    seed,
    baseGrassPercent: m.start.grassPercent,
  });
  return evaluateMission(m, rec, EVIDENCE);
}

describe("mission reference strategies (plan M4.7)", () => {
  for (const m of missions) {
    it(`${m.title}: the reference passes on seeds 1-10`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const out = runFor(m, REFERENCE[m.id], seed);
        expect(out.passed, `seed ${seed}: ${out.objectives.filter((o) => !o.passed).map((o) => o.text).join("; ")}`).toBe(true);
      }
    });

    it(`${m.title}: the default settings do not pass`, () => {
      const out = runFor(m, {}, 1);
      expect(out.passed).toBe(false);
    });
  }
});
