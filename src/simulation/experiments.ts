import type { EnvironmentState, ExperimentRecord, ExperimentSettings, GameConfig, WorldMap } from "@/types";
import { Simulation } from "./engine";
import { validateSettings } from "./controls";

/** Regions whose grass is set by the "grassPercent" control. Forest keeps its own starting value. */
const GRASS_CONTROLLED_REGIONS = ["grassland", "meadow"];

export interface RunInput {
  config: GameConfig;
  world: WorldMap;
  /** Hub baseline environment. The experiment's settings override the controlled fields. */
  env: EnvironmentState;
  settings: ExperimentSettings;
  seed: number;
  /** Starting grass per region for regions that the control does not set. */
  baseGrassPercent: Record<string, number>;
  id?: string;
  createdAt?: string;
}

/** Builds a fresh run from settings. Pure: it touches no shared state. */
export function buildRun(input: RunInput): Simulation {
  const { config, world, settings } = input;
  const check = validateSettings(settings);
  if (!check.ok) {
    throw new Error(`invalid experiment settings: ${Object.values(check.errors).join("; ")}`);
  }

  const env: EnvironmentState = {
    ...input.env,
    temperatureC: settings.temperatureC,
    rainfallMmPerDay: settings.rainfallMmPerDay,
    sunlightPercent: settings.sunlightPercent,
    soilQuality: settings.soilQuality,
    pollution: settings.pollution,
    simulationHour: 0,
  };

  const grassStartPercent: Record<string, number> = { ...input.baseGrassPercent };
  for (const name of GRASS_CONTROLLED_REGIONS) grassStartPercent[name] = settings.grassPercent;

  const startingPopulation: Record<string, number> = {};
  for (const sp of config.species) {
    startingPopulation[sp.id] = (settings as unknown as Record<string, number>)[sp.id] ?? 0;
  }

  return Simulation.create({ config, world, env, seed: input.seed, grassStartPercent, startingPopulation });
}

/** Runs an experiment for its full duration and returns the record the lab stores. */
export function runExperiment(input: RunInput): ExperimentRecord {
  const sim = buildRun(input);
  const startingState = sim.snapshot();
  sim.runDays(input.settings.durationDays);
  const finalState = sim.snapshot();
  return {
    id: input.id ?? `exp-${input.seed}-${input.settings.durationDays}`,
    missionId: "sandbox",
    seed: input.seed,
    durationDays: input.settings.durationDays,
    settings: { ...input.settings },
    startingState,
    interventions: [],
    finalState,
    statistics: finalState.days,
    createdAt: input.createdAt ?? new Date(0).toISOString(),
  };
}

/** Difference between an experimental run and its baseline, on the last day both have. */
export interface Comparison {
  days: number;
  countDelta: Record<string, number>;
  grassDeltaPercent: number;
  extinctInExperiment: string[];
}

export function compareRuns(baseline: ExperimentRecord, experiment: ExperimentRecord, speciesIds: string[]): Comparison {
  const days = Math.min(baseline.statistics.length, experiment.statistics.length);
  const b = baseline.statistics[days - 1];
  const e = experiment.statistics[days - 1];
  const countDelta: Record<string, number> = {};
  const extinctInExperiment: string[] = [];
  for (const id of speciesIds) {
    const bc = b?.counts[id] ?? 0;
    const ec = e?.counts[id] ?? 0;
    countDelta[id] = ec - bc;
    if (ec === 0 && bc > 0) extinctInExperiment.push(id);
  }
  return {
    days,
    countDelta,
    grassDeltaPercent: (e?.grassCoveragePercent ?? 0) - (b?.grassCoveragePercent ?? 0),
    extinctInExperiment,
  };
}
