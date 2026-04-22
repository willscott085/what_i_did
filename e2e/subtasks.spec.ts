import { test, expect } from "@playwright/test";

async function waitForHydration(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForURL(/\/day\//);
  await page.locator("[data-hydrated]").waitFor({ state: "visible" });
}

async function createTaskWithSubtasks(
  page: import("@playwright/test").Page,
  parentName: string,
  subtaskNames: string[],
) {
  await page.getByRole("button", { name: "Add task" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title").fill(parentName);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).not.toBeVisible();

  const parentInput = page.getByRole("textbox", { name: parentName });
  await expect(parentInput).toBeVisible();
  const taskRow = page.locator(".group\\/task").filter({ has: parentInput });

  await taskRow.hover();
  await taskRow.getByRole("button", { name: "Edit task" }).click();
  const editDialog = page.getByRole("dialog");
  await expect(editDialog).toBeVisible();

  const subtaskInput = editDialog.getByPlaceholder("Add subtask…");
  for (const name of subtaskNames) {
    await subtaskInput.fill(name);
    await subtaskInput.press("Enter");
    await expect(editDialog.getByText(name)).toBeVisible();
  }

  await page.keyboard.press("Escape");
  await expect(editDialog).not.toBeVisible();

  return { parentInput, taskRow };
}

async function deleteTask(
  taskRow: import("@playwright/test").Locator,
  parentInput: import("@playwright/test").Locator,
) {
  await taskRow.hover();
  await taskRow.getByRole("button", { name: "Delete task" }).click();
  await expect(parentInput).not.toBeVisible();
}

test.describe("Subtasks", () => {
  test("should expand subtasks on a task", async ({ page }) => {
    await waitForHydration(page);

    const parentName = `Expand parent ${Date.now()}`;
    const subtaskA = `Expand child A ${Date.now()}`;
    const subtaskB = `Expand child B ${Date.now()}`;
    const { parentInput, taskRow } = await createTaskWithSubtasks(
      page,
      parentName,
      [subtaskA, subtaskB],
    );

    const subtaskBadge = taskRow
      .locator("button")
      .filter({ hasText: /\d+\/\d+/ });
    await expect(subtaskBadge).toBeVisible({ timeout: 10000 });
    await subtaskBadge.click();

    await expect(page.getByText(subtaskA)).toBeVisible();
    await expect(page.getByText(subtaskB)).toBeVisible();

    await deleteTask(taskRow, parentInput);
  });

  test("should add a subtask to a task", async ({ page }) => {
    await waitForHydration(page);

    const parentName = `Subtask parent ${Date.now()}`;
    await page.getByRole("button", { name: "Add task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Title").fill(parentName);
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    const parentInput = page.getByRole("textbox", { name: parentName });
    await expect(parentInput).toBeVisible();
    const taskRow = page.locator(".group\\/task").filter({ has: parentInput });

    // Open the task's edit dialog to add the first subtask (the inline
    // subtask badge only appears once a task has at least one subtask).
    await taskRow.hover();
    await taskRow.getByRole("button", { name: "Edit task" }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();

    const subtaskInput = editDialog.getByPlaceholder("Add subtask…");
    const subtaskName = `Subtask ${Date.now()}`;
    await subtaskInput.fill(subtaskName);
    await subtaskInput.press("Enter");

    // The new subtask should appear inside the edit dialog
    await expect(editDialog.getByText(subtaskName)).toBeVisible();

    // Cleanup: delete the subtask, close the dialog, delete the parent task
    const subtaskRow = editDialog
      .locator("li")
      .filter({ hasText: subtaskName });
    await subtaskRow.hover();
    await subtaskRow
      .getByRole("button", { name: `Delete subtask: ${subtaskName}` })
      .click();
    await expect(editDialog.getByText(subtaskName)).not.toBeVisible();

    await page.keyboard.press("Escape");
    await expect(editDialog).not.toBeVisible();

    await deleteTask(taskRow, parentInput);
  });

  test("should complete and uncomplete a subtask", async ({ page }) => {
    await waitForHydration(page);

    const parentName = `Toggle parent ${Date.now()}`;
    const subtaskName = `Toggle child ${Date.now()}`;
    const { parentInput, taskRow } = await createTaskWithSubtasks(
      page,
      parentName,
      [subtaskName],
    );

    const subtaskBadge = taskRow
      .locator("button")
      .filter({ hasText: /\d+\/\d+/ });
    await expect(subtaskBadge).toBeVisible({ timeout: 10000 });
    await subtaskBadge.click();

    const subtaskRow = page.locator("li").filter({ hasText: subtaskName });
    const checkbox = subtaskRow.getByRole("checkbox");

    await checkbox.click();
    await expect(checkbox).toBeChecked();

    await checkbox.click();
    await expect(checkbox).not.toBeChecked();

    await deleteTask(taskRow, parentInput);
  });
});
