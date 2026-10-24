import { expect, test, type Page } from '@playwright/test';

// Binary trainer: setup, both quiz modes, input rules, feedback, results, and pause/resume.

type Group = 'digits' | 'uppercase' | 'lowercase';
type Mode = 'charToBits' | 'bitsToChar';

const ALL: Group[] = ['digits', 'uppercase', 'lowercase'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ---------- helpers ----------

export function bitsOf(ch: string): string {
  return ch.charCodeAt(0).toString(2).padStart(8, '0');
}

function flipFirstBit(bits: string): string {
  return (bits[0] === '0' ? '1' : '0') + bits.slice(1);
}

async function openBinary(page: Page) {
  await page.getByTestId('home.binary').click();
  await expect(page.getByTestId('setup.start')).toBeVisible();
}

async function setChip(page: Page, group: Group, on: boolean) {
  const chip = page.getByTestId(`setup.group.${group}`);
  const pressed = (await chip.getAttribute('aria-pressed')) === 'true';
  if (pressed !== on) await chip.click();
}

// Sets mode, question count (via − / +) and character sets. Does not start the round.
async function configure(page: Page, opts: { mode: Mode; count: number; groups: Group[] }) {
  await page.getByTestId(`setup.mode.${opts.mode}`).click();

  for (let guard = 0; guard < 200; guard++) {
    const current = Number((await page.getByTestId('setup.count').innerText()).replace(/\D/g, ''));
    if (current === opts.count) break;
    await page.getByTestId(current < opts.count ? 'setup.count.plus' : 'setup.count.minus').click();
  }

  // Turn wanted sets on first, then unwanted ones off, so the last enabled set is never disabled.
  const wanted = new Set(opts.groups);
  for (const g of ALL) if (wanted.has(g)) await setChip(page, g, true);
  for (const g of ALL) if (!wanted.has(g)) await setChip(page, g, false);
}

async function startRound(page: Page, count: number) {
  await page.getByTestId('setup.start').click();
  await expect(page.getByTestId('quiz.progress')).toHaveText(`1 of ${count}`);
}

async function progressText(page: Page): Promise<string> {
  const loc = page.getByTestId('quiz.progress');
  if ((await loc.count()) === 0) return 'gone';
  return (await loc.innerText()).trim();
}

// Moves past the feedback overlay and waits until the progress text changes
// (or the round has ended), so the next character is never read too early.
async function nextQuestion(page: Page) {
  const before = await progressText(page);
  await page.getByTestId('feedback.next').click();
  await expect.poll(async () => (await progressText(page)) !== before).toBe(true);
}

async function tapBits(page: Page, bits: string) {
  for (const b of bits) {
    await page.getByTestId(b === '0' ? 'c2b.zero' : 'c2b.one').click();
  }
}

async function answerCharToBits(page: Page, correct = true): Promise<string> {
  const text = (await page.getByTestId('c2b.character').textContent()) ?? '';
  const ch = text.trim().slice(-1);
  const bits = correct ? bitsOf(ch) : flipFirstBit(bitsOf(ch));
  await tapBits(page, bits);
  await page.getByTestId('c2b.submit').click();
  await expect(page.getByTestId('feedback.status')).toHaveAttribute('data-value', correct ? 'correct' : 'wrong');
  return ch;
}

async function submitTyped(page: Page, typed: string, expected: 'correct' | 'wrong') {
  const input = page.getByTestId('b2c.input');
  await input.focus();
  await page.keyboard.type(typed);
  await page.getByTestId('b2c.submit').click();
  await expect(page.getByTestId('feedback.status')).toHaveAttribute('data-value', expected);
}

async function answerBitsToChar(page: Page, correct = true): Promise<string> {
  const bits = (await page.getByTestId('b2c.bits').getAttribute('data-value')) ?? '';
  const ch = String.fromCharCode(parseInt(bits, 2));
  const typed = correct ? ch : ch === '0' ? '1' : '0';
  await submitTyped(page, typed, correct ? 'correct' : 'wrong');
  return ch;
}

// Answers and advances through a whole round of `count` questions.
async function answerAll(page: Page, mode: Mode, count: number) {
  for (let i = 0; i < count; i++) {
    if (mode === 'charToBits') await answerCharToBits(page);
    else await answerBitsToChar(page);
    await nextQuestion(page);
  }
}

// Simulates the app being backgrounded and then relaunched.
async function leaveApp(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.reload();
}

// ---------- tests ----------

test('Char → Bits full set plays 5 of 5', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);

  await answerAll(page, 'charToBits', 5);
  await expect(page.getByTestId('results.score')).toHaveText(/5\s*\/\s*5/);
});

test('a wrong answer shows wrong and "You:"', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);

  await answerCharToBits(page, false);
  await expect(page.getByTestId('feedback.pair')).toBeVisible();
  await expect(page.getByText(/You:/).first()).toBeVisible();
});

test('Submit is disabled at 7 bits, the 9th tap is ignored, and backspace works', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);

  const slots = page.getByTestId('c2b.slots');
  const submit = page.getByTestId('c2b.submit');

  await tapBits(page, '0110000');
  await expect(slots).toHaveAttribute('data-value', '0110000_');
  await expect(submit).toBeDisabled();

  await tapBits(page, '1');
  await expect(slots).toHaveAttribute('data-value', '01100001');
  await expect(submit).toBeEnabled();

  // A 9th bit is ignored.
  await page.getByTestId('c2b.one').click();
  await expect(slots).toHaveAttribute('data-value', '01100001');

  await page.getByTestId('c2b.backspace').click();
  await expect(slots).toHaveAttribute('data-value', '0110000_');
  await expect(submit).toBeDisabled();
});

