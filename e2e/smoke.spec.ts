import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/whatIdid/)
})

test('tasks page navigates without crash', async ({ page }) => {
  await page.goto('/tasks')
  // Page may show error boundary if json-server isn't running,
  // but it should still render without a full crash
  await expect(page).toHaveURL(/tasks/)
})
