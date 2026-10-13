import { expect, test } from "@playwright/test";

// Scripted collision test (plan M1.3). Holds the left key until the player reaches the coast.
// Every sampled position must be on a walkable tile, and the player must stop at the shoreline.
test("player stops at the coast and never enters a blocked tile", async ({ page }) => {
  await page.goto("/game");
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));

  await page.locator("canvas").first().click({ position: { x: 5, y: 5 } });
  const start = await page.evaluate(() => (window as any).__ecosystem.player());
  expect(start.blocked).toBe(false);

  await page.keyboard.down("ArrowLeft");
  const samples: { tileX: number; blocked: boolean }[] = [];
  for (let i = 0; i < 100; i++) {
    await page.waitForTimeout(100);
    const p = await page.evaluate(() => (window as any).__ecosystem.player());
    samples.push({ tileX: p.tileX, blocked: p.blocked });
  }
  await page.keyboard.up("ArrowLeft");
  await page.waitForTimeout(300);
  const end = await page.evaluate(() => (window as any).__ecosystem.player());

  expect(samples.some((s) => s.blocked)).toBe(false);
  // It moved left, and then stopped against the coast instead of walking into the sea.
  expect(end.tileX).toBeLessThan(start.tileX - 2);
  expect(end.blocked).toBe(false);
  const stoppedAt = samples[samples.length - 1].tileX;
  expect(Math.abs(stoppedAt - end.tileX)).toBeLessThanOrEqual(1);
});
