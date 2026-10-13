import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// docs/brain/THEME.md: every text colour meets WCAG AA (4.5:1) on the surface it sits on.
// The colours are read from globals.css, so a token change that breaks a pair fails this test.
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf-8");
const token = (name: string): string => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`));
  if (!m) throw new Error(`token --color-${name} not found in globals.css`);
  return m[1];
};

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [string, string][] = [
  // Paper surface: ink text on cream and parchment.
  ["ink-text", "cream"],
  ["ink-text", "parchment"],
  ["brown-strong", "parchment"],
  ["brown-strong", "cream"],
  ["muted", "parchment"],
  ["moss", "parchment"],
  ["rust", "parchment"],
  // Dark surface: cream text and accents on walnut.
  ["cream", "walnut-dark"],
  ["cream", "ink"],
  ["cream-soft", "walnut-dark"],
  ["cream-muted", "walnut-dark"],
  ["honey", "walnut-dark"],
  ["moss-light", "walnut-dark"],
  ["rust-light", "walnut-dark"],
  ["taupe", "walnut-dark"],
  // Buttons: ink text on honey, golden, hover honey, and parchment.
  ["ink", "honey"],
  ["ink", "honey-hover"],
  ["ink", "parchment"],
];

describe("theme contrast (docs/brain/THEME.md section 2)", () => {
  for (const [text, bg] of PAIRS) {
    it(`${text} on ${bg} is at least 4.5:1`, () => {
      const ratio = contrast(token(text), token(bg));
      expect(ratio, `${text} ${token(text)} on ${bg} ${token(bg)} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("screens use theme tokens, not raw hex colours (only the Phaser canvas and in-game labels are exempt)", () => {
    const allowed = new Set(["src/components/game/PhaserGame.tsx", "src/game/HubScene.ts", "src/app/globals.css"]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = resolve(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(tsx|ts)$/.test(entry)) {
          const rel = full.slice(process.cwd().length + 1).replace(/\\/g, "/");
          if (!allowed.has(rel) && /#[0-9a-fA-F]{6}/.test(readFileSync(full, "utf-8"))) offenders.push(rel);
        }
      }
    };
    walk(resolve(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});
