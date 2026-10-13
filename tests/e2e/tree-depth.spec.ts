import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

// M1.6: the player is drawn behind a tree when north of it, and in front of it when south of it.
test("player walks behind and in front of a tree (depth sorting)", async ({ page }) => {
  const map = JSON.parse(readFileSync(resolve(process.cwd(), "public/maps/hub.json"), "utf-8"));
  const W: number = map.width;
  const solid: number[] = map.layers.find((l: { name: string }) => l.name === "solid").data;
  const veg: number[] = map.layers.find((l: { name: string }) => l.name === "vegetation").data;
  const open = (x: number, y: number) => solid[y * W + x] === 0;

  // A tree with open tiles directly north and south of it, so the player can stand on both.
  let tree: { x: number; y: number } | null = null;
  for (let i = 0; i < veg.length && !tree; i++) {
    if (veg[i] === 0) continue;
    const x = i % W;
    const y = Math.floor(i / W);
    if (y > 1 && y < map.height - 2 && open(x, y - 1) && open(x, y + 1)) tree = { x, y };
  }
  expect(tree).not.toBeNull();
  const t = tree!;

  await page.goto("/game");
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
  // The map and the scene agree on walkability for the two tiles we will stand on.
  expect(await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: any }).__ecosystem.walkable(x, y), [t.x, t.y - 1])).toBe(true);
  expect(await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: any }).__ecosystem.walkable(x, y), [t.x, t.y + 1])).toBe(true);

  // North of the tree: the tree is drawn over the player.
  await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: any }).__ecosystem.teleportPlayer(x, y), [t.x, t.y - 1]);
  const treeDepth = await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: any }).__ecosystem.treeDepthAt(x, y), [t.x, t.y]);
  const playerNorth = await page.evaluate(() => (window as unknown as { __ecosystem: any }).__ecosystem.playerDepth());
  expect(treeDepth).not.toBeNull();
  expect(playerNorth).toBeLessThan(treeDepth as number);

  // South of the tree: the player is drawn over the tree.
  await page.evaluate(([x, y]) => (window as unknown as { __ecosystem: any }).__ecosystem.teleportPlayer(x, y), [t.x, t.y + 1]);
  const playerSouth = await page.evaluate(() => (window as unknown as { __ecosystem: any }).__ecosystem.playerDepth());
  expect(playerSouth).toBeGreaterThan(treeDepth as number);
});
