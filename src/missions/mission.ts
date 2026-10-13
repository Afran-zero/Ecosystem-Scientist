import { z } from "zod";
import type { ControlKey, ExperimentSettings, MissionDef, MissionObjective, ObjectiveResult, MissionOutcome, ExperimentRecord, DayRecord } from "@/types";
import { defaultSettings, validateSettings } from "@/simulation/controls";

/**
 * Mission data, validation, and evaluation (spec section 6, shared rules).
 * Completion is calculated from explicit criteria on the record. No button sets it.
 */

/** Minimum length of the explanation a player writes for a submission. */
export const MIN_EVIDENCE_CHARS = 30;

const objectiveSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  metric: z.enum([
    "grassPercent",
    "grassRegionPercent",
    "speciesCount",
    "speciesPresentCount",
    "treeCount",
    "forestCoverPercent",
    "pollution",
    "waterQuality",
  ]),
  op: z.enum([">=", "<="]),
  value: z.number(),
  timing: z.enum(["atEnd", "throughout"]),
  species: z.string().optional(),
  region: z.string().optional(),
});

const missionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  mapId: z.string().min(1),
  durationDays: z.number().int().min(1).max(90),
  minDurationDays: z.number().int().min(1).max(90),
  problem: z.string().min(1),
  briefing: z.string().min(1),
  allowedControls: z.array(z.string()),
  start: z.object({
    env: z.object({
      temperatureC: z.number().min(0).max(40),
      rainfallMmPerDay: z.number().min(0).max(100),
      sunlightPercent: z.number().min(0).max(100),
      soilQuality: z.number().min(0).max(100),
      pollution: z.number().min(0).max(100),
      waterQuality: z.number().min(0).max(100),
    }),
    grassPercent: z.record(z.string(), z.number().min(0).max(100)),
    populations: z.record(z.string(), z.number().int().min(0)),
  }),
  objectives: z.array(objectiveSchema).min(1),
});

const missionFileSchema = z.object({ missions: z.array(missionSchema).length(3) });

/** Parses missions.json. There must be exactly three missions with unique ids (spec 6). */
export function parseMissions(json: unknown, knownMapIds: string[]): MissionDef[] {
  const parsed = missionFileSchema.parse(json);
  const ids = new Set(parsed.missions.map((m) => m.id));
  if (ids.size !== parsed.missions.length) throw new Error("missions.json: duplicate mission id");
  for (const m of parsed.missions) {
    if (!knownMapIds.includes(m.mapId)) throw new Error(`missions.json: ${m.id} uses unknown map ${m.mapId}`);
    if (m.minDurationDays > m.durationDays) throw new Error(`missions.json: ${m.id} minimum days exceed its duration`);
    for (const c of m.allowedControls) {
      if (!CONTROL_KEYS.includes(c as ControlKey)) throw new Error(`missions.json: ${m.id} allows unknown control ${c}`);
    }
  }
  return parsed.missions as MissionDef[];
}

const CONTROL_KEYS: ControlKey[] = [
  "temperatureC",
  "rainfallMmPerDay",
  "sunlightPercent",
  "soilQuality",
  "pollution",
  "grassPercent",
  "rabbit",
  "cow",
  "chicken",
  "mouse",
  "fox",
  "durationDays",
];

/** The lab's settings at the start of a mission: its starting state, and its duration. */
export function missionDefaults(m: MissionDef): ExperimentSettings {
  const base = defaultSettings();
  return {
    ...base,
    temperatureC: m.start.env.temperatureC,
    rainfallMmPerDay: m.start.env.rainfallMmPerDay,
    sunlightPercent: m.start.env.sunlightPercent,
    soilQuality: m.start.env.soilQuality,
    pollution: m.start.env.pollution,
    grassPercent: m.start.grassPercent.grassland ?? base.grassPercent,
    rabbit: m.start.populations.rabbit ?? 0,
    cow: m.start.populations.cow ?? 0,
    chicken: m.start.populations.chicken ?? 0,
    mouse: m.start.populations.mouse ?? 0,
    fox: m.start.populations.fox ?? 0,
    durationDays: m.durationDays,
  };
}

/** Value of one metric on one day. */
export function measureOn(day: DayRecord, o: MissionObjective): number {
  switch (o.metric) {
    case "grassPercent":
      return day.grassCoveragePercent;
    case "grassRegionPercent":
      return day.grassByRegion[o.region ?? ""] ?? 0;
    case "speciesCount":
      return day.counts[o.species ?? ""] ?? 0;
    case "speciesPresentCount":
      return Object.values(day.counts).filter((n) => n > 0).length;
    case "treeCount":
      return day.treeCount;
    case "forestCoverPercent":
      return day.forestCoverPercent;
    case "pollution":
      return day.env.pollution;
    case "waterQuality":
      return day.env.waterQuality;
  }
}

function holds(op: ">=" | "<=", measured: number, target: number): boolean {
  return op === ">=" ? measured >= target : measured <= target;
}

function evaluateObjective(o: MissionObjective, days: DayRecord[]): ObjectiveResult {
  if (days.length === 0) {
    return { id: o.id, text: o.text, timing: o.timing, measured: NaN, target: o.value, op: o.op, passed: false };
  }
  if (o.timing === "atEnd") {
    const measured = measureOn(days[days.length - 1], o);
    return { id: o.id, text: o.text, timing: o.timing, measured, target: o.value, op: o.op, passed: holds(o.op, measured, o.value) };
  }
  // throughout: the worst value over the run decides it
  const values = days.map((d) => measureOn(d, o));
  const worst = o.op === ">=" ? Math.min(...values) : Math.max(...values);
  const passed = values.every((v) => holds(o.op, v, o.value));
  return { id: o.id, text: o.text, timing: o.timing, measured: worst, target: o.value, op: o.op, passed };
}

/**
 * Evaluates a mission on an experiment record. The record must come from a run of this mission,
 * so its settings must match the mission's locked controls and its duration must be long enough.
 */
export function evaluateMission(m: MissionDef, record: ExperimentRecord, evidence: string): MissionOutcome {
  const problems: string[] = [];

  const check = validateSettings(record.settings);
  if (!check.ok) problems.push(...Object.values(check.errors));

  const defaults = missionDefaults(m);
  const locked = (Object.keys(defaults) as ControlKey[]).filter((k) => !m.allowedControls.includes(k) && k !== "durationDays");
  const lockedChanged = locked.filter((k) => record.settings[k] !== defaults[k]);
  for (const k of lockedChanged) problems.push(`${k} is locked for this mission`);
  const settingsOk = check.ok && lockedChanged.length === 0;

  const durationOk = record.durationDays >= m.minDurationDays;
  if (!durationOk) problems.push(`run must last at least ${m.minDurationDays} days`);

  const evidenceOk = evidence.trim().length >= MIN_EVIDENCE_CHARS;
  if (!evidenceOk) problems.push(`write at least ${MIN_EVIDENCE_CHARS} characters explaining what you saw`);

  const objectives = m.objectives.map((o) => evaluateObjective(o, record.statistics));
  const objectivesPassed = objectives.every((o) => o.passed);

  return {
    passed: objectivesPassed && durationOk && evidenceOk && settingsOk,
    objectives,
    durationOk,
    evidenceOk,
    settingsOk,
    problems,
  };
}
