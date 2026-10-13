// Runs the hub island for N days across seeds and prints population and grass trajectories.
// Usage: npx tsx tools/calibrate-hub.ts [days] [seeds...]
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
const seeds = process.argv.slice(3).map(Number);
for (const seed of seeds.length ? seeds : [1, 2, 3]) {
  const sim = Simulation.create({ config, world, env, seed, grassStartPercent, startingPopulation });
  sim.runDays(days);
  const rec = sim.dayRecords;
  const pick = [0, 9, 29, days - 1].filter((d) => d < rec.length);
  console.log(`seed ${seed}`);
  for (const d of pick) {
    const c = rec[d].counts;
    console.log(
      `  day ${String(d + 1).padStart(3)}: ` +
        config.species.map((s) => `${s.id} ${c[s.id]}`).join(", ") +
        `, grass ${rec[d].grassCoveragePercent.toFixed(1)}%, hunts ${rec[d].huntsSucceeded}`,
    );
  }
}
