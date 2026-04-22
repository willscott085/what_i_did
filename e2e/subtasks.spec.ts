import { test, expect } from "@playwright/test";

// The seed task "Plan Q4 roadmap" is shared with tests that toggle
// first-task completion, which temporarily flips the task into read-only
// state and hides the "Add subtask" input. Retries recover.
test.describe.configure({ retries: 2 });

async function waitForHydration(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForURL(/\/day\//);
  await page.locator("[data-hydrated]").waitFor({ state: "visible" });
}

test.describe("Subtasks", () => {
  test("should expand subtasks on a task", async ({ page }) => {
    await waitForHydration(page);

    // tsk_001 "Plan Q4 roadmap" has 2 subtasks (one completed)
    const taskInput = page.getByRole("textbox", { name: "Plan Q4 roadmap" });
    await expect(taskInput).toBeVisible();
    const taskRow = page.locator(".group\\/task").filter({ has: taskInput });

    // Wait for and click the subtask count button
    const subtaskBadge = taskRow
      .locator("button")
      .filter({ hasText: /\d+\/\d+/ });
    await expect(subtaskBadge).toBeVisible({ timeout: 10000 });
    await subtaskBadge.click();

    // Subtasks should now be visible (rendered as <span> text, not inputs)
    await expect(
      page.getByText("Gather team input on priorities"),
    ).toBeVisible();
    await expect(page.getByText("Draft milestone timeline")).toBeVisible();
  });

  test("should add a subtask to a task", async ({ page }) => {
    await waitForHydration(page);

    // Create a fresh parent task to avoid contention with other specs that
    // toggle the completion state of the first seed task.
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

    await taskRow.hover();
    await taskRow.getByRole("button", { name: "Delete task" }).click();
    await expect(parentInput).not.toBeVisible();
  });

  test("should complete and uncomplete a subtask", async ({ page }) => {
    await waitForHydration(page);

    const taskInput = page.getByRole("textbox", { name: "Plan Q4 roadmap" });
    await expect(taskInput).toBeVisible();
    const taskRow = page.locator(".group\\/task").filter({ has: taskInput });

    // Expand subtasks
    const subtaskBadge = taskRow
      .locator("button")
      .filter({ hasText: /\d+\/\d+/ });
    await expect(subtaskBadge).toBeVisible({ timeout: 10000 });
    await subtaskBadge.click();

    // Find the incomplete subtask "Gather team input on priorities"
    const subtaskRow = page.locator("li").filter({
      hasText: "Gather team input on priorities",
    });
    const checkbox = subtaskRow.getByRole("checkbox");

    // Complete it
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Uncomplete it
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });
});
