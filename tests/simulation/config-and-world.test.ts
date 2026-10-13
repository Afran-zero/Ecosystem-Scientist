import { describe, expect, it } from "vitest";
import { parseGameConfig } from "@/simulation/config";
import { isBlocked } from "@/simulation/world";
import { loadConfig, loadHubWorld, readJson } from "../helpers";

describe("config validation (plan M2.1)", () => {
  it("loads the shipped species and food web", () => {
    const cfg = loadConfig();
    expect(cfg.species.map((s) => s.id).sort()).toEqual(["chicken", "cow", "fox", "mouse", "rabbit"]);
    expect(cfg.foodWeb.length).toBe(6);
  });

  it("rejects a food-web edge that names an unknown species", () => {
    const species = readJson("public/data/species.json");
    const bad = { edges: [{ prey: "rabbit", predator: "wolf", kind: "hunts" }] };
    expect(() => parseGameConfig(species, bad)).toThrow(/unknown predator "wolf"/);
  });

  it("rejects a species with a negative population cap", () => {
    const species = structuredClone(readJson("public/data/species.json")) as { species: { maxPopulation: number }[] };
    species.species[0].maxPopulation = -1;
    expect(() => parseGameConfig(species, readJson("public/data/food-web.json"))).toThrow();
  });
});

describe("hub world map", () => {
  const world = loadHubWorld();

  it("is 160 x 120 tiles", () => {
    expect(world.width).toBe(160);
    expect(world.height).toBe(120);
  });

  it("has all required regions", () => {
    const names = Object.values(world.regionNames).sort();
    expect(names).toEqual(["forest", "forest_edge", "grassland", "meadow", "pond", "pond_shore", "station"]);
  });

  it("blocks water and the outer edge of the map", () => {
    expect(isBlocked(world, -1, 5)).toBe(true);
    expect(isBlocked(world, 0.5, 0.5)).toBe(true); // corner is water
  });

  it("starts on a walkable tile", () => {
    expect(isBlocked(world, world.spawn.x + 0.5, world.spawn.y + 0.5)).toBe(false);
  });

  it("marks every tree tile as blocked", () => {
    expect(world.trees.length).toBeGreaterThan(100);
    for (const t of world.trees) expect(isBlocked(world, t.x + 0.5, t.y + 0.5)).toBe(true);
  });

  it("has the four interaction points", () => {
    const names = world.interactive.map((i) => i.name).sort();
    expect(names).toEqual(["mission-forest", "mission-meadow", "mission-pond", "research-station"]);
  });
});
