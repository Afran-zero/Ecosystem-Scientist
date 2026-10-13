// Captures screenshots of the lab tabs and the island for visual review. Needs a running server on :3100.
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:3100/game");
await page.locator("canvas").first().waitFor({ timeout: 30000 });
await page.waitForFunction(() => Boolean(window.__ecosystem));
await page.waitForTimeout(1500);
await page.screenshot({ path: "assets/previews/island-with-trees.png" });
await page.evaluate(() => window.__ecosystem.openLab());
const dialog = page.getByRole("dialog", { name: "Research laboratory" });
await dialog.waitFor();
await page.screenshot({ path: "assets/previews/lab-overview.png" });
for (const [tab, file] of [["Food web", "lab-food-web.png"], ["Populations", "lab-populations.png"]]) {
  await dialog.getByRole("tab", { name: tab }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `assets/previews/${file}` });
}
await dialog.getByRole("tab", { name: "Experiments" }).click();
await dialog.getByRole("button", { name: "Run control (default settings)" }).click();
await dialog.getByRole("status").filter({ hasText: "Saved" }).waitFor({ timeout: 60000 });
await dialog.getByRole("button", { name: "Run experiment (my settings)" }).click();
await dialog.getByRole("status").filter({ hasText: "Saved run-2" }).waitFor({ timeout: 60000 });
await dialog.getByRole("tab", { name: "Results" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "assets/previews/lab-results.png", fullPage: false });
await browser.close();
console.log("captured");
