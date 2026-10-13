import type { ControlKey, DayRecord, ExperimentRecord, GameConfig, MissionDef, MissionOutcome, WorldMap } from "@/types";
import { CONTROL_SPECS } from "@/simulation/controls";
import { Simulation } from "@/simulation/engine";
import { measureOn, missionDefaults } from "./mission";

/**
 * Text for the mission results screen (plan M4.8). Every sentence is built from the run's own
 * numbers, so changing the data changes the explanation. Nothing here is written by hand per mission.
 */

/** The state a run started from, measured on its starting snapshot (before any day ran). */
export interface StartMetrics {
  grassCoveragePercent: number;
  treeCount: number;
  forestCoverPercent: number;
  pollution: number;
  waterQuality: number;
  counts: Record<string, number>;
}

export interface RestorationRow {
  label: string;
  from: number;
  to: number;
  unit: string;
}

export interface InterventionRow {
  label: string;
  from: number;
  to: number;
  unit: string;
}

const round = (n: number) => Math.round(n);

/** Measures the starting snapshot by restoring it. Pure: the run itself is not changed. */
export function startMetrics(config: GameConfig, world: WorldMap, record: ExperimentRecord): StartMetrics {
  const sim = Simulation.restore(config, world, record.startingState);
  return {
    grassCoveragePercent: sim.grassCoveragePercent(),
    treeCount: sim.treeCount,
    forestCoverPercent: sim.forestCoveragePercent(),
    pollution: sim.environment.pollution,
    waterQuality: sim.environment.waterQuality,
    counts: sim.countBySpecies(),
  };
}

function lastDay(record: ExperimentRecord): DayRecord | undefined {
  return record.statistics[record.statistics.length - 1];
}

function totalAnimals(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

/** Settings the player changed from the mission's starting state (duration excluded). */
export function interventionRows(m: MissionDef, record: ExperimentRecord): InterventionRow[] {
  const defaults = missionDefaults(m);
  const rows: InterventionRow[] = [];
  for (const spec of CONTROL_SPECS) {
    if (spec.key === "durationDays") continue;
    const key = spec.key as ControlKey;
    const from = defaults[key];
    const to = record.settings[key];
    if (from !== to) rows.push({ label: spec.label, from, to, unit: spec.unit });
  }
  return rows;
}

/** Start and end values for the environment, and the species counts. */
export function restorationRows(
  record: ExperimentRecord,
  start: StartMetrics,
  config: GameConfig,
): { environment: RestorationRow[]; animals: RestorationRow[] } {
  const last = lastDay(record);
  if (!last) return { environment: [], animals: [] };
  const environment: RestorationRow[] = [
    { label: "Grass coverage", from: start.grassCoveragePercent, to: last.grassCoveragePercent, unit: "%" },
    { label: "Trees", from: start.treeCount, to: last.treeCount, unit: "" },
    { label: "Forest cover", from: start.forestCoverPercent, to: last.forestCoverPercent, unit: "%" },
    { label: "Pollution", from: start.pollution, to: last.env.pollution, unit: "/100" },
    { label: "Water quality", from: start.waterQuality, to: last.env.waterQuality, unit: "/100" },
  ];
  const name = (id: string) => config.species.find((s) => s.id === id)?.displayName ?? id;
  const animals: RestorationRow[] = config.species.map((s) => ({
    label: name(s.id),
    from: start.counts[s.id] ?? 0,
    to: last.counts[s.id] ?? 0,
    unit: "",
  }));
  animals.push({ label: "All animals", from: totalAnimals(start.counts), to: totalAnimals(last.counts), unit: "" });
  return { environment, animals };
}

/**
 * Sentences for the results screen. Each objective gets a line with its measured value and target.
 * Trends compare the start of the run with its last recorded day.
 */
export function explainOutcome(
  m: MissionDef,
  record: ExperimentRecord,
  outcome: MissionOutcome,
  start: StartMetrics,
  config: GameConfig,
): string[] {
  const lines: string[] = [];
  const last = lastDay(record);
  if (!last) return ["The run recorded no days, so there is nothing to explain."];

  for (const o of outcome.objectives) {
    const measured = Number.isFinite(o.measured) ? round(o.measured) : "n/a";
    const verb = o.passed ? "met" : "not met";
    lines.push(`${o.text}: measured ${measured}, ${verb}.`);
  }

  const grassChange = last.grassCoveragePercent - start.grassCoveragePercent;
  if (Math.abs(grassChange) >= 1) {
    lines.push(
      `Grass coverage ${grassChange > 0 ? "rose" : "fell"} from ${round(start.grassCoveragePercent)}% to ${round(last.grassCoveragePercent)}% over ${record.durationDays} days.`,
    );
  }

  const treeChange = last.treeCount - start.treeCount;
  if (treeChange !== 0) {
    lines.push(`Tree count ${treeChange > 0 ? "grew" : "shrank"} from ${start.treeCount} to ${last.treeCount}, which changes the forest cover.`);
  }

  const name = (id: string) => config.species.find((s) => s.id === id)?.displayName ?? id;
  for (const id of ["rabbit", "cow"]) {
    const a = start.counts[id] ?? 0;
    const b = last.counts[id] ?? 0;
    if (a === b) continue;
    const reason = grassChange >= 1 ? "more grass to eat" : grassChange <= -1 ? "less grass to eat" : "about the same grass";
    lines.push(`${name(id)} went from ${a} to ${b}, with ${reason}.`);
  }

  const extinct = Object.keys(start.counts).filter((id) => (last.counts[id] ?? 0) === 0 && (start.counts[id] ?? 0) > 0);
  if (extinct.length) lines.push(`These species died out during the run: ${extinct.map(name).join(", ")}.`);

  const pollutionChange = last.env.pollution - start.pollution;
  if (Math.abs(pollutionChange) >= 1) {
    lines.push(
      `Pollution ${pollutionChange < 0 ? "fell" : "rose"} from ${round(start.pollution)} to ${round(last.env.pollution)}; water quality went from ${round(start.waterQuality)} to ${round(last.env.waterQuality)}.`,
    );
  }

  if (outcome.problems.length) lines.push(`Submission problems: ${outcome.problems.join("; ")}.`);
  return lines;
}

/** Current value of one objective on the latest day, for the island HUD. */
export function currentObjectiveValue(day: DayRecord | undefined, o: MissionDef["objectives"][number]): number | null {
  return day ? measureOn(day, o) : null;
}
