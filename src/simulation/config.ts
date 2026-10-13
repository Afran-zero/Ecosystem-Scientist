import { z } from "zod";
import type { EnvironmentState, GameConfig } from "@/types";

// Validation for public/data/*.json. Invalid config fails at startup with a readable error (plan M2.1).

const speciesSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  classification: z.enum(["producer", "herbivore", "omnivore", "carnivore"]),
  sprite: z.number().int().min(0),
  speedTilesPerHour: z.number().positive(),
  detectionRadius: z.number().positive(),
  metabolismPerHour: z.number().nonnegative(),
  grazePerHour: z.number().min(0).max(1),
  huntable: z.boolean(),
  predator: z.boolean(),
  huntSuccessChance: z.number().min(0).max(1).optional(),
  preyEnergyGain: z.number().nonnegative().optional(),
  maxPopulation: z.number().int().nonnegative(),
  minReproductiveAgeHours: z.number().nonnegative(),
  reproductionProbabilityPerDay: z.number().min(0).max(1),
  reproductionCooldownHours: z.number().nonnegative(),
  minHealth: z.number().min(0).max(100),
  minEnergy: z.number().min(0).max(100),
  mortalityPerDay: z.number().min(0).max(1),
  maxAgeHours: z.number().positive(),
  startingPopulationHub: z.number().int().nonnegative(),
});

const speciesFileSchema = z.object({
  species: z.array(speciesSchema).min(1),
  plant: z.object({
    energyPerGrazeUnit: z.number().positive(),
    regrowthPerDay: z.number().nonnegative(),
    seedRegrowthPerDay: z.number().nonnegative(),
    maxCoverage: z.number().min(0).max(1),
    treeSeedPerDay: z.number().min(0).max(1),
  }),
});

const foodWebSchema = z.object({
  edges: z.array(
    z.object({
      prey: z.string().min(1),
      predator: z.string().min(1),
      kind: z.enum(["grazes", "forages", "hunts"]),
    }),
  ),
});

const environmentSchema = z.object({
  temperatureC: z.number().min(0).max(40),
  rainfallMmPerDay: z.number().min(0).max(100),
  sunlightPercent: z.number().min(0).max(100),
  soilQuality: z.number().min(0).max(100),
  pollution: z.number().min(0).max(100),
  waterQuality: z.number().min(0).max(100),
});

/** Builds the game config from parsed JSON. Throws a readable error if a field is wrong. */
export function parseGameConfig(speciesJson: unknown, foodWebJson: unknown): GameConfig {
  const sp = speciesFileSchema.parse(speciesJson);
  const fw = foodWebSchema.parse(foodWebJson);

  const ids = new Set(sp.species.map((s) => s.id));
  if (ids.size !== sp.species.length) throw new Error("species.json: duplicate species id");
  for (const e of fw.edges) {
    if (!ids.has(e.predator) && e.predator !== "grass") {
      throw new Error(`food-web.json: unknown predator "${e.predator}"`);
    }
    if (!ids.has(e.prey) && e.prey !== "grass") {
      throw new Error(`food-web.json: unknown prey "${e.prey}"`);
    }
  }
  return {
    species: sp.species,
    foodWeb: fw.edges,
    plant: { ...sp.plant },
  };
}

/** Validates an environment state. Returns the input unchanged, or throws. */
export function parseEnvironment(json: unknown, hour = 0): EnvironmentState {
  const env = environmentSchema.parse(json);
  return { ...env, simulationHour: hour };
}
