import { expect, test, type Page } from '@playwright/test';

// Smoke tests that pin the existing roots trainer while the app grows around it.

async function readPrompt(page: Page): Promise<number> {
  const text = await page.locator('.text-5xl').first().innerText();
  return Number(text.replace(/[^0-9]/g, ''));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('shows the app title and version', async ({ page }) => {
  await expect(page.getByRole('heading', { name: "Evelyn's Math Trainer" })).toBeVisible();
  await expect(page.getByText(/^v\d+\.\d+\.\d+$/)).toBeVisible();
});

test('plays a typed square-root round to the summary', async ({ page }) => {
  await page.getByRole('button', { name: 'Square roots' }).click();
  await page.getByRole('button', { name: 'Type answer' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  let previous = -1;
  for (let i = 0; i < 5; i++) {
    // The prompt flips between questions; wait until only the new number is on screen.
    await expect.poll(async () => (await page.locator('.text-5xl').count()) === 1 && (await readPrompt(page)) !== previous).toBe(true);
    const n = await readPrompt(page);
    previous = n;
    const input = page.getByPlaceholder('Type the root (1–100)');
    await input.fill(String(Math.round(Math.sqrt(n))));
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText("Nice! That's correct.")).toBeVisible();
    // Correct answers auto-advance after 1.2 s.
    if (i < 4) await expect(input).toHaveValue('', { timeout: 5_000 });
  }
  await expect(page.getByRole('heading', { name: 'Round summary' })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('Correct:').first()).toBeVisible();
});

test('answers a multiple-choice cube-root question', async ({ page }) => {
  await page.getByRole('button', { name: 'Cube roots' }).click();
  await page.getByRole('button', { name: 'Multiple choice' }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  const n = await readPrompt(page);
  const root = Math.round(Math.cbrt(n));
  await page.getByRole('button', { name: String(root), exact: true }).click();
  await expect(page.getByText("Nice! That's correct.")).toBeVisible();
});
