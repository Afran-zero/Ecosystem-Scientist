import { describe, expect, it } from "vitest";
import { readSave, type StorageLike } from "@/persistence/save";
import { saveProgress, loadProgress, MAX_SAVED_RUNS } from "@/persistence/progress";
import { defaultSettings } from "@/simulation/controls";
import { livabilityIndex } from "@/simulation/livability";
import { buildRun, projectRun, runExperiment } from "@/simulation/experiments";
import { parseEnvironment } from "@/simulation/config";
import type { DayRecord, ExperimentRecord } from "@/types";
import { HUB_GRASS_START, loadConfig, loadHubEnvironment, loadHubWorld } from "../helpers";

// The lab's claims, checked against the engine: predators eat prey, animals are born, the live
// preview is the same run as an experiment, the livability index means what it says, and runs
// survive in storage (and the oldest are dropped first when storage is full).
const config = loadConfig();
const world = loadHubWorld();
const env = parseEnvironment(loadHubEnvironment());
const settings = { ...defaultSettings(), durationDays: 60 };
const input = { config, world, env, settings, seed: 2026, baseGrassPercent: HUB_GRASS_START };
const sumRecord = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe("predation and births (the chain)", () => {
  const sim = buildRun(input);
  sim.runDays(60);
  const days = sim.dayRecords;

  it("predators eat prey: prey eaten is recorded every day, and never more than deaths", () => {
    for (const d of days) {
      for (const [id, eaten] of Object.entries(d.eaten)) {
        expect(eaten, `${id} eaten on day ${d.day}`).toBeLessThanOrEqual(d.deaths[id] ?? 0);
      }
    }
    const eatenTotal = days.reduce((a, d) => a + sumRecord(d.eaten), 0);
    expect(eatenTotal).toBeGreaterThan(0);
    expect(eatenTotal).toBe(days.reduce((a, d) => a + d.huntsSucceeded, 0));
  });

  it("animals are born: births are recorded and rabbits reproduce", () => {
    const births = days.reduce((a, d) => a + sumRecord(d.births), 0);
    expect(births).toBeGreaterThan(0);
    expect(days.reduce((a, d) => a + (d.births.rabbit ?? 0), 0)).toBeGreaterThan(0);
  });
});

describe("livability index", () => {
  const base: DayRecord = {
    day: 0,
    counts: { rabbit: 5, fox: 2 },
    births: {},
    deaths: {},
    eaten: {},
    huntsSucceeded: 0,
    grassCoveragePercent: 100,
    grassByRegion: {},
    treeCount: 0,
    forestCoverPercent: 0,
    env: { temperatureC: 20, rainfallMmPerDay: 40, sunlightPercent: 70, soilQuality: 70, pollution: 0, waterQuality: 100 },
  };

  it("is 100 when grass is full, water is clean, there is no pollution and every species is present", () => {
    expect(livabilityIndex(base, 2)).toBe(100);
  });

  it("falls when a species is gone, grass is bare, or pollution rises", () => {
    expect(livabilityIndex({ ...base, counts: { rabbit: 5, fox: 0 } }, 2)).toBeLessThan(100);
    expect(livabilityIndex({ ...base, grassCoveragePercent: 0 }, 2)).toBeLessThan(livabilityIndex(base, 2));
    expect(livabilityIndex({ ...base, env: { ...base.env, pollution: 80 } }, 2)).toBeLessThan(livabilityIndex(base, 2));
  });

  it("stays between 0 and 100", () => {
    const worst = livabilityIndex({ ...base, grassCoveragePercent: 0, counts: {}, env: { ...base.env, pollution: 100, waterQuality: 0 } }, 2);
    expect(worst).toBeGreaterThanOrEqual(0);
    expect(worst).toBeLessThanOrEqual(100);
  });
});

describe("live preview and experiments agree", () => {
  it("projectRun gives exactly the day records of runExperiment for the same settings and seed", () => {
    const preview = projectRun(input, 20);
    const record: ExperimentRecord = runExperiment({ ...input, settings: { ...settings, durationDays: 20 } });
    expect(JSON.stringify(preview)).toBe(JSON.stringify(record.statistics));
  });
});

describe("saved runs in browser storage", () => {
  function memoryStorage(limitChars = Infinity): StorageLike & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        if (v.length > limitChars) throw new Error("QuotaExceededError");
        data.set(k, v);
      },
      removeItem: (k) => data.delete(k),
    };
  }
  const run = (id: string, days: number): ExperimentRecord => ({
    ...runExperiment({ ...input, settings: { ...settings, durationDays: days }, id }),
    role: "experiment",
  });

  it("keeps runs and the hub base across a reload", () => {
    const storage = memoryStorage();
    const kept = saveProgress({ missions: {}, journal: { discovered: [], observations: [] }, experiments: [run("a", 3)], hubBase: { ...settings, rabbit: 9 } }, storage);
    expect(kept).toBe(1);
    const result = readSave(storage);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.progress.experiments.map((r) => r.id)).toEqual(["a"]);
    expect(result.data.progress.hubBase?.rabbit).toBe(9);
    const loaded = loadProgress(storage);
    expect(loaded.experiments[0].statistics.length).toBe(3);
  });

  it("keeps at most the newest runs, and drops the oldest first when storage is full", () => {
    const many = Array.from({ length: MAX_SAVED_RUNS + 3 }, (_, i) => run(`r${i}`, 2));
    const storage = memoryStorage();
    const kept = saveProgress({ missions: {}, journal: { discovered: [], observations: [] }, experiments: many, hubBase: null }, storage);
    expect(kept).toBe(MAX_SAVED_RUNS);
    expect(loadProgress(storage).experiments.at(-1)?.id).toBe(`r${MAX_SAVED_RUNS + 2}`);

    const small = memoryStorage(20000);
    const keptSmall = saveProgress({ missions: {}, journal: { discovered: [], observations: [] }, experiments: many, hubBase: null }, small);
    expect(keptSmall).toBeLessThan(MAX_SAVED_RUNS);
    expect(keptSmall).toBeGreaterThanOrEqual(0);
  });
});
