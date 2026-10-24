# Phase 2 Spec — Home screen + Binary Training UI

Owner: Opus. Plan: `docs/BINARY_PLAN.md`. The logic lives in `src/binary/core` (`docs/phase1-spec.md`), which is done and tested; import it from `../core` (or `src/binary/core`). The reference design is the iPhone app in `../Apple/BinaryPracticeiOS/*.swift`. Port its behavior; the visual style must match **this** app (light gradient page, `bg-white/70 backdrop-blur border shadow rounded-2xl` cards, purple → indigo → teal accents, rounded-xl buttons).

## Global rules
- Target: **iPhone 12 mini, 375 × 812**, iOS Safari standalone PWA. Use `min-h-[100dvh]`, no horizontal scroll, and respect safe areas (`pb-[env(safe-area-inset-bottom)]` on bottom-pinned content). Every phone width from 320 up must work.
- Tap targets ≥ 44 px; primary buttons ≥ 56 px tall.
- WCAG AA contrast. The existing gradient buttons with white text are fine; never put white text on light teal. Never color-only: right/wrong always has a symbol and a word.
- `prefers-reduced-motion: reduce` turns off confetti, flips and flashes (read it with a `useReducedMotion` hook in `src/shared/useReducedMotion.ts`; framer-motion's `useReducedMotion` is also fine).
- Bits are shown in `font-mono`, grouped per settings via `displayBits(bits, settings.groupBits)`. Screen-reader labels use `spokenBits`.
- **Every interactive or asserted element gets a `data-testid`** (listed below). The e2e tests depend on them.
- No new runtime dependencies (React, framer-motion, recharts and Tailwind are available). Function components with hooks. No `any`.

## File ownership (one owner per file)
| Files | Contents |
|---|---|
| `src/App.tsx`, `src/Home.tsx`, `src/roots/RootsTrainer.tsx`, `src/shared/AppHeader.tsx`, `src/shared/ConfirmDialog.tsx` | Shell, home, roots move |
| `src/binary/ui/BinaryTrainer.tsx`, `src/binary/ui/useBinarySession.ts`, `src/binary/ui/QuizHeader.tsx`, `src/binary/ui/ResumePrompt.tsx`, `src/binary/ui/Countdown.tsx` | Binary flow and pause/resume |
| `src/binary/ui/BinarySetup.tsx` | Setup card |
| `src/binary/ui/CharToBits.tsx`, `src/binary/ui/BitsToChar.tsx` | The two quiz screens |
| `src/binary/ui/Feedback.tsx`, `src/shared/Confetti.tsx`, `src/shared/useReducedMotion.ts` | Feedback overlay + confetti |
| `src/binary/ui/Results.tsx` | Results |
| `e2e/home.spec.ts`, `e2e/binary.spec.ts` | Tests |

## Interfaces (exact)
```ts
// src/shared/AppHeader.tsx — title "Evelyn's Math Trainer" (gradient text, as today) + `v{APP_VERSION}`
export function AppHeader(props: { onHome?: () => void; right?: React.ReactNode }): JSX.Element;
//   when onHome is set, shows a "Home" button (data-testid="header.home", house icon + "Home") at the left

// src/shared/ConfirmDialog.tsx — modal (role="dialog", aria-modal), focus trapped enough to be usable
export function ConfirmDialog(props: { open: boolean; title: string; message?: string; confirmLabel: string;
  cancelLabel?: string; onConfirm: () => void; onCancel: () => void }): JSX.Element | null;
//   buttons data-testid="confirm.ok" / "confirm.cancel"

// src/Home.tsx
export function Home(props: { onChoose: (trainer: 'roots' | 'binary') => void }): JSX.Element;

// src/roots/RootsTrainer.tsx — today's App body moved here, behavior unchanged
export function RootsTrainer(props: { onHome: () => void }): JSX.Element;

// src/binary/ui/BinaryTrainer.tsx
export function BinaryTrainer(props: { onHome: () => void }): JSX.Element;

// src/binary/ui/useBinarySession.ts — owns SessionState + persistence + visibility
export interface BinarySessionApi {
  state: SessionState | null;            // null = no round (show setup)
  awaitingResume: boolean;               // show ResumePrompt
  countingDown: boolean;                 // show Countdown
  start(mode: BinaryMode, questions: string[]): void;
  setDraft(draft: string): void;
  submit(raw: string): void;
  next(): void;                          // advance
  chooseResume(): void;                  // → countingDown
  countdownDone(): void;                 // → resume(now)
  endRound(): void;                      // clear snapshot, state = null
}
export function useBinarySession(): BinarySessionApi;

// src/binary/ui/QuizHeader.tsx — Home ✕ (data-testid="quiz.end") + progress bar + "3 of 10" (data-testid="quiz.progress")
export function QuizHeader(props: { index: number; total: number; onEnd: () => void }): JSX.Element;

export function ResumePrompt(props: { questionNumber: number; total: number; mode: BinaryMode;
  onResume: () => void; onNewRound: () => void }): JSX.Element;    // data-testid resume.prompt / resume.resume / resume.newRound
export function Countdown(props: { onDone: () => void }): JSX.Element; // data-testid="countdown"; 3,2,1 at 1 s each; calls onDone once

// src/binary/ui/BinarySetup.tsx — reads/writes settings via loadSettings/saveSettings
export function BinarySetup(props: { onStart: (settings: BinarySettings) => void }): JSX.Element;

export function CharToBits(props: { character: string; draft: string; groupBits: boolean;
  onDraft: (d: string) => void; onSubmit: () => void }): JSX.Element;
export function BitsToChar(props: { character: string; draft: string; groupBits: boolean; digitsOnly: boolean;
  onDraft: (d: string) => void; onSubmit: () => void }): JSX.Element;

// src/binary/ui/Feedback.tsx — full-screen overlay
export function Feedback(props: { result: AnswerResult; mode: BinaryMode; groupBits: boolean; isLast: boolean;
  onNext: () => void }): JSX.Element;

// src/shared/Confetti.tsx — canvas overlay, pointer-events none; each change of `burst` fires one burst
export function Confetti(props: { burst: number }): JSX.Element | null;

// src/binary/ui/Results.tsx
export function Results(props: { results: AnswerResult[]; groupBits: boolean;
  onPlayAgain: () => void; onSetup: () => void; onHome: () => void }): JSX.Element;
```

## Screens

**Shell (`App.tsx`):** `screen: 'home' | 'roots' | 'binary'`, starting at `'home'`, **unless** a valid binary snapshot exists (`loadSnapshot()`), in which case it opens `'binary'` so the Resume prompt shows. The page wrapper (gradient background, `max-w-md mx-auto p-4`) stays in App.

**Home:** `AppHeader` (no Home button), then two big cards stacked, each at least 140 px tall:
- **Root Training** (`data-testid="home.roots"`): big "√" glyph, "Square & cube roots".
- **Binary Training** (`data-testid="home.binary"`): big "01" glyph, "Letters & numbers in 8-bit code", with a tiny example `A = 010 00001`.
Purple and teal gradient fills with white text (AA). Footer: "Preferences are saved on this device."

**Roots:** today's UI, moved unchanged into `RootsTrainer`, using `AppHeader` with `onHome`. Pressing Home mid-round (`started && !showReport`) opens ConfirmDialog "End this round?" → `onHome`. Otherwise it goes straight home. Its existing "Back to setup" and "v…" header parts become the AppHeader `right` slot and the version. The roots e2e tests must still pass; they click "Root Training" first.

**Binary flow (`BinaryTrainer`):**
- No round → `AppHeader onHome` + `BinarySetup`.
- In a round → `QuizHeader` + `CharToBits` or `BitsToChar` (from `state.mode`). On `stage === 'feedback'` → `Feedback` overlay. On `finished` → `Results`.
- `quiz.end` ✕ → ConfirmDialog "End this round?" → `endRound()`, back to setup.
- Results "Home" → `endRound()` + `onHome()`. "Back to setup" → `endRound()`. "Play again" → new questions with `makeQuestions(settings.groups, settings.questionCount)` and the same mode.
- The header Home button while in setup → `onHome()`.

**useBinarySession:** uses `performance.now()` for every `now`.
- On mount: `loadSnapshot()` → `fromSnapshot` → `awaitingResume = true`.
- On `visibilitychange` to hidden (and on `pagehide`): if the state is not finished, `suspend` + `saveSnapshot(toSnapshot)`, `awaitingResume = true`, `countingDown = false`. Visible again does nothing extra; the prompt is already flagged.
- `chooseResume` clears the snapshot. A finished state or `endRound` clears the snapshot.
- Window blur/focus alone does nothing: the notification shade doesn't pause.

**BinarySetup** (one card, the same look as the roots setup card):
- Mode: **Char → Bits** (`setup.mode.charToBits`) / **Bits → Char** (`setup.mode.bitsToChar`).
- Questions: presets 5 / 10 / 15 / 20 (`setup.count.5` …) plus − / + (`setup.count.minus`, `setup.count.plus`) and the number shown (`setup.count`), range 1–100.
- Character sets: toggle chips Digits / Uppercase / Lowercase (`setup.group.digits` …, `aria-pressed`); the last enabled set can't be turned off (it's disabled).
- A "Group bits 3 + 5" switch (`setup.groupBits`, `role="switch"`, `aria-checked`) with the hint "011 00001 vs 01100001".
- Full-width **Start** (`setup.start`).
- Every change is saved immediately.

