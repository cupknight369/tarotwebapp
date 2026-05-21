import { expect, test } from '@playwright/test';

test('manifest link is present in document head', async ({ page }) => {
  await page.goto('/');
  const manifest = page.locator('link[rel="manifest"]').first();
  await expect(manifest).toHaveAttribute('href', /manifest\.webmanifest/);
});

test('manifest.webmanifest is served with required fields', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const manifest = (await res.json()) as {
    name?: string;
    short_name?: string;
    icons?: { src: string }[];
  };
  expect(manifest.name).toBe('Cup Knight Tarot');
  expect(manifest.short_name).toBe('CK Tarot');
  expect(manifest.icons?.length).toBeGreaterThan(0);
});

test('service worker script is registered', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          if (!('serviceWorker' in navigator)) return false;
          const reg = await navigator.serviceWorker.getRegistration();
          return reg != null;
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
});
