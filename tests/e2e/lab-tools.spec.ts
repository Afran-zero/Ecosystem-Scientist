import { expect, test, type Page } from "@playwright/test";

// The lab's live charts, the island base (confirmed, and returned to default), and runs kept in
// this browser across a reload.
type Hook = { island: () => string; openLab: () => void; liveEnvironment: () => Record<string, number> };

const ready = async (page: Page, url: string) => {
  await page.goto(url);
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
};

test("live charts respond to the population controls, showing each animal against the base", async ({ page }) => {
  await ready(page, "/game");
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  const lab = page.getByRole("dialog", { name: "Research laboratory" });
  await lab.getByRole("tab", { name: "Populations" }).click();
  await lab.getByLabel("Rabbits value").fill("60");
  await lab.getByLabel("Rabbits value").blur();

  await expect(lab.getByRole("heading", { name: "Live response to these settings" })).toBeVisible();
  await expect(lab.locator("figcaption", { hasText: "Rabbit population" })).toBeVisible({ timeout: 15_000 });
  await expect(lab.locator("figcaption", { hasText: "Grass coverage" })).toBeVisible();
  await expect(lab.locator("figcaption", { hasText: "Animals eaten by predators" })).toBeVisible();
  await expect(lab.getByRole("region", { name: "Live response to these settings" }).getByRole("table")).toContainText("Rabbit");
});

test("an experiment can become the island's base only after confirmation, and the base can be returned", async ({ page }) => {
  await ready(page, "/game");
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  const lab = page.getByRole("dialog", { name: "Research laboratory" });
  await lab.getByRole("tab", { name: "Populations" }).click();
  await lab.getByLabel("Rabbits value").fill("40");
  await lab.getByLabel("Rabbits value").blur();

  await lab.getByRole("tab", { name: "Experiments" }).click();
  await expect(lab.getByText("The hub starts from its original base.")).toBeVisible();
  await lab.getByLabel(/Make this experiment the island/).check();
  await lab.getByRole("button", { name: "Run experiment (my settings)" }).click();
  await expect(lab.getByRole("status")).toContainText("Saved run-1", { timeout: 60_000 });

  const confirm = lab.getByRole("alertdialog", { name: "Confirm new base" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Not now" }).click();
  await expect(confirm).toHaveCount(0);

  // Run again with the box ticked, and confirm this time.
  await lab.getByRole("button", { name: "Run experiment (my settings)" }).click();
  await expect(lab.getByRole("status")).toContainText("Saved run-2", { timeout: 60_000 });
  await lab.getByRole("button", { name: "Yes, make it the new base" }).click();
  await expect(lab.getByText("The hub starts from a base you set in the lab.")).toBeVisible();

  // Return to the original base, with a confirmation.
  await lab.getByRole("button", { name: "Return to the original base" }).click();
  await lab.getByRole("alertdialog", { name: "Return to the original base" }).getByRole("button", { name: "Return to the original base" }).click();
  await expect(lab.getByText("The hub starts from its original base.")).toBeVisible();
});

test("saved runs stay in this browser after a reload, and can be deleted", async ({ page }) => {
  await ready(page, "/game");
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  let lab = page.getByRole("dialog", { name: "Research laboratory" });
  await lab.getByRole("tab", { name: "Experiments" }).click();
  await lab.getByRole("button", { name: "Run control (island base)" }).click();
  await expect(lab.getByRole("status")).toContainText("Saved run-1", { timeout: 60_000 });

  await page.reload();
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  lab = page.getByRole("dialog", { name: "Research laboratory" });
  await lab.getByRole("tab", { name: "Experiments" }).click();
  await expect(lab.getByRole("row")).toHaveCount(2);

  await lab.getByRole("button", { name: "Delete" }).click();
  await expect(lab.getByText("No runs yet.")).toBeVisible();
});
