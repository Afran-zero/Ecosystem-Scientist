import { describe, expect, it } from "vitest";
import { Rng } from "@/simulation/random";

describe("Rng (seeded PRNG)", () => {
  it("produces the same sequence for the same seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it("returns values in [0, 1)", () => {
    const r = new Rng(7);
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("restores the exact next values from a saved state", () => {
    const r = new Rng(123);
    for (let i = 0; i < 37; i++) r.next();
    const saved = r.getState();
    const expected = Array.from({ length: 1000 }, () => r.next());

    const restored = new Rng(0);
    restored.setState(saved);
    const actual = Array.from({ length: 1000 }, () => restored.next());
    expect(actual).toEqual(expected);
  });
});
