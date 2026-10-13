import { describe, expect, it } from "vitest";
import { Simulation } from "@/simulation/engine";
import { checkInvariants } from "@/simulation/invariants";
import { HUB_GRASS_START, loadConfig, loadHubEnvironment, loadHubWorld } from "../helpers";

const config = loadConfig();
const world = loadHubWorld();
const env = loadHubEnvironment();
const startingPopulation = Object.fromEntries(config.species.map((s) => [s.id, s.startingPopulationHub]));

function newRun(seed: number): Simulation {
  return Simulation.create({ config, world, env, seed, grassStartPercent: HUB_GRASS_START, startingPopulation });
}

describe("engine: determinism (spec 5.8)", () => {
  it("the same seed gives the same final snapshot", () => {
    const a = newRun(11);
    const b = newRun(11);
    a.runDays(10);
    b.runDays(10);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it("a different seed gives a different run", () => {
    const a = newRun(11);
    const b = newRun(12);
    a.runDays(5);
    b.runDays(5);
    expect(a.snapshot().animals).not.toEqual(b.snapshot().animals);
  });

  it("restoring a snapshot continues exactly like the original run", () => {
    const original = newRun(5);
    original.runDays(4);
    const saved = original.snapshot();

    const copy = Simulation.restore(config, world, structuredClone(saved));
    original.runDays(6);
    copy.runDays(6);
    expect(copy.snapshot()).toEqual(original.snapshot());
  });

  it("step batching does not change the result", () => {
    const a = newRun(9);
    const b = newRun(9);
    a.runHours(100);
    for (let i = 0; i < 100; i++) b.step();
    expect(a.snapshot()).toEqual(b.snapshot());
  });
});

describe("engine: invariants hold every step (spec 5.8)", () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}: 30 days, checked every hour`, () => {
      const sim = newRun(seed);
      for (let h = 0; h < 30 * 24; h++) {
        sim.step();
        const problems = checkInvariants(sim.snapshot(), config, world);
        if (problems.length) throw new Error(`hour ${h}: ${problems.slice(0, 3).join("; ")}`);
      }
    });
  }
});

describe("engine: feeding and hunting rules", () => {
  it("never lets a predator eat a prey twice", () => {
    const sim = newRun(21);
    sim.runDays(20);
    const snap = sim.snapshot();
    const ids = snap.animals.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("grass never goes below zero or above the cap", () => {
    const sim = newRun(4);
    for (let h = 0; h < 15 * 24; h++) {
      sim.step();
      for (const v of Object.values(sim.grassCoverage)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(config.plant.maxCoverage);
      }
    }
  });

  it("no species exceeds its population cap over 60 days", () => {
    const sim = newRun(8);
    sim.runDays(60);
    for (const sp of config.species) {
      const n = sim.countBySpecies()[sp.id];
      expect(n).toBeLessThanOrEqual(sp.maxPopulation);
    }
  });

  it("animals stay on walkable tiles", () => {
    const sim = newRun(31);
    sim.runDays(10);
    expect(checkInvariants(sim.snapshot(), config, world)).toEqual([]);
  });
});

describe("engine: statistics", () => {
  it("writes one day record per simulated day and the counts agree with the live state", () => {
    const sim = newRun(2);
    sim.runDays(7);
    expect(sim.dayRecords.length).toBe(7);
    const last = sim.dayRecords[sim.dayRecords.length - 1];
    expect(last.counts).toEqual(sim.countBySpecies());
    expect(last.grassCoveragePercent).toBeCloseTo(sim.grassCoveragePercent(), 9);
  });
});
