import { test, expect, Page } from "@playwright/test";

// The /reminders page renders the <body> layout only after React hydrates.
async function waitForHydration(page: Page) {
  await page.goto("/reminders");
  await page.locator("[data-hydrated]").waitFor({ state: "visible" });
}

// Open the new reminder dialog by clicking the "+" button in the section header.
async function openNewReminderDialog(page: Page) {
  await page.getByRole("button", { name: "Add reminder" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "New Reminder" }),
  ).toBeVisible();
  return dialog;
}

// Fill in a datetime value that's guaranteed to be in the future.
function futureDateTimeLocal(hoursFromNow = 2): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + hoursFromNow);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Remove a reminder by hovering its row and clicking Delete.
async function deleteReminderByTitle(page: Page, title: string) {
  const row = page.locator(".group\\/reminder").filter({ hasText: title });
  await row.first().hover();
  await row.first().getByRole("button", { name: "Delete reminder" }).click();
  await expect(row).toHaveCount(0);
}

test.describe("Reminders", () => {
  test("navigates to /reminders from nav", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/day\//);
    await page.locator("[data-hydrated]").waitFor({ state: "visible" });
    await page.getByRole("link", { name: "Reminders" }).click();
    await page.waitForURL("/reminders");
    await expect(
      page.getByRole("heading", { name: "Reminders" }),
    ).toBeVisible();
  });

  test("creates a one-off reminder and it appears in upcoming", async ({
    page,
  }) => {
    await waitForHydration(page);
    const title = `One-off ${Date.now()}`;

    const dialog = await openNewReminderDialog(page);
    await dialog.getByLabel("Title").fill(title);

    // DateTimePicker uses a popover with a text input.
    await dialog.getByLabel("Pick a date & time").click();
    await page.getByPlaceholder("YYYY-MM-DD").fill(futureDateTimeLocal(2));
    await page.keyboard.press("Escape");

    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    // The reminder should show up in the list.
    await expect(page.getByText(title)).toBeVisible();

    await deleteReminderByTitle(page, title);
  });

  test("creates a recurring reminder and shows a recurrence description", async ({
    page,
  }) => {
    await waitForHydration(page);
    const title = `Recurring ${Date.now()}`;

    const dialog = await openNewReminderDialog(page);
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByLabel("Pick a date & time").click();
    await page.getByPlaceholder("YYYY-MM-DD").fill(futureDateTimeLocal(3));
    await page.keyboard.press("Escape");
    // Pick the Daily recurrence preset.
    await dialog.getByRole("button", { name: "Daily", exact: true }).click();
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    const row = page
      .locator(".group\\/reminder")
      .filter({ hasText: title })
      .first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/every day/i);

    await deleteReminderByTitle(page, title);
  });

  test("snoozes a reminder and shows the snoozed state", async ({ page }) => {
    await waitForHydration(page);
    const title = `Snooze me ${Date.now()}`;

    const dialog = await openNewReminderDialog(page);
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByLabel("Pick a date & time").click();
    await page.getByPlaceholder("YYYY-MM-DD").fill(futureDateTimeLocal(4));
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    const row = page
      .locator(".group\\/reminder")
      .filter({ hasText: title })
      .first();
    await expect(row).toBeVisible();
    await row.hover();
    await row.getByRole("button", { name: "Snooze reminder" }).click();

    // Snooze menu is a Radix popover rendered in a portal.
    await page.getByRole("button", { name: "1 hour" }).click();

    await expect(row).toContainText(/Snoozed until/i);

    await deleteReminderByTitle(page, title);
  });

  test("dismisses a one-off reminder and it disappears from upcoming", async ({
    page,
  }) => {
    await waitForHydration(page);
    const title = `Dismiss me ${Date.now()}`;

    const dialog = await openNewReminderDialog(page);
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByLabel("Pick a date & time").click();
    await page.getByPlaceholder("YYYY-MM-DD").fill(futureDateTimeLocal(5));
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).not.toBeVisible();

    const row = page
      .locator(".group\\/reminder")
      .filter({ hasText: title })
      .first();
    await expect(row).toBeVisible();
    await row.hover();
    await row.getByRole("button", { name: "Dismiss reminder" }).click();

    // The row should no longer be rendered anywhere on the page.
    await expect(
      page.locator(".group\\/reminder").filter({ hasText: title }),
    ).toHaveCount(0);
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
