import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { explainOutcome, interventionRows, restorationRows, startMetrics } from "@/missions/explain";
import { evaluateMission, missionDefaults, parseMissions } from "@/missions/mission";
import { runExperiment } from "@/simulation/experiments";
import { parseEnvironment } from "@/simulation/config";
import { parseWorldMap } from "@/simulation/world";
import type { ControlKey, MissionDef } from "@/types";
import { loadConfig } from "../helpers";

// Plan M4.8: the results text is built from the run's data, so changing the data changes the text.
const read = (rel: string) => JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf-8"));
const config = loadConfig();
const meadowMap = parseWorldMap(read("public/maps/mission-meadow.json"));
const mission: MissionDef = parseMissions(read("public/data/missions.json"), ["hub", "mission-meadow", "mission-forest", "mission-pond"]).find(
  (m) => m.id === "mission-meadow",
)!;
const EVIDENCE = "Reference run: the changed settings were tested over the full duration and compared with the default run.";

function run(overrides: Partial<Record<ControlKey, number>>, seed = 1) {
  const record = runExperiment({
    config,
    world: meadowMap,
    env: parseEnvironment(mission.start.env),
    settings: { ...missionDefaults(mission), ...overrides },
    seed,
    baseGrassPercent: mission.start.grassPercent,
  });
  const outcome = evaluateMission(mission, record, EVIDENCE);
  const start = startMetrics(config, meadowMap, record);
  return { record, outcome, start };
}

describe("mission results text (plan M4.8)", () => {
  it("states every objective with its measured value and verdict", () => {
    const { record, outcome, start } = run({ rainfallMmPerDay: 90, sunlightPercent: 100, soilQuality: 100, rabbit: 16, cow: 3 });
    const lines = explainOutcome(mission, record, outcome, start, config);
    for (const o of outcome.objectives) {
      expect(lines.some((l) => l.startsWith(o.text) && l.includes(o.passed ? "met." : "not met."))).toBe(true);
    }
  });

  it("measures the start from the starting snapshot, so it does not depend on the run length", () => {
    const longRun = run({ durationDays: 30 });
    const shortRun = run({ durationDays: 2 });
    expect(longRun.start.grassCoveragePercent).toBeCloseTo(shortRun.start.grassCoveragePercent, 9);
    expect(longRun.start.treeCount).toBe(shortRun.start.treeCount);
    expect(longRun.start.grassCoveragePercent).toBeGreaterThan(0);
    expect(longRun.start.grassCoveragePercent).toBeLessThan(100);
  });

  it("reports the grass trend from the start to the last recorded day", () => {
    const { record, outcome, start } = run({ rainfallMmPerDay: 90, sunlightPercent: 100, soilQuality: 100 });
    const lines = explainOutcome(mission, record, outcome, start, config);
    const last = record.statistics[record.statistics.length - 1].grassCoveragePercent;
    expect(last).toBeGreaterThan(start.grassCoveragePercent);
    expect(lines.join(" ")).toContain("Grass coverage rose from");
  });

  it("changes when the data changes, not from fixed text", () => {
    const good = run({ rainfallMmPerDay: 90, sunlightPercent: 100, soilQuality: 100, rabbit: 16, cow: 3 });
    const poor = run({ rainfallMmPerDay: 0, sunlightPercent: 0, soilQuality: 0 });
    const a = explainOutcome(mission, good.record, good.outcome, good.start, config).join("\n");
    const b = explainOutcome(mission, poor.record, poor.outcome, poor.start, config).join("\n");
    expect(a).not.toEqual(b);
  });

  it("lists only the settings the player changed from the mission start", () => {
    const { record } = run({ rainfallMmPerDay: 90, rabbit: 16 });
    const rows = interventionRows(mission, record);
    expect(rows.map((r) => r.label).sort()).toEqual(["Rabbits", "Rainfall"].sort());
    expect(interventionRows(mission, run({}).record)).toEqual([]);
  });

  it("produces start and end rows for the restoration summary, named from the species data", () => {
    const { record, start } = run({});
    const { environment, animals } = restorationRows(record, start, config);
    expect(environment.map((r) => r.label)).toContain("Grass coverage");
    expect(animals.map((r) => r.label)).toEqual([...config.species.map((s) => s.displayName), "All animals"]);
  });
});
