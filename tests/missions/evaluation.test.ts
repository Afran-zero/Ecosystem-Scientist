import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateMission, missionDefaults, MIN_EVIDENCE_CHARS, parseMissions } from "@/missions/mission";
import { defaultSettings } from "@/simulation/controls";
import type { DayRecord, ExperimentRecord, MissionDef, SimulationSnapshot } from "@/types";

const meadow = (): MissionDef => ({
  id: "m1",
  title: "Test meadow",
  mapId: "mission-meadow",
  durationDays: 30,
  minDurationDays: 30,
  problem: "p",
  briefing: "b",
  allowedControls: ["rainfallMmPerDay", "sunlightPercent", "soilQuality", "rabbit", "cow", "durationDays"],
  start: {
    env: { temperatureC: 24, rainfallMmPerDay: 30, sunlightPercent: 70, soilQuality: 45, pollution: 20, waterQuality: 80 },
    grassPercent: { grassland: 25, meadow: 25, forest: 40, forest_edge: 60, pond_shore: 90 },
    populations: { rabbit: 24, cow: 12, chicken: 0, mouse: 0, fox: 4 },
  },
  objectives: [
    { id: "grass", text: "grass >= 60 at end", metric: "grassPercent", op: ">=", value: 60, timing: "atEnd" },
    { id: "rabbit", text: "rabbits never die out", metric: "speciesCount", species: "rabbit", op: ">=", value: 1, timing: "throughout" },
  ],
});

function day(d: number, grass: number, rabbits: number, extra: Partial<DayRecord> = {}): DayRecord {
  return {
    day: d,
    counts: { rabbit: rabbits, cow: 12, chicken: 0, mouse: 0, fox: 4 },
    births: {},
    deaths: {},
    huntsSucceeded: 0,
    grassCoveragePercent: grass,
    grassByRegion: { grassland: grass },
    treeCount: 18,
    forestCoverPercent: 0,
    env: { temperatureC: 24, rainfallMmPerDay: 30, sunlightPercent: 70, soilQuality: 45, pollution: 20, waterQuality: 80 },
    ...extra,
  };
}

function record(m: MissionDef, days: DayRecord[], over: Partial<ExperimentRecord> = {}): ExperimentRecord {
  const snap = {} as SimulationSnapshot;
  const settings = { ...missionDefaults(m), ...(over.settings ?? {}) };
  return {
    id: "r1",
    missionId: m.id,
    seed: 1,
    durationDays: days.length,
    settings,
    startingState: snap,
    interventions: [],
    finalState: snap,
    statistics: days,
    createdAt: "2026-10-12T00:00:00.000Z",
    ...over,
  };
}

const EVIDENCE = "Grass rose steadily once rainfall and sunlight were raised, and rabbits held up.";

