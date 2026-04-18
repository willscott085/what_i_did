import { test, expect } from "@playwright/test";

async function waitForHydration(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForURL(/\/day\//);
  await page.locator("[data-hydrated]").waitFor({ state: "visible" });
}

async function deleteTask(
  page: import("@playwright/test").Page,
  taskName: string,
) {
  const taskInput = page.getByRole("textbox", { name: taskName });
  const taskRow = page.locator(".group\\/task").filter({ has: taskInput });
  await taskRow.hover();
  await taskRow.getByRole("button", { name: "Delete task" }).click();
  await expect(taskInput).not.toBeVisible();
}

test.describe("Backlog", () => {
  test("should navigate to backlog and display tasks", async ({ page }) => {
    await waitForHydration(page);

    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");

    // Backlog contains tasks without a start date (unscheduled, incomplete)
    // From seed: tsk_003, tsk_004, tsk_006, tsk_008, tsk_010 have no startDate
    await expect(
      page.getByRole("textbox", { name: "Write unit tests for task utils" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Update README deployment section" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Fix timezone bug in date picker" }),
    ).toBeVisible();
  });

  test("should create a task from backlog", async ({ page }) => {
    await waitForHydration(page);

    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");

    const taskName = `Backlog task ${Date.now()}`;

    // Open create dialog
    await page.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Title").fill(taskName);
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    // Task should appear in the backlog
    await expect(page.getByRole("textbox", { name: taskName })).toBeVisible();

    // Cleanup
    await deleteTask(page, taskName);
  });

  test("should complete a task in the backlog", async ({ page }) => {
    await waitForHydration(page);

    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");

    // Find first task checkbox
    const firstTask = page.locator(".group\\/task").first();
    const checkbox = firstTask.getByRole("checkbox");

    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Uncomplete
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });
});
