import { test, expect } from "@playwright/test";

// Wait for React hydration to complete before interacting.
// The app layout sets data-hydrated only after client-side React mount,
// guaranteeing event handlers are attached.
async function waitForHydration(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForURL(/\/day\//);
  await page.locator("[data-hydrated]").waitFor({ state: "visible" });
}

test.describe("Task Management", () => {
  test("should create a new task via the dialog", async ({ page }) => {
    await waitForHydration(page);

    // Open the create task dialog
    await page.getByRole("button", { name: "Add task" }).click();

    // Fill in the task title
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "New Task" }),
    ).toBeVisible();

    await dialog.getByLabel("Title").fill("E2E test task");

    // Submit the form
    await dialog.getByRole("button", { name: "Create" }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // New task should appear in the list
    await expect(
      page.getByRole("textbox", { name: "E2E test task" }),
    ).toBeVisible();
  });

  test("should complete and uncomplete a task", async ({ page }) => {
    await waitForHydration(page);

    // Find the first unchecked task checkbox
    const firstTask = page.locator(".group\\/task").first();
    const checkbox = firstTask.getByRole("checkbox");

    // Complete the task
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Uncomplete the task
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("should create a task with a start date", async ({ page }) => {
    await waitForHydration(page);

    await page.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Title").fill("Task with start date");
    await dialog.getByLabel("Start Date").fill("2026-12-31");

    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    // Navigate to the date where the task was created
    await page.goto("/day/2026-12-31");
    await expect(
      page.getByRole("textbox", { name: "Task with start date" }),
    ).toBeVisible();
  });

  test("should delete a task", async ({ page }) => {
    await waitForHydration(page);

    // Create a task to delete
    await page.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Title").fill("Task to delete");
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    // Find the task and hover to reveal the delete button
    const taskInput = page.getByRole("textbox", { name: "Task to delete" });
    await expect(taskInput).toBeVisible();
    const taskRow = page.locator(".group\\/task").filter({ has: taskInput });
    await taskRow.hover();

    // Click delete
    await taskRow.getByRole("button", { name: "Delete task" }).click();

    // Task should be removed
    await expect(taskInput).not.toBeVisible();
  });
});
