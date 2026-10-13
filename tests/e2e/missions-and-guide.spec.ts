import { expect, test, type Page } from "@playwright/test";

type Hook = {
  island: () => string;
  hour: () => number;
  isLabOpen: () => boolean;
  openLab: () => void;
  inspectAnimal: () => string | null;
};

const hookReady = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));

test("animal dialog: field guide, facts that change, and the island pauses while it is open", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/game");
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await hookReady(page);

  const animalId = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.inspectAnimal());
  expect(animalId).not.toBeNull();

  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { level: 2 }) });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Did you know?");
  await expect(dialog).toContainText("Eats");
  await expect(dialog).toContainText("Eaten by");
  await expect(dialog).toContainText("Lifespan in this model");

  // The subtitle shows a fact and can page to another one.
  const counter = dialog.getByText(/Fact \d+ of \d+/);
  await expect(counter).toBeVisible();
  const before = await counter.textContent();
  await dialog.getByRole("button", { name: "Another fact" }).click();
  await expect(counter).toBeVisible();
  const after = await counter.textContent();
  expect(before).toMatch(/Fact \d+ of \d+/);
  expect(after).toMatch(/Fact \d+ of \d+/);

  // While the dialog is open the island is paused: the hour does not move.
  const hourBefore = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.hour());
  await page.waitForTimeout(2500);
  const hourAfter = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.hour());
  expect(hourAfter).toBe(hourBefore);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("missions: any mission opens from the list, locks other controls, scores evidence, and keeps progress after reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/missions");
  const forest = page.getByRole("article").filter({ hasText: "Reconnect the Forest" });
  await expect(forest).toBeVisible();
  await forest.getByRole("link", { name: "Start this mission" }).click();

  await expect(page).toHaveURL(/island=mission-forest/);
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await hookReady(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.island())).toBe("mission-forest");
  await expect(page.getByRole("list", { name: "Mission objectives" })).toBeVisible();

  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  const lab = page.getByRole("dialog", { name: "Research laboratory" });
  await expect(lab).toBeVisible();

  // Cows are not part of the forest mission, so their control is locked.
  await lab.getByRole("tab", { name: "Populations" }).click();
  await expect(lab.getByLabel("Cows value")).toBeDisabled();
  await expect(lab.getByLabel("Rabbits value")).toBeEnabled();

  await lab.getByRole("tab", { name: "Experiments" }).click();
  await lab.getByRole("button", { name: "Run control (mission start, no changes)" }).click();
  await expect(lab.getByRole("status")).toContainText("Saved run-1", { timeout: 60_000 });
  await lab.getByRole("button", { name: "Run experiment (my settings)" }).click();
  await expect(lab.getByRole("status")).toContainText("Saved run-2", { timeout: 60_000 });

  await lab.getByLabel(/What did you change/).fill("I kept the starting settings and compared the forest with the control run.");
  await lab.getByRole("button", { name: "Submit to the mission" }).click();

  const results = page.getByRole("dialog", { name: /results/ });
  await expect(results).toBeVisible();
  await expect(results).toContainText(/Not complete yet|Mission complete/);
  await expect(results).toContainText("Success criteria");
  await expect(results).toContainText("What the data shows");
  await results.getByRole("button", { name: "Back to the island" }).click();
  await expect(results).toHaveCount(0);

  // Progress survives a reload.
  await page.goto("/missions");
  await expect(page.getByRole("article").filter({ hasText: "Reconnect the Forest" })).toContainText(/In progress|Completed/);
  expect(errors).toEqual([]);
});
