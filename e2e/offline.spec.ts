import { expect, test } from '@playwright/test';

// The service worker must keep the app usable offline and must not pin old releases.

test('loads offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  // Reload once while online so the worker controls the page and caches the built assets.
  await page.reload();
  await expect(page.getByRole('heading', { name: "Evelyn's Math Trainer" })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: "Evelyn's Math Trainer" })).toBeVisible();
  await context.setOffline(false);
});

test('registers a versioned worker and keeps only its own cache', async ({ page }) => {
  await page.goto('/');
  const info = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    return { script: reg.active?.scriptURL ?? '', keys };
  });
  expect(info.script).toMatch(/\/sw\.js\?v=\d+\.\d+\.\d+$/);
  expect(info.keys.every((k) => k.startsWith('emt-'))).toBe(true);
  expect(info.keys.length).toBe(1);
});
