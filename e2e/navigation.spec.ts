import { test, expect } from "@playwright/test";
import { format } from "date-fns";

test.describe("Navigation", () => {
  test("should redirect home to today's day view", async ({ page }) => {
    await page.goto("/");
    const todayStr = format(new Date(), "yyyy-MM-dd");
    await page.waitForURL(`/day/${todayStr}`);
    await expect(page).toHaveURL(new RegExp(`/day/${todayStr}`));
  });

  test("should navigate to a specific date via URL", async ({ page }) => {
    await page.goto("/day/2026-12-25");
    await page.locator("[data-hydrated]").waitFor({ state: "visible" });

    await expect(page.getByText("Friday, 25 December 2026")).toBeVisible();
  });

  test("should redirect invalid date to today", async ({ page }) => {
    await page.goto("/day/not-a-date");
    const todayStr = format(new Date(), "yyyy-MM-dd");
    await page.waitForURL(`/day/${todayStr}`);
  });

  test("should show Tags and Backlog nav links", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/day\//);
    await page.locator("[data-hydrated]").waitFor({ state: "visible" });

    await expect(page.getByRole("link", { name: "Tags" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Backlog" })).toBeVisible();
  });

  test("should navigate between tags, backlog, and day views", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForURL(/\/day\//);
    await page.locator("[data-hydrated]").waitFor({ state: "visible" });

    // Navigate to Tags
    await page.getByRole("link", { name: "Tags" }).click();
    await page.waitForURL("/tags");
    await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();

    // Navigate to Backlog
    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");
    await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();

    // Navigate back to a day view via browser history
    await page.goBack();
    await page.waitForURL("/tags");
    await page.goBack();
    await page.waitForURL(/\/day\//);
  });

  test("should display the day view header with formatted date", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForURL(/\/day\//);
    await page.locator("[data-hydrated]").waitFor({ state: "visible" });

    // Today's date should be shown in the header
    const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");
    await expect(page.getByText(todayFormatted)).toBeVisible();
  });
});