**CharToBits:** a huge character (`text-8xl`, `data-testid="c2b.character"`, `aria-label` like "Uppercase A"; tests read the last character of its text content); slots (`c2b.slots`, with `data-value` = the raw 8 chars padded with `_`, e.g. `011_____`, displayed grouped); two giant buttons **0** / **1** (`c2b.zero`, `c2b.one`, at least 96 px tall, `text-5xl`); a row with ⌫ (`c2b.backspace`) and **Submit** (`c2b.submit`, disabled until 8 bits). Input past 8 is ignored. It fits on 375 × 812 with no scrolling.

**BitsToChar:**
- Bits huge and monospaced (`b2c.bits`, `data-value` = raw bits, `aria-label` via spokenBits).
- An `<input>` (`b2c.input`) with `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}`, `autoComplete="off"`, `inputMode={digitsOnly ? 'numeric' : 'text'}`, `enterKeyHint="done"`. Its value is `draft`, and onChange sends `keepLastCharacter(value)`. Enter submits when there's a draft.
- Focus it in `useLayoutEffect` when the character changes, so iOS opens the keyboard during the tap that showed the question. If it isn't focused (e.g. after the countdown), a visible "Tap here to type" target focuses it.
- A big preview "You entered: **A**" (`b2c.preview`, `data-value` = draft).
- **Retry** (`b2c.retry`) clears the draft and refocuses. **Submit** (`b2c.submit`, a strong gradient fill when enabled, clearly greyed when disabled).
- Blur the input on submit so the keyboard drops for the feedback.
- Everything sits in the top ~430 px so the keyboard never covers it.

