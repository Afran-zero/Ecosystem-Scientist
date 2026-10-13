import { expect, test } from "@playwright/test";

test("main menu links to a running island", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "New game" })).toBeVisible();
  await page.getByRole("link", { name: "New game" }).click();

  await expect(page).toHaveURL(/\/game$/);
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 });
  // Give Phaser time to load the map and start the simulation clock.
  await page.waitForTimeout(3000);
  expect(errors).toEqual([]);
});
