import { expect, test } from "@playwright/test";

type Hook = {
  player: () => unknown;
  isLabOpen: () => boolean;
  openLab: () => void;
  closeLab: () => void;
  hour: () => number;
  treeSprites: () => number;
};

const hook = (page: import("@playwright/test").Page) =>
  page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));

test("lab: controls validate, runs save, the island pauses, and closing keeps everything", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/game");
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await hook(page);

  // The station opens the lab (the same call the E key makes next to the station).
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  const dialog = page.getByRole("dialog", { name: "Research laboratory" });
  await expect(dialog).toBeVisible();

  // The island is paused while the lab is open: the hour does not move.
  const hourBefore = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.hour());
  await page.waitForTimeout(2500);
  const hourAfter = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.hour());
  expect(hourAfter).toBe(hourBefore);

  // Populations: an out-of-range value is rejected and shows an error.
  await dialog.getByRole("tab", { name: "Populations" }).click();
  const rabbits = dialog.getByLabel("Rabbits value");
  await rabbits.fill("150");
  await rabbits.blur();
  await expect(dialog.getByRole("alert")).toContainText("between 0 and 100");

  // A valid value is accepted and the error goes away.
  await rabbits.fill("25");
  await rabbits.blur();
  await expect(dialog.getByRole("alert")).toHaveCount(0);

  // Experiments: run a control, then an experiment. Both are saved.
  await dialog.getByRole("tab", { name: "Experiments" }).click();
  await dialog.getByRole("button", { name: "Run control (island base)" }).click();
  await expect(dialog.getByRole("status")).toContainText("Saved run-1", { timeout: 60_000 });
  await dialog.getByRole("button", { name: "Run experiment (my settings)" }).click();
  await expect(dialog.getByRole("status")).toContainText("Saved run-2", { timeout: 60_000 });
  await expect(dialog.getByRole("row")).toHaveCount(3); // header + 2 runs

  // Results: the charts draw from the saved runs.
  await dialog.getByRole("tab", { name: "Results" }).click();
  await expect(dialog.locator("figcaption", { hasText: "Population" })).toBeVisible();
  await expect(dialog.getByText("Baseline comparison")).toBeVisible();

  // Closing with Escape returns to the island, and the saved runs are still there.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const open = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.isLabOpen());
  expect(open).toBe(false);

  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  await dialog.getByRole("tab", { name: "Experiments" }).click();
  await expect(dialog.getByRole("row")).toHaveCount(3);

  expect(errors).toEqual([]);
});
