import { expect, test } from '@playwright/test';

// The Home screen is the entry point: two cards route to the trainers, and the
// header Home button returns from either one.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('shows both training cards on Home', async ({ page }) => {
  await expect(page.getByRole('heading', { name: "Evelyn's Math Trainer" })).toBeVisible();
  await expect(page.getByTestId('home.roots')).toBeVisible();
  await expect(page.getByTestId('home.binary')).toBeVisible();
});

test('Root Training opens the roots setup and Home returns', async ({ page }) => {
  await page.getByTestId('home.roots').click();
  await expect(page.getByRole('button', { name: 'Square roots' })).toBeVisible();

  await page.getByTestId('header.home').click();
  await expect(page.getByTestId('home.roots')).toBeVisible();
  await expect(page.getByTestId('home.binary')).toBeVisible();
});

test('Binary Training opens the binary setup and Home returns', async ({ page }) => {
  await page.getByTestId('home.binary').click();
  await expect(page.getByTestId('setup.start')).toBeVisible();

  await page.getByTestId('header.home').click();
  await expect(page.getByTestId('home.roots')).toBeVisible();
  await expect(page.getByTestId('home.binary')).toBeVisible();
});

test('Home mid-round in roots asks for confirmation (Cancel stays, OK goes home)', async ({ page }) => {
  await page.getByTestId('home.roots').click();
  await page.getByRole('button', { name: 'Square roots' }).click();
  await page.getByRole('button', { name: 'Type answer' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  const input = page.getByPlaceholder('Type the root (1–100)');
  await expect(input).toBeVisible();

  // Home mid-round opens the confirmation; Cancel keeps the round.
  await page.getByTestId('header.home').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('End this round?')).toBeVisible();
  await page.getByTestId('confirm.cancel').click();
  await expect(dialog).toBeHidden();
  await expect(input).toBeVisible();

  // OK leaves the round and goes home.
  await page.getByTestId('header.home').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('confirm.ok').click();
  await expect(page.getByTestId('home.roots')).toBeVisible();
  await expect(page.getByTestId('home.binary')).toBeVisible();
});