describe("mission evaluation", () => {
  it("passes when every objective holds, the run is long enough, and evidence is written", () => {
    const m = meadow();
    const days = Array.from({ length: 30 }, (_, i) => day(i, 20 + i * 2, 20));
    const out = evaluateMission(m, record(m, days), EVIDENCE);
    expect(out.passed).toBe(true);
    expect(out.objectives.map((o) => o.passed)).toEqual([true, true]);
  });

  it("fails an atEnd objective on the last day, not on an earlier day", () => {
    const m = meadow();
    const days = Array.from({ length: 30 }, (_, i) => day(i, i < 29 ? 80 : 40, 20));
    const out = evaluateMission(m, record(m, days), EVIDENCE);
    expect(out.objectives[0].passed).toBe(false);
    expect(out.objectives[0].measured).toBe(40);
    expect(out.passed).toBe(false);
  });

  it("fails a throughout objective if the species dies out on any day", () => {
    const m = meadow();
    const days = Array.from({ length: 30 }, (_, i) => day(i, 80, i === 10 ? 0 : 20));
    const out = evaluateMission(m, record(m, days), EVIDENCE);
    expect(out.objectives[1].passed).toBe(false);
    expect(out.objectives[1].measured).toBe(0);
    expect(out.passed).toBe(false);
  });

  it("refuses a run shorter than the mission minimum", () => {
    const m = meadow();
    const days = Array.from({ length: 10 }, () => day(0, 80, 20));
    const out = evaluateMission(m, record(m, days), EVIDENCE);
    expect(out.durationOk).toBe(false);
    expect(out.passed).toBe(false);
    expect(out.problems.join(" ")).toMatch(/at least 30 days/);
  });

  it("requires a written explanation of at least the minimum length", () => {
    const m = meadow();
    const days = Array.from({ length: 30 }, () => day(0, 80, 20));
    expect(evaluateMission(m, record(m, days), "too short").evidenceOk).toBe(false);
    expect(evaluateMission(m, record(m, days), "x".repeat(MIN_EVIDENCE_CHARS)).evidenceOk).toBe(true);
    expect(evaluateMission(m, record(m, days), "   ").evidenceOk).toBe(false);
  });

  it("rejects a run that changes a control the mission locks", () => {
    const m = meadow();
    const days = Array.from({ length: 30 }, () => day(0, 80, 20));
    const out = evaluateMission(m, record(m, days, { settings: { ...missionDefaults(m), pollution: 0 } }), EVIDENCE);
    expect(out.settingsOk).toBe(false);
    expect(out.passed).toBe(false);
    expect(out.problems.join(" ")).toMatch(/pollution is locked/);
  });

  it("allows changing the controls the mission permits", () => {
    const m = meadow();
    const days = Array.from({ length: 30 }, () => day(0, 80, 20));
    const out = evaluateMission(m, record(m, days, { settings: { ...missionDefaults(m), sunlightPercent: 100 } }), EVIDENCE);
    expect(out.settingsOk).toBe(true);
  });

  it("the lab defaults for a mission equal its starting state", () => {
    const s = missionDefaults(meadow());
    expect(s.rainfallMmPerDay).toBe(30);
    expect(s.grassPercent).toBe(25);
    expect(s.rabbit).toBe(24);
    expect(s.fox).toBe(4);
    expect(s.durationDays).toBe(30);
    expect(s.temperatureC).toBe(defaultSettings().temperatureC);
  });
});

describe("shipped mission data", () => {
  const json = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/missions.json"), "utf-8"));
  const missions = parseMissions(json, ["hub", "mission-meadow", "mission-forest", "mission-pond"]);

  it("has exactly three missions with the spec's identities", () => {
    expect(missions.map((m) => m.id)).toEqual(["mission-meadow", "mission-forest", "mission-pond"]);
    expect(missions.map((m) => m.durationDays)).toEqual([30, 45, 30]);
  });

  it("starts the meadow with the spec's grass, animals, and trees", () => {
    const m = missions[0];
    expect(m.start.grassPercent.grassland).toBe(25);
    expect(m.start.populations).toMatchObject({ rabbit: 24, cow: 12, fox: 4 });
  });

  it("uses the spec's pond numbers", () => {
    const m = missions[2];
    expect(m.start.env.pollution).toBe(75);
    expect(m.start.env.waterQuality).toBe(25);
    expect(m.start.grassPercent.pond_shore).toBe(30);
  });

  it("rejects a mission that points at a map that does not exist", () => {
    const bad = structuredClone(json);
    bad.missions[0].mapId = "mission-nowhere";
    expect(() => parseMissions(bad, ["hub", "mission-meadow", "mission-forest", "mission-pond"])).toThrow(/unknown map/);
  });

  it("rejects a file that does not have exactly three missions", () => {
    const bad = structuredClone(json);
    bad.missions.pop();
    expect(() => parseMissions(bad, ["hub", "mission-meadow", "mission-forest", "mission-pond"])).toThrow();
  });
});