**Feedback** (fixed `inset-0 z-40`):
- Background: darkened green `#15803d` or red `#b91c1c` (white text ≥ 4.5:1).
- A big ✓ / ✗ in a white circle + "Correct!" / "Not quite" (`feedback.status`, `data-value` "correct" / "wrong").
- The pair `A = 010 00001` (`feedback.pair`). When wrong: "You: B" (Mode 1) or "You: 100 11110" (Mode 2).
- On correct, unless reduced motion: Confetti fires on mount, and a 🎉 button (`feedback.confetti`, aria-label "Celebrate again") fires another burst and must **not** advance (stopPropagation).
- **Next** / **See results** (`feedback.next`), black text on white, at least 56 px tall.
- A tap anywhere else also advances.
- A short fade-in (none with reduced motion).

**Confetti:** a single `<canvas>` fixed full-screen with `pointer-events-none`. About 60 pieces (rectangles and circles, bright colors), launched upward and outward from the top-center, falling with gravity and spinning, gone within about 1.6 s. Positions are computed from elapsed time; use `requestAnimationFrame`, stopping when no pieces are left. DPR-aware.

**Results:**
- `x / n` (`results.score`) and "Average 4.2 s" (`results.average`).
- A recharts `BarChart` (`results.chart`): one bar per question, seconds on Y. Correct bars are solid green `#16a34a`; wrong bars use an SVG `<pattern>` of red diagonal stripes (`#dc2626`) via `<Cell fill="url(#wrongStripes)">`. A custom legend shows solid = Correct and striped = Wrong. Past 20 questions the chart sits in an `overflow-x-auto` wrapper, about 18 px per bar.
- Buttons: **Play again** (`results.playAgain`, gradient), **Back to setup** (`results.setup`), **Home** (`results.home`).

## E2E coverage (`e2e/binary.spec.ts`, `e2e/home.spec.ts`)
Every test starts with `localStorage.clear()` and a reload.
- Home: both cards are visible; Root Training opens the roots setup and Home returns; Binary Training opens the binary setup and Home returns; Home mid-round in roots asks for confirmation (Cancel stays, OK goes home).
- Char → Bits full set (5 questions): read the character, compute bits from `charCodeAt(0).toString(2).padStart(8,'0')`, tap them, Submit → `feedback.status` is `correct` → Next … → `results.score` reads "5 / 5".
- A wrong answer → `wrong`, with "You:" shown.
- Input limits: Submit is disabled at 7 bits; the 9th tap is ignored (`data-value` stays 8 long); backspace works.
- Bits → Char full set: read `b2c.bits` `data-value`, type `String.fromCharCode(parseInt(bits, 2))` with `page.keyboard.type`, Submit → correct ×5 → "5 / 5".
- Keep-last-character: type "a" then "b" → preview `b`; Retry → empty, Submit disabled.
- Case-sensitive: uppercase only (turn off the Digits and Lowercase chips); type the lowercase letter → wrong.
- Character sets: digits only → every Char → Bits character is a digit; the last chip can't be turned off.
- The group-bits switch toggles the slot display (`011 0____` vs `0110____` text) without changing `data-value`.
- Confetti replay doesn't advance (`feedback.status` is still visible after 2 taps); no confetti button on a wrong answer.
- Resume: start a round, enter 3 bits, then `page.evaluate` to dispatch `visibilitychange` with `document.visibilityState` overridden to hidden (use `Object.defineProperty`), then reload → `resume.prompt` → Resume → `countdown` appears and disappears within 5 s → slots `data-value` `011_____` (or whatever was entered).
- New round from the Resume prompt → the setup shows.
- End round via ✕ → confirm → the setup shows.
- Play again → a new round at "1 of N".
