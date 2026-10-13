// Runs reference strategies for each mission and prints how each objective is measured.
// Usage: npx tsx tools/mission-check.ts [seedCount]   (seeds 1..seedCount; prints pass rates)
// Set STRATEGIES to a JSON object: {"<mission id>": {"<control>": value}}.
// A mission is only shipped when a reference strategy passes it (plan M4.7).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseGameConfig, parseEnvironment } from "../src/simulation/config";
import { parseWorldMap } from "../src/simulation/world";
import { parseMissions, missionDefaults, evaluateMission } from "../src/missions/mission";
import { runExperiment } from "../src/simulation/experiments";
import type { ControlKey, ExperimentSettings, MissionDef } from "../src/types";

const root = resolve(process.cwd());
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), "utf-8"));
const config = parseGameConfig(read("public/data/species.json"), read("public/data/food-web.json"));
const maps: Record<string, ReturnType<typeof parseWorldMap>> = {};
for (const id of ["hub", "mission-meadow", "mission-forest", "mission-pond"]) {
  maps[id] = parseWorldMap(read(`public/maps/${id}.json`));
}
const missions = parseMissions(read("public/data/missions.json"), Object.keys(maps));
const seedCount = Number(process.argv[2] ?? 10);
const EVIDENCE = "Reference run: the changed settings were tested over the full duration and compared with the default run.";

const strategies: Record<string, Partial<Record<ControlKey, number>>> = JSON.parse(process.env.STRATEGIES ?? "{}");

function run(m: MissionDef, overrides: Partial<Record<ControlKey, number>>, seed: number) {
  const settings: ExperimentSettings = { ...missionDefaults(m), ...overrides };
  const rec = runExperiment({
    config,
    world: maps[m.mapId],
    env: parseEnvironment(m.start.env),
    settings,
    seed,
    baseGrassPercent: m.start.grassPercent,
    id: `${m.id}-check`,
  });
  return { rec, out: evaluateMission(m, rec, EVIDENCE) };
}

for (const m of missions) {
  const candidates: Record<string, Partial<Record<ControlKey, number>>> = {
    default: {},
    ...(strategies[m.id] ? { chosen: strategies[m.id] } : {}),
  };
  console.log(`
== ${m.title} (${m.id}), ${m.durationDays} days, seeds 1..${seedCount}`);
  for (const [name, overrides] of Object.entries(candidates)) {
    let passes = 0;
    const failing: string[] = [];
    for (let seed = 1; seed <= seedCount; seed++) {
      const { out } = run(m, overrides, seed);
      if (out.passed) passes++;
      else failing.push(`seed ${seed}: ${out.objectives.filter((o) => !o.passed).map((o) => o.text).join("; ") || out.problems.join("; ")}`);
    }
    console.log(`  ${name}: ${passes}/${seedCount} pass  ${JSON.stringify(overrides)}`);
    for (const f of failing.slice(0, 3)) console.log(`    ${f}`);
  }
}
