import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../helpers";

// Every species the player can inspect needs a complete field guide, or its dialog is incomplete.
const facts = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/animal-facts.json"), "utf-8")) as Record<string, unknown>;
const config = loadConfig();

describe("animal field guides (dialog content)", () => {
  for (const species of config.species) {
    it(`${species.displayName} has a complete guide`, () => {
      const guide = facts[species.id] as {
        latin: string;
        habitat: string;
        diet: string;
        behaviour: string;
        facts: string[];
      };
      expect(guide, `missing entry for ${species.id}`).toBeDefined();
      expect(guide.latin.trim().split(" ").length, `${species.id}.latin is a two-part name`).toBeGreaterThanOrEqual(2);
      for (const field of ["habitat", "diet", "behaviour"] as const) {
        expect(guide[field].trim().length, `${species.id}.${field}`).toBeGreaterThan(10);
      }
      expect(guide.facts.length, `${species.id} needs several facts`).toBeGreaterThanOrEqual(5);
      expect(new Set(guide.facts).size, `${species.id} repeats a fact`).toBe(guide.facts.length);
      for (const f of guide.facts) expect(f.trim().length).toBeGreaterThan(20);
    });
  }
});
