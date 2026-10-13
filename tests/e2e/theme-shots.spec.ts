import { expect, test, type Page } from "@playwright/test";

// Saves screenshots of each themed screen to assets/previews/ for review (docs/brain/THEME.md section 8).
const shot = (page: Page, name: string) => page.screenshot({ path: `assets/previews/theme-${name}.png`, fullPage: false });

test("theme screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "New game" })).toBeVisible();
  await page.waitForTimeout(900);
  await shot(page, "menu");

  await page.goto("/missions");
  await expect(page.getByRole("heading", { name: "Choose a damaged island" })).toBeVisible();
  await page.waitForTimeout(700);
  await shot(page, "missions");

  await page.goto("/journal");
  await expect(page.getByRole("heading", { name: "What you have met on the island" })).toBeVisible();
  await page.waitForTimeout(700);
  await shot(page, "journal");

  await page.goto("/game");
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
  await page.waitForTimeout(1200);
  await shot(page, "island");
  await page.evaluate(() => (window as unknown as { __ecosystem: { inspectAnimal: () => string | null } }).__ecosystem.inspectAnimal());
  await page.waitForTimeout(600);
  await shot(page, "animal");
  await page.keyboard.press("Escape");

  await page.evaluate(() => (window as unknown as { __ecosystem: { openLab: () => void } }).__ecosystem.openLab());
  const lab = page.getByRole("dialog", { name: "Research laboratory" });
  await page.waitForTimeout(400);
  await shot(page, "lab-overview");
  await lab.getByRole("tab", { name: "Populations" }).click();
  await lab.getByLabel("Rabbits value").fill("60");
  await lab.getByLabel("Rabbits value").blur();
  await page.waitForTimeout(2500);
  await shot(page, "lab-populations");
  await lab.getByRole("tab", { name: "Experiments" }).click();
  await lab.getByRole("button", { name: "Run control (island base)" }).click();
  await expect(lab.getByRole("status")).toContainText("Saved run-1", { timeout: 60_000 });
  await lab.getByRole("button", { name: "Run experiment (my settings)" }).click();
  await expect(lab.getByRole("status")).toContainText("Saved run-2", { timeout: 60_000 });
  await lab.getByRole("tab", { name: "Results" }).click();
  await page.waitForTimeout(800);
  await shot(page, "lab-results");
});
