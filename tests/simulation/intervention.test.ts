import { describe, expect, it } from "vitest";
import { Simulation } from "@/simulation/engine";
import { checkInvariants } from "@/simulation/invariants";
import { isBlocked } from "@/simulation/world";
import { HUB_GRASS_START, loadConfig, loadHubEnvironment, loadHubWorld } from "../helpers";

// Plan M3.4: a live intervention changes the running island, and only when it is valid.
const config = loadConfig();
const world = loadHubWorld();

function fresh() {
  return Simulation.create({
    config,
    world,
    env: loadHubEnvironment(),
    seed: 7,
    grassStartPercent: HUB_GRASS_START,
    startingPopulation: Object.fromEntries(config.species.map((s) => [s.id, s.startingPopulationHub])),
  });
}

const liveOf = (sim: Simulation, id: string) => sim.liveAnimals.filter((a) => a.speciesId === id).length;

describe("live intervention (plan M3.4)", () => {
  it("applies environment changes to the running island", () => {
    const sim = fresh();
    sim.runDays(1);
    sim.intervene({ env: { rainfallMmPerDay: 80, pollution: 5 } });
    expect(sim.environment.rainfallMmPerDay).toBe(80);
    expect(sim.environment.pollution).toBe(5);
    expect(checkInvariants(sim.snapshot(), config, world)).toEqual([]);
  });

  it("rejects an out-of-range value and changes nothing", () => {
    const sim = fresh();
    const before = JSON.stringify(sim.snapshot());
    expect(() => sim.intervene({ env: { sunlightPercent: 150 } })).toThrow(/between 0 and 100/);
    expect(() => sim.intervene({ population: { rabbit: 1.5 } })).toThrow(/whole number/);
    expect(() => sim.intervene({ population: { fox: 999 } })).toThrow(/whole number/);
    expect(JSON.stringify(sim.snapshot())).toBe(before);
  });

  it("raises a population to the target, on walkable ground, with unique ids", () => {
    const sim = fresh();
    const before = liveOf(sim, "rabbit");
    sim.intervene({ population: { rabbit: before + 6 } });
    expect(liveOf(sim, "rabbit")).toBe(before + 6);
    const ids = sim.liveAnimals.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of sim.liveAnimals.filter((x) => x.speciesId === "rabbit")) {
      expect(isBlocked(world, a.x, a.y)).toBe(false);
    }
    expect(checkInvariants(sim.snapshot(), config, world)).toEqual([]);
  });

  it("lowers a population by removing the most recent animals", () => {
    const sim = fresh();
    sim.intervene({ population: { rabbit: 2 } });
    expect(liveOf(sim, "rabbit")).toBe(2);
    expect(checkInvariants(sim.snapshot(), config, world)).toEqual([]);
  });

  it("is deterministic: the same change at the same hour gives the same run", () => {
    const a = fresh();
    const b = fresh();
    a.runDays(2);
    b.runDays(2);
    a.intervene({ population: { cow: 5 }, env: { soilQuality: 60 } });
    b.intervene({ population: { cow: 5 }, env: { soilQuality: 60 } });
    a.runDays(3);
    b.runDays(3);
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });
});
