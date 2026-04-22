import { test, expect } from "@playwright/test";

// These tests mutate shared seed tasks that parallel specs also touch
// (e.g., first-task completion, task creation). Transient contention from
// the shared dev server / DB is recovered by Playwright retries.
test.describe.configure({ retries: 2 });

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

    // Wait for backlog tasks to load
    await page.locator(".group\\/task").first().waitFor({ state: "visible" });

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

    // Task should appear in the backlog. A longer timeout tolerates cache
    // invalidations triggered by parallel specs mutating other tasks.
    await expect(page.getByRole("textbox", { name: taskName })).toBeVisible({
      timeout: 15000,
    });

    // Cleanup
    await deleteTask(page, taskName);
  });

  test("should complete a task in the backlog", async ({ page }) => {
    await waitForHydration(page);

    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");
    // Wait for the backlog heading so stale task rows from the day view
    // are no longer mounted when we pick the target task.
    await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();

    // Target a specific seeded backlog task (unscheduled, incomplete) so the
    // assertion doesn't race with the list reordering on completion.
    const taskInput = page.getByRole("textbox", {
      name: "Fix timezone bug in date picker",
    });
    await expect(taskInput).toBeVisible();
    const taskRow = page.locator(".group\\/task").filter({ has: taskInput });
    const checkboxId = await taskRow.getByRole("checkbox").getAttribute("id");
    const pinnedCheckbox = page.locator(`[id="${checkboxId}"]`);

    await pinnedCheckbox.click();
    await expect(pinnedCheckbox).toBeChecked();

    await pinnedCheckbox.click();
    await expect(pinnedCheckbox).not.toBeChecked();
  });
});
