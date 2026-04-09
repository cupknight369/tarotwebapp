import { expect, test } from '@playwright/test';

test('document title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Tarot/);
});

test('loading splash is removed after Alpine initializes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading-splash')).toBeHidden({ timeout: 15_000 });
});
