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

async function createBacklogTask(
  page: import("@playwright/test").Page,
  taskName: string,
) {
  await page.getByRole("button", { name: "Add task" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title").fill(taskName);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: taskName })).toBeVisible();
}

test.describe("Backlog", () => {
  test("should navigate to backlog and display tasks", async ({ page }) => {
    await waitForHydration(page);

    // Create a dedicated backlog task so the assertion doesn't depend on
    // seed data that other specs may mutate or delete.
    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");

    const taskName = `Backlog display ${Date.now()}`;
    await createBacklogTask(page, taskName);

    await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: taskName })).toBeVisible();

    await deleteTask(page, taskName);
  });

  test("should create a task from backlog", async ({ page }) => {
    await waitForHydration(page);

    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");

    const taskName = `Backlog task ${Date.now()}`;
    await createBacklogTask(page, taskName);

    await deleteTask(page, taskName);
  });

  test("should complete a task in the backlog", async ({ page }) => {
    await waitForHydration(page);

    await page.getByRole("link", { name: "Backlog" }).click();
    await page.waitForURL("/backlog");
    await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();

    // Create a dedicated target task to avoid racing list reorders caused
    // by other specs mutating seed tasks.
    const taskName = `Backlog complete ${Date.now()}`;
    await createBacklogTask(page, taskName);

    const taskInput = page.getByRole("textbox", { name: taskName });
    const taskRow = page.locator(".group\\/task").filter({ has: taskInput });
    const checkboxId = await taskRow.getByRole("checkbox").getAttribute("id");
    const pinnedCheckbox = page.locator(`[id="${checkboxId}"]`);

    await pinnedCheckbox.click();
    await expect(pinnedCheckbox).toBeChecked();

    await pinnedCheckbox.click();
    await expect(pinnedCheckbox).not.toBeChecked();

    await deleteTask(page, taskName);
  });
});
