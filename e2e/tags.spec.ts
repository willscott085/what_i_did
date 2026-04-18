import { test, expect } from "@playwright/test";

async function goToTags(page: import("@playwright/test").Page) {
  await page.goto("/tags");
  await page.locator("[data-hydrated]").waitFor({ state: "visible" });
  // Wait for the heading to confirm the page loaded
  await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();
}

test.describe("Tags", () => {
  test("should display tags on the tags page", async ({ page }) => {
    await goToTags(page);

    // Verify seeded tags are visible
    await expect(page.getByText("frontend")).toBeVisible();
    await expect(page.getByText("backend")).toBeVisible();
    await expect(page.getByText("urgent")).toBeVisible();
    await expect(page.getByText("review")).toBeVisible();
  });

  test("should filter tags with search", async ({ page }) => {
    await goToTags(page);

    // Wait for tags to appear before filtering
    await expect(page.getByText("frontend")).toBeVisible();

    const searchInput = page.getByLabel("Search tags");
    await searchInput.fill("front");

    // Only matching tag should be visible
    await expect(page.getByText("frontend")).toBeVisible();
    await expect(page.getByText("backend")).not.toBeVisible();
    await expect(page.getByText("urgent")).not.toBeVisible();
  });

  test("should show empty message when no tags match search", async ({
    page,
  }) => {
    await goToTags(page);

    await page.getByLabel("Search tags").fill("nonexistent");
    await expect(page.getByText("No tags match your search.")).toBeVisible();
  });

  test("should navigate to tag detail view", async ({ page }) => {
    await goToTags(page);

    await expect(page.getByText("backend")).toBeVisible();
    await page.getByText("backend").click();
    await page.waitForURL(/\/tag\//);

    // Tag name is an h2 with role="button" (for inline editing)
    await expect(page.getByRole("button", { name: "backend" })).toBeVisible();
  });

  test("should inline edit a tag name", async ({ page }) => {
    await goToTags(page);

    await expect(page.getByText("review")).toBeVisible();
    await page.getByText("review").click();
    await page.waitForURL(/\/tag\//);

    // Click the tag name button to start editing
    const heading = page.getByRole("button", { name: "review", exact: true });
    await heading.click();

    // Type a new name
    const input = page.locator('input[class*="text-lg"]');
    await input.fill("code-review");
    await input.press("Enter");

    // Verify the name updates
    await expect(
      page.getByRole("button", { name: "code-review" }),
    ).toBeVisible();

    // Revert the name back
    await page.getByRole("button", { name: "code-review" }).click();
    const revertInput = page.locator('input[class*="text-lg"]');
    await revertInput.fill("review");
    await revertInput.press("Enter");
  });

  test("should inline edit a tag description", async ({ page }) => {
    await goToTags(page);

    await expect(page.getByText("frontend")).toBeVisible();
    await page.getByText("frontend").click();
    await page.waitForURL(/\/tag\//);

    // Click description area to start editing
    const descArea = page.getByText("UI and client-side work");
    await descArea.click();

    // Edit description
    const textarea = page.locator('textarea[placeholder="Add a description…"]');
    await textarea.fill("Frontend UI and client-side development work");
    await textarea.blur();

    // Verify it's saved
    await expect(
      page.getByText("Frontend UI and client-side development work"),
    ).toBeVisible();

    // Revert
    await page
      .getByText("Frontend UI and client-side development work")
      .click();
    const revertTextarea = page.locator(
      'textarea[placeholder="Add a description…"]',
    );
    await revertTextarea.fill("UI and client-side work");
    await revertTextarea.blur();
  });

  test("should show tasks associated with a tag", async ({ page }) => {
    await goToTags(page);

    await expect(page.getByText("backend")).toBeVisible();
    await page.getByText("backend").click();
    await page.waitForURL(/\/tag\//);

    // backend tag is associated with tsk_001 and tsk_002
    await expect(
      page.getByRole("textbox", { name: "Plan Q4 roadmap" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Refactor legacy auth module" }),
    ).toBeVisible();
  });
});
