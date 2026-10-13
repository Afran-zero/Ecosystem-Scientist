import { z } from "zod";

/**
 * Save-file schema (spec section 9). Every field the game persists is listed here, and anything
 * else is dropped on load. A save that fails this check goes to the recovery screen.
 */

const num = z.number().finite();

const animalSchema = z.object({
  id: z.string().min(1),
  speciesId: z.string().min(1),
  x: num,
  y: num,
  ageHours: num.min(0),
  health: num.min(0).max(100),
  energy: num.min(0).max(100),
  hunger: num.min(0).max(100),
  state: z.enum(["idle", "wander", "searchFood", "eat", "hunt", "flee", "rest", "reproduce", "dead"]),
  targetId: z.string().optional(),
  reproductionCooldownHours: num.min(0),
  alive: z.boolean(),
  heading: num,
});

const envSchema = z.object({
  temperatureC: num,
  rainfallMmPerDay: num,
  sunlightPercent: num,
  soilQuality: num,
  pollution: num,
  waterQuality: num,
  simulationHour: num,
});

const envRecordSchema = envSchema.omit({ simulationHour: true });

const dayRecordSchema = z.object({
  day: num,
  counts: z.record(z.string(), num),
  births: z.record(z.string(), num),
  deaths: z.record(z.string(), num),
  huntsSucceeded: num,
  grassCoveragePercent: num,
  grassByRegion: z.record(z.string(), num),
  treeCount: num,
  forestCoverPercent: num,
  env: envRecordSchema,
});

export const snapshotSchema = z.object({
  version: z.literal(1),
  seed: num,
  rngState: num,
  hour: num,
  env: envSchema,
  grass: z.record(z.string(), num),
  trees: z.array(z.object({ x: num, y: num })),
  animals: z.array(animalSchema),
  nextId: num,
  days: z.array(dayRecordSchema),
});

const settingsSchema = z.object({
  temperatureC: num,
  rainfallMmPerDay: num,
  sunlightPercent: num,
  soilQuality: num,
  pollution: num,
  grassPercent: num,
  rabbit: num,
  cow: num,
  chicken: num,
  mouse: num,
  fox: num,
  durationDays: num,
});

export const experimentSchema = z.object({
  id: z.string().min(1),
  missionId: z.string().min(1),
  seed: num,
  durationDays: num,
  settings: settingsSchema,
  startingState: snapshotSchema,
  interventions: z.array(z.string()),
  finalState: snapshotSchema,
  statistics: z.array(dayRecordSchema),
  createdAt: z.string(),
  role: z.enum(["control", "experiment"]).optional(),
  label: z.string().optional(),
});

const objectiveResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  timing: z.enum(["atEnd", "throughout"]),
  measured: z.number(),
  target: z.number(),
  op: z.enum([">=", "<="]),
  passed: z.boolean(),
});

const outcomeSchema = z.object({
  passed: z.boolean(),
  objectives: z.array(objectiveResultSchema),
  durationOk: z.boolean(),
  evidenceOk: z.boolean(),
  settingsOk: z.boolean(),
  problems: z.array(z.string()),
});

export const submissionSchema = z.object({
  id: z.string().min(1),
  missionId: z.string().min(1),
  recordId: z.string().min(1),
  evidence: z.string(),
  outcome: outcomeSchema,
  createdAt: z.string(),
});

export const progressSchema = z.object({
  missions: z.record(
    z.string(),
    z.object({
      status: z.enum(["not-started", "in-progress", "completed"]),
      submissions: z.array(submissionSchema),
    }),
  ),
  experiments: z.array(experimentSchema),
  journal: z.object({
    discovered: z.array(z.string()),
    observations: z.array(
      z.object({
        id: z.string(),
        speciesId: z.string(),
        mapId: z.string(),
        day: num,
        text: z.string(),
      }),
    ),
  }),
  labSettings: settingsSchema,
});

export const saveFileSchema = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string(),
  progress: progressSchema,
  live: z.object({
    mapId: z.string().min(1),
    missionId: z.string().nullable(),
    snapshots: z.record(z.string(), snapshotSchema),
    player: z.object({ x: num, y: num }).nullable(),
  }),
});

export type SaveFileData = z.infer<typeof saveFileSchema>;
