import { test, expect } from "@playwright/test";

// Wait for React hydration to complete before interacting.
// The app layout sets data-hydrated only after client-side React mount,
// guaranteeing event handlers are attached.
async function waitForHydration(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForURL(/\/day\//);
  await page.locator("[data-hydrated]").waitFor({ state: "visible" });
}

// Delete a task by hovering its row and clicking the delete button.
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

test.describe("Task Management", () => {
  test("should create a new task via the dialog", async ({ page }) => {
    await waitForHydration(page);
    const taskName = `E2E task ${Date.now()}`;

    // Open the create task dialog
    await page.getByRole("button", { name: "Add task" }).click();

    // Fill in the task title
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "New Task" }),
    ).toBeVisible();

    await dialog.getByLabel("Title").fill(taskName);

    // Submit the form
    await dialog.getByRole("button", { name: "Create" }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // New task should appear in the list
    await expect(page.getByRole("textbox", { name: taskName })).toBeVisible();

    // Cleanup
    await deleteTask(page, taskName);
  });

  test("should complete and uncomplete a task", async ({ page }) => {
    await waitForHydration(page);

    // Find the first unchecked task checkbox and remember the task id
    const firstTask = page.locator(".group\\/task").first();
    const checkbox = firstTask.getByRole("checkbox");
    const checkboxId = await checkbox.getAttribute("id");

    // Complete the task — use click() for Radix UI button-based checkboxes
    await checkbox.click();
    // Re-locate by id since completing moves the task in the list
    const completedCheckbox = page.locator(`[id="${checkboxId}"]`);
    await expect(completedCheckbox).toBeChecked();

    // Uncomplete the task
    await completedCheckbox.click();
    await expect(completedCheckbox).not.toBeChecked();
  });

  test("should create a task with a start date", async ({ page }) => {
    await waitForHydration(page);
    const taskName = `Start date task ${Date.now()}`;

    await page.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Title").fill(taskName);
    // Open the date picker popover, type the date into its input, then close.
    await dialog.getByLabel("Start Date").click();
    await page.getByPlaceholder("YYYY-MM-DD").fill("2026-12-31");
    await page.keyboard.press("Escape");

    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    // Navigate to the date where the task was created
    await page.goto("/day/2026-12-31");
    await page.locator("[data-hydrated]").waitFor({ state: "visible" });
    await expect(page.getByRole("textbox", { name: taskName })).toBeVisible();

    // Cleanup
    await deleteTask(page, taskName);
  });

  test("should delete a task", async ({ page }) => {
    await waitForHydration(page);
    const taskName = `Delete me ${Date.now()}`;

    // Create a task to delete
    await page.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Title").fill(taskName);
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    // Find the task and hover to reveal the delete button
    const taskInput = page.getByRole("textbox", { name: taskName });
    await expect(taskInput).toBeVisible();
    const taskRow = page.locator(".group\\/task").filter({ has: taskInput });
    await taskRow.hover();

    // Click delete
    await taskRow.getByRole("button", { name: "Delete task" }).click();

    // Task should be removed
    await expect(taskInput).not.toBeVisible();
  });
});
