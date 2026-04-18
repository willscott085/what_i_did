import { test, expect } from "@playwright/test";

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

    const taskInput = page.getByRole("textbox", { name: "Plan Q4 roadmap" });
    await expect(taskInput).toBeVisible();
    const taskRow = page.locator(".group\\/task").filter({ has: taskInput });

    // Expand subtasks
    const subtaskBadge = taskRow
      .locator("button")
      .filter({ hasText: /\d+\/\d+/ });
    await expect(subtaskBadge).toBeVisible({ timeout: 10000 });
    await subtaskBadge.click();

    // Add a new subtask
    const subtaskInput = page.getByPlaceholder("Add subtask…");
    const subtaskName = `Subtask ${Date.now()}`;
    await subtaskInput.fill(subtaskName);
    await subtaskInput.press("Enter");

    // The new subtask should appear
    await expect(page.getByText(subtaskName)).toBeVisible();

    // Cleanup: delete the subtask
    const subtaskRow = page.locator("li").filter({ hasText: subtaskName });
    await subtaskRow.hover();
    await subtaskRow
      .getByRole("button", { name: `Delete subtask: ${subtaskName}` })
      .click();
    await expect(page.getByText(subtaskName)).not.toBeVisible();
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
