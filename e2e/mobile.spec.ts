import { test, expect } from "@playwright/test";

test.describe("Mobile navigation", () => {
  test("bottom nav tabs navigate to correct routes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should see bottom nav
    const bottomNav = page.locator("nav.fixed.bottom-0");
    await expect(bottomNav).toBeVisible();

    // Tap Backlog tab
    await bottomNav.getByText("Backlog").click();
    await expect(page).toHaveURL(/\/backlog/);

    // Tap Notes tab
    await bottomNav.getByText("Notes").click();
    await expect(page).toHaveURL(/\/notes/);

    // Tap Reminders tab
    await bottomNav.getByText("Reminders").click();
    await expect(page).toHaveURL(/\/reminders/);

    // Tap Tags tab
    await bottomNav.getByText("Tags").click();
    await expect(page).toHaveURL(/\/tags/);

    // Tap Today tab — should go to /day/
    await bottomNav.getByText("Today").click();
    await expect(page).toHaveURL(/\/day\//);
  });

  test("calendar drawer opens and closes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Tap calendar trigger in top bar
    const calendarButton = page.getByLabel("Open calendar");
    await expect(calendarButton).toBeVisible();
    await calendarButton.click();

    // Calendar drawer should be visible with month grid
    const drawer = page.locator("[data-vaul-drawer]");
    await expect(drawer).toBeVisible();

    // Click overlay to close
    const overlay = page.locator("[data-vaul-overlay]");
    await overlay.click({ position: { x: 10, y: 10 }, force: true });
    await expect(drawer).not.toBeVisible();
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 0;
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  });
});
