// Screenshot of the island centred on the research lab. Needs a server on :3100.
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:3100/game");
await page.locator("canvas").first().waitFor({ timeout: 30000 });
await page.waitForFunction(() => Boolean(window.__ecosystem));
await page.waitForTimeout(1500);
await page.screenshot({ path: "assets/previews/island-lab-view.png" });
await browser.close();
console.log("captured");
