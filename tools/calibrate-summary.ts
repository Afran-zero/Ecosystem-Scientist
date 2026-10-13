// Summarises hub stability over many seeds: extinctions, grass floor, and cap-days.
// Usage: npx tsx tools/calibrate-summary.ts [days] [seedCount]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseGameConfig, parseEnvironment } from "../src/simulation/config";
import { parseWorldMap } from "../src/simulation/world";
import { Simulation } from "../src/simulation/engine";

const root = resolve(process.cwd());
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), "utf-8"));
const config = parseGameConfig(read("public/data/species.json"), read("public/data/food-web.json"));
const world = parseWorldMap(read("public/maps/hub.json"));
const env = parseEnvironment(read("public/data/environment-hub.json"));
const startingPopulation = Object.fromEntries(config.species.map((s) => [s.id, s.startingPopulationHub]));
const grassStartPercent = { grassland: 90, meadow: 90, forest_edge: 80, forest: 40 };

const days = Number(process.argv[2] ?? 90);
const n = Number(process.argv[3] ?? 20);
let extinctRuns = 0;
const extinctBy: Record<string, number> = {};
let minGrass = 100;
const minCount: Record<string, number> = {};
for (const sp of config.species) minCount[sp.id] = Infinity;
for (let seed = 1; seed <= n; seed++) {
  const sim = Simulation.create({ config, world, env, seed, grassStartPercent, startingPopulation });
  sim.runDays(days);
  let extinct = false;
  for (const r of sim.dayRecords) {
    minGrass = Math.min(minGrass, r.grassCoveragePercent);
    for (const sp of config.species) {
      minCount[sp.id] = Math.min(minCount[sp.id], r.counts[sp.id]);
      if (r.counts[sp.id] === 0 && !extinctBy[sp.id + seed]) {
        extinctBy[sp.id + seed] = 1;
        extinct = true;
        extinctBy[sp.id] = (extinctBy[sp.id] ?? 0) + 1;
      }
    }
  }
  if (extinct) extinctRuns++;
}
console.log(`seeds ${n}, days ${days}`);
console.log(`runs with any extinction: ${extinctRuns}/${n}`);
console.log("extinction events by species:", Object.fromEntries(config.species.map((s) => [s.id, extinctBy[s.id] ?? 0])));
console.log("lowest count seen:", minCount);
console.log(`lowest grass coverage seen: ${minGrass.toFixed(1)}%`);
