import { expect, test, type Page } from "@playwright/test";

// The game is played on a PC and on a phone. On a wide screen the lab uses the side space for
// charts (controls beside them); on a phone everything stacks, and no screen scrolls sideways.
const PAGES = ["/", "/missions", "/journal", "/game"];

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const labNoSideScroll = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector('[aria-label="Research laboratory"] main') as HTMLElement | null;
    return main ? main.scrollWidth <= main.clientWidth + 1 : false;
  });

const openLab = async (page: Page) => {
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
  await page.evaluate(() => (window as unknown as { __ecosystem: { openLab: () => void } }).__ecosystem.openLab());
  return page.getByRole("dialog", { name: "Research laboratory" });
};

for (const [name, size] of [
  ["PC", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport: size, hasTouch: name === "phone", isMobile: name === "phone" });

    for (const url of PAGES) {
      test(`${url} does not scroll sideways`, async ({ page }) => {
        await page.goto(url);
        await page.waitForTimeout(700);
        expect(await noSideScroll(page)).toBe(true);
      });
    }

    test("the lab does not scroll sideways on any tab", async ({ page }) => {
      await page.goto("/game");
      await page.locator("canvas").first().waitFor({ timeout: 30_000 });
      const lab = await openLab(page);
      for (const tab of ["Overview", "Environment", "Populations", "Food web", "Experiments", "Results"]) {
        await lab.getByRole("tab", { name: tab }).click();
        await page.waitForTimeout(300);
        expect(await labNoSideScroll(page), `${tab} tab`).toBe(true);
      }
    });

    test("the charts use the side space (PC) or stack (phone)", async ({ page }) => {
      await page.goto("/game");
      await page.locator("canvas").first().waitFor({ timeout: 30_000 });
      const lab = await openLab(page);
      await lab.getByRole("tab", { name: "Environment" }).click();
      const charts = lab.getByRole("region", { name: "Live response to these settings" }).locator("figure");
      await expect(charts.first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(600);
      const first = await charts.nth(0).boundingBox();
      const second = await charts.nth(1).boundingBox();
      const region = await lab.getByRole("region", { name: "Live response to these settings" }).boundingBox();
      const controls = await lab.getByLabel("Temperature value").boundingBox();
      expect(first && second && region && controls).toBeTruthy();
      if (name === "PC") {
        // Controls on the left, charts on the right; two charts share a row.
        expect(region!.x).toBeGreaterThan(controls!.x + controls!.width);
        expect(Math.abs(first!.y - second!.y)).toBeLessThan(4);
        expect(second!.x).toBeGreaterThan(first!.x + 100);
      } else {
        // Phone: the charts stack, one per row.
        expect(second!.y).toBeGreaterThan(first!.y + first!.height - 4);
        expect(first!.width).toBeGreaterThan(300);
      }
    });
  });
}
