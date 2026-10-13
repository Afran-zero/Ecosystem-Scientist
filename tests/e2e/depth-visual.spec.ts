import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// M1.6 visual check: the player is drawn behind a vegetation tile when north of it and in front of
// it when south of it. Saves frames to assets/previews/ so a person can look at them.
type Hook = {
  island: () => string;
  teleportPlayer: (x: number, y: number) => void;
  playerDepth: () => number;
  treeDepthAt: (x: number, y: number) => number | null;
  walkable: (x: number, y: number) => boolean;
  stumpDepthAt: (x: number, y: number) => number | null;
  stumpTiles: () => { x: number; y: number }[];
};

for (const island of ["hub", "mission-forest"]) {
  test(`depth on ${island}: behind when north, in front when south`, async ({ page }) => {
    const map = JSON.parse(readFileSync(resolve(process.cwd(), `public/maps/${island === "hub" ? "hub" : island}.json`), "utf-8"));
    const W: number = map.width;
    const H: number = map.height;
    const solid: number[] = map.layers.find((l: { name: string }) => l.name === "solid").data;
    const veg: number[] = map.layers.find((l: { name: string }) => l.name === "vegetation").data;
    const open = (x: number, y: number) => solid[y * W + x] === 0;

    let spot: { x: number; y: number } | null = null;
    for (let i = 0; i < veg.length && !spot; i++) {
      if (veg[i] === 0) continue;
      const x = i % W;
      const y = Math.floor(i / W);
      if (y > 1 && y < H - 2 && open(x, y - 1) && open(x, y + 1)) spot = { x, y };
    }
    expect(spot, "a vegetation tile with open tiles north and south").not.toBeNull();
    const t = spot!;

    await page.goto(`/game?island=${island}`);
    await page.locator("canvas").first().waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.island()))
      .toBe(island);

    await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: Hook }).__ecosystem.teleportPlayer(x, y), [t.x, t.y - 1]);
    await page.waitForTimeout(700);
    const northDepth = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.playerDepth());
    const treeDepth = await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: Hook }).__ecosystem.treeDepthAt(x, y), [t.x, t.y]);
    await page.locator("canvas").first().screenshot({ path: resolve(process.cwd(), `assets/previews/depth-${island}-north.png`) });

    await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: Hook }).__ecosystem.teleportPlayer(x, y), [t.x, t.y + 1]);
    await page.waitForTimeout(700);
    const southDepth = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.playerDepth());
    await page.locator("canvas").first().screenshot({ path: resolve(process.cwd(), `assets/previews/depth-${island}-south.png`) });

    expect(treeDepth).not.toBeNull();
    expect(northDepth).toBeLessThan(treeDepth as number);
    expect(southDepth).toBeGreaterThan(treeDepth as number);
  });
}

test("depth on mission-forest: the player passes behind and in front of a stump (M1.6)", async ({ page }) => {
  await page.goto("/game?island=mission-forest");
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.island()))
    .toBe("mission-forest");

  const stump = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.stumpTiles()[0]);
  expect(stump, "the forest mission has at least one stump").toBeTruthy();
  const { x, y } = stump;

  await page.evaluate(([tx, ty]) => (window as unknown as { __ecosystem: Hook }).__ecosystem.teleportPlayer(tx, ty - 1), [x, y]);
  await page.waitForTimeout(600);
  const northDepth = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.playerDepth());
  const stumpDepth = await page.evaluate(([tx, ty]) => (window as unknown as { __ecosystem: Hook }).__ecosystem.stumpDepthAt(tx, ty), [x, y]);
  await page.locator("canvas").first().screenshot({ path: resolve(process.cwd(), "assets/previews/depth-stump-north.png") });

  await page.evaluate(([tx, ty]) => (window as unknown as { __ecosystem: Hook }).__ecosystem.teleportPlayer(tx, ty + 1), [x, y]);
  await page.waitForTimeout(600);
  const southDepth = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.playerDepth());
  await page.locator("canvas").first().screenshot({ path: resolve(process.cwd(), "assets/previews/depth-stump-south.png") });

  expect(stumpDepth).not.toBeNull();
  expect(northDepth).toBeLessThan(stumpDepth as number);
  expect(southDepth).toBeGreaterThan(stumpDepth as number);
});
