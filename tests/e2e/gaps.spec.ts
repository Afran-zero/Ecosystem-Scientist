import { expect, test, type Page } from "@playwright/test";

// Open items from the M4 summary: scene-level mission reset (M4.9), live intervention (M3.4),
// field journal (M4.11), and touch controls (M1.9).
type Hook = {
  island: () => string;
  openLab: () => void;
  inspectAnimal: () => string | null;
  standNearAnimal: () => string | null;
  advanceDays: (days: number) => void;
  snapshotJson: () => string;
  liveEnvironment: () => Record<string, number>;
  player: () => { x: number; y: number };
};

const ready = async (page: Page, url: string) => {
  await page.goto(url);
  await page.locator("canvas").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __ecosystem?: unknown }).__ecosystem));
};

test("M4.9: resetting a mission returns exactly to its damaged start", async ({ page }) => {
  await ready(page, "/game?island=mission-meadow");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.island())).toBe("mission-meadow");
  const initial = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.snapshotJson());

  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.advanceDays(5));
  const changed = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.snapshotJson());
  expect(changed).not.toBe(initial);

  // Two steps, so a stray click cannot throw the island away.
  await page.getByRole("button", { name: "Reset mission" }).click();
  await page.getByRole("button", { name: "Confirm reset" }).click();

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.snapshotJson()), { timeout: 15_000 })
    .toBe(initial);
});

test("M3.4: a live change to the island waits for review and confirmation", async ({ page }) => {
  await ready(page, "/game?island=mission-meadow");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.island())).toBe("mission-meadow");
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  const lab = page.getByRole("dialog", { name: "Research laboratory" });
  await lab.getByRole("tab", { name: "Environment" }).click();

  const rainfall = await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.liveEnvironment().rainfallMmPerDay);
  await lab.getByLabel("Rainfall value").fill("80");
  await lab.getByLabel("Rainfall value").blur();
  await lab.getByRole("button", { name: "Review the change" }).click();
  await expect(lab.getByRole("alertdialog", { name: "Confirm live change" })).toBeVisible();

  // Not yet applied: the live island still has its old rainfall.
  expect(await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.liveEnvironment().rainfallMmPerDay)).toBe(rainfall);

  await lab.getByRole("button", { name: "Apply to the live island" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.liveEnvironment().rainfallMmPerDay))
    .toBe(80);
  await expect(lab.getByText("Changes made on this island")).toBeVisible();
});

test("M3.4: the hub does not offer live changes", async ({ page }) => {
  await ready(page, "/game");
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.openLab());
  const lab = page.getByRole("dialog", { name: "Research laboratory" });
  await lab.getByRole("tab", { name: "Environment" }).click();
  await expect(lab.getByText("Live changes are offered on a restoration mission")).toBeVisible();
  await expect(lab.getByRole("button", { name: "Review the change" })).toHaveCount(0);
});

test("M4.11: an inspected species is in the journal, and it survives a reload", async ({ page }) => {
  await ready(page, "/game");
  await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.inspectAnimal());
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("heading", { level: 2 }) });
  await expect(dialog).toBeVisible();
  const name = (await dialog.getByRole("heading", { level: 2 }).textContent())!.trim();
  await page.keyboard.press("Escape");

  await page.goto("/journal");
  await expect(page.getByRole("heading", { name, level: 2, exact: true })).toBeVisible();
  await expect(page.locator("li", { hasText: new RegExp(`${name} .* on the hub island`) })).toBeVisible();
});

test.describe("touch device", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 780 } });

  test("M1.9: the joystick walks the player and the E button opens a dialog", async ({ page }) => {
    await ready(page, "/game");
    const stick = page.getByRole("application", { name: "Joystick: drag to walk" });
    await expect(stick).toBeVisible();

    const playerX = () => page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.player().x);
    const x0 = await playerX();
    const box = (await stick.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(cx + i * 6, cy);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(400);
    await page.mouse.up();
    const x1 = await playerX();
    expect(x1).toBeGreaterThan(x0 + 3);

    await page.evaluate(() => (window as unknown as { __ecosystem: Hook }).__ecosystem.standNearAnimal());
    await page.getByRole("button", { name: "Interact (E)" }).click();
    await expect(page.getByRole("dialog").filter({ has: page.getByRole("heading", { level: 2 }) })).toBeVisible();
  });
});