test('Bits → Char full set plays 5 of 5', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'bitsToChar', count: 5, groups: ALL });
  await startRound(page, 5);

  await answerAll(page, 'bitsToChar', 5);
  await expect(page.getByTestId('results.score')).toHaveText(/5\s*\/\s*5/);
});

test('keeps only the last typed character, and Retry clears it', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'bitsToChar', count: 5, groups: ALL });
  await startRound(page, 5);

  const input = page.getByTestId('b2c.input');
  const preview = page.getByTestId('b2c.preview');
  await input.focus();
  await page.keyboard.type('a');
  await page.keyboard.type('b');
  await expect(input).toHaveValue('b');
  await expect(preview).toHaveAttribute('data-value', 'b');

  await page.getByTestId('b2c.retry').click();
  await expect(input).toHaveValue('');
  await expect(preview).toHaveAttribute('data-value', '');
  await expect(page.getByTestId('b2c.submit')).toBeDisabled();
  await expect(input).toBeFocused();
});

test('is case-sensitive: the lowercase letter is wrong for an uppercase question', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'bitsToChar', count: 5, groups: ['uppercase'] });
  await startRound(page, 5);

  const bits = (await page.getByTestId('b2c.bits').getAttribute('data-value')) ?? '';
  const ch = String.fromCharCode(parseInt(bits, 2));
  expect(ch).toMatch(/^[A-Z]$/);

  await submitTyped(page, ch.toLowerCase(), 'wrong');
});

test('digits-only set asks only digit characters, and the last chip cannot be turned off', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ['digits'] });

  const digits = page.getByTestId('setup.group.digits');
  await expect(digits).toBeDisabled();
  await expect(digits).toHaveAttribute('aria-pressed', 'true');

  await startRound(page, 5);
  for (let i = 0; i < 5; i++) {
    const ch = await answerCharToBits(page);
    expect(ch).toMatch(/^[0-9]$/);
    await nextQuestion(page);
  }
});

test('group-bits switch changes the slot display but not data-value', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });

  const toggle = page.getByTestId('setup.groupBits');
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  await startRound(page, 5);
  await tapBits(page, '0110');
  const slots = page.getByTestId('c2b.slots');
  await expect(slots).toHaveAttribute('data-value', '0110____');
  await expect(slots).toContainText('011 0');

  // The setup is the only place to change grouping, so end the round and switch it off.
  await page.getByTestId('quiz.end').click();
  await page.getByTestId('confirm.ok').click();
  await expect(page.getByTestId('setup.start')).toBeVisible();

  await page.getByTestId('setup.groupBits').click();
  await expect(page.getByTestId('setup.groupBits')).toHaveAttribute('aria-checked', 'false');

  await startRound(page, 5);
  await tapBits(page, '0110');
  await expect(slots).toHaveAttribute('data-value', '0110____');
  await expect(slots).toContainText('0110');
  await expect(slots).not.toContainText('011 0');
});

test('confetti replay does not advance; no confetti button on a wrong answer', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);

  await answerCharToBits(page, true);
  const status = page.getByTestId('feedback.status');
  const confetti = page.getByTestId('feedback.confetti');
  await expect(confetti).toBeVisible();

  await confetti.click();
  await confetti.click();
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('data-value', 'correct');
  await expect(page.getByTestId('quiz.progress')).toHaveText('1 of 5');

  await nextQuestion(page);
  await answerCharToBits(page, false);
  await expect(page.getByTestId('feedback.confetti')).toHaveCount(0);
});

test('resume: leaving mid-round shows the prompt and resumes with the entered bits', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);
  await tapBits(page, '011');

  await leaveApp(page);
  await expect(page.getByTestId('resume.prompt')).toBeVisible();

  await page.getByTestId('resume.resume').click();
  await expect(page.getByTestId('countdown')).toBeVisible();
  await expect(page.getByTestId('countdown')).toBeHidden({ timeout: 5_000 });
  await expect(page.getByTestId('c2b.slots')).toHaveAttribute('data-value', '011_____');
});

test('New round from the Resume prompt shows the setup', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);
  await tapBits(page, '011');

  await leaveApp(page);
  await expect(page.getByTestId('resume.prompt')).toBeVisible();
  await page.getByTestId('resume.newRound').click();
  await expect(page.getByTestId('setup.start')).toBeVisible();
});

test('ending a round with ✕ and confirming returns to the setup', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);

  await page.getByTestId('quiz.end').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('confirm.ok').click();
  await expect(page.getByTestId('setup.start')).toBeVisible();
});

test('Play again starts a new round at 1 of N', async ({ page }) => {
  await openBinary(page);
  await configure(page, { mode: 'charToBits', count: 5, groups: ALL });
  await startRound(page, 5);

  await answerAll(page, 'charToBits', 5);
  await expect(page.getByTestId('results.score')).toBeVisible();

  await page.getByTestId('results.playAgain').click();
  await expect(page.getByTestId('quiz.progress')).toHaveText('1 of 5');
});
