import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseGameConfig, parseEnvironment } from "@/simulation/config";
import { parseWorldMap } from "@/simulation/world";
import type { GameConfig, EnvironmentState, WorldMap } from "@/types";

const root = resolve(__dirname, "..");

export function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(resolve(root, rel), "utf-8"));
}

export function loadConfig(): GameConfig {
  return parseGameConfig(readJson("public/data/species.json"), readJson("public/data/food-web.json"));
}

export function loadHubWorld(): WorldMap {
  return parseWorldMap(readJson("public/maps/hub.json"));
}

export function loadHubEnvironment(): EnvironmentState {
  return parseEnvironment(readJson("public/data/environment-hub.json"));
}

/** Hub starting setup from the spec and ECOLOGY_MODEL.md (proposed values). */
export const HUB_GRASS_START: Record<string, number> = {
  grassland: 90,
  meadow: 90,
  forest_edge: 80,
  forest: 40,
  station: 30,
};
