// Times a full hub run (default settings) to check fast-forward cost on the main thread.
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
const days = Number(process.argv[2] ?? 90);
const sim = Simulation.create({ config, world, env, seed: 1, grassStartPercent: { grassland: 90, meadow: 90, forest_edge: 80, forest: 40 }, startingPopulation });
const t0 = performance.now();
sim.runDays(days);
const ms = performance.now() - t0;
console.log(`${days} days: ${ms.toFixed(0)} ms, animals alive at end: ${sim.liveAnimals.length}`);
