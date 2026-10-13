import { describe, expect, it } from "vitest";
import { CONTROL_SPECS, defaultSettings, validateSettings } from "@/simulation/controls";
import { Simulation } from "@/simulation/engine";
import { buildRun, compareRuns, runExperiment } from "@/simulation/experiments";
import type { ControlKey, ExperimentSettings } from "@/types";
import { HUB_GRASS_START, loadConfig, loadHubEnvironment, loadHubWorld } from "../helpers";

const config = loadConfig();
const world = loadHubWorld();
const env = loadHubEnvironment();
const speciesIds = config.species.map((s) => s.id);

function input(settings: ExperimentSettings, seed = 7) {
  return { config, world, env, settings, seed, baseGrassPercent: HUB_GRASS_START };
}

describe("laboratory controls (spec 4.2)", () => {
  it("defaults are valid", () => {
    expect(validateSettings(defaultSettings())).toEqual({ ok: true });
  });

  it("rejects values outside the allowed range, without changing them", () => {
    const s = defaultSettings();
    const bad = { ...s, temperatureC: 55, fox: 31, durationDays: 0 };
    const result = validateSettings(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["durationDays", "fox", "temperatureC"]);
    }
    expect(bad.temperatureC).toBe(55);
  });

  it("rejects NaN, infinity, and non-numbers", () => {
    const s = { ...defaultSettings(), rabbit: Number.NaN, cow: Infinity, chicken: "12" as unknown as number };
    const result = validateSettings(s);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["chicken", "cow", "rabbit"]);
  });

  it("rejects fractional animal counts", () => {
    const result = validateSettings({ ...defaultSettings(), rabbit: 10.5 });
    expect(result.ok).toBe(false);
  });

  it("has exactly the twelve controls in the spec's table", () => {
    const keys = CONTROL_SPECS.map((c) => c.key).sort();
    expect(keys).toEqual(
      [
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
      ].sort(),
    );
  });

  // Every control must change something the simulation reads (spec 4.2: no inert sliders).
  const effects: Record<ControlKey, (s: Simulation) => number> = {
    temperatureC: (s) => s.environment.temperatureC,
    rainfallMmPerDay: (s) => s.environment.rainfallMmPerDay,
    sunlightPercent: (s) => s.environment.sunlightPercent,
    soilQuality: (s) => s.environment.soilQuality,
    pollution: (s) => s.environment.pollution,
    grassPercent: (s) => s.grassCoverage.grassland * 100,
    rabbit: (s) => s.countBySpecies().rabbit,
    cow: (s) => s.countBySpecies().cow,
    chicken: (s) => s.countBySpecies().chicken,
    mouse: (s) => s.countBySpecies().mouse,
    fox: (s) => s.countBySpecies().fox,
    durationDays: () => 0,
  };

  for (const spec of CONTROL_SPECS) {
    if (spec.key === "durationDays") continue; // duration is read by runExperiment, tested below
    it(`changing ${spec.key} changes the starting run`, () => {
      const base = defaultSettings();
      const altValue = spec.key === "temperatureC" ? 30 : Math.max(spec.min, spec.defaultValue - 10);
      const alt = { ...base, [spec.key]: altValue } as ExperimentSettings;
      const read = effects[spec.key];
      expect(read(buildRun(input(alt)))).not.toBe(read(buildRun(input(base))));
    });
  }

  it("duration changes how many days an experiment runs", () => {
    const short = runExperiment(input({ ...defaultSettings(), durationDays: 2 }));
    const longer = runExperiment(input({ ...defaultSettings(), durationDays: 5 }));
    expect(short.statistics.length).toBe(2);
    expect(longer.statistics.length).toBe(5);
  });
});

describe("experiment runs", () => {
  it("the same settings and seed give the same record", () => {
    const s = { ...defaultSettings(), durationDays: 10 };
    const a = runExperiment(input(s));
    const b = runExperiment(input(s));
    expect(b.finalState).toEqual(a.finalState);
    expect(b.startingState).toEqual(a.startingState);
  });

  it("the record stores the settings, seed, and starting state needed to reproduce it", () => {
    const s = { ...defaultSettings(), durationDays: 3 };
    const rec = runExperiment(input(s, 99));
    expect(rec.seed).toBe(99);
    expect(rec.settings).toEqual(s);
    expect(rec.startingState.hour).toBe(0);
    expect(rec.startingState.animals.length).toBeGreaterThan(0);
    expect(rec.statistics).toEqual(rec.finalState.days);
  });

  it("reproduces a stored starting state exactly", () => {
    const s = { ...defaultSettings(), durationDays: 4 };
    const rec = runExperiment(input(s, 5));
    // Restoring the stored start and running the same days must give the same end state.
    const sim = Simulation.restore(config, world, structuredClone(rec.startingState));
    sim.runDays(4);
    expect(sim.snapshot()).toEqual(rec.finalState);
  });

  it("does not modify the settings it was given", () => {
    const s = { ...defaultSettings(), durationDays: 3 };
    const copy = { ...s };
    runExperiment(input(s));
    expect(s).toEqual(copy);
  });

  it("refuses invalid settings and starts nothing", () => {
    expect(() => buildRun(input({ ...defaultSettings(), pollution: 150 }))).toThrow(/Pollution/);
  });
});

describe("baseline comparison", () => {
  it("reports the count and grass difference on the last shared day", () => {
    const base = runExperiment(input({ ...defaultSettings(), durationDays: 10 }));
    const exp = runExperiment(input({ ...defaultSettings(), durationDays: 10, rabbit: 0 }));
    const cmp = compareRuns(base, exp, speciesIds);
    expect(cmp.days).toBe(10);
    expect(cmp.countDelta.rabbit).toBe(exp.statistics[9].counts.rabbit - base.statistics[9].counts.rabbit);
  });

  it("flags a species that died out in the experiment but not in the baseline", () => {
    const base = runExperiment(input({ ...defaultSettings(), durationDays: 3 }));
    const exp = runExperiment(input({ ...defaultSettings(), durationDays: 3, rabbit: 0, fox: 0 }));
    const cmp = compareRuns(base, exp, speciesIds);
    expect(cmp.extinctInExperiment).toContain("rabbit");
  });
});
