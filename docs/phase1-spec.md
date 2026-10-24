# Phase 1 Spec — Foundation (Evelyn's Math Trainer PWA)

Owner: Opus. Implementers and test writers must match these signatures exactly. Plan: `docs/BINARY_PLAN.md`. The logic is a TypeScript port of the tested Swift package in `../Apple/BinaryCore/Sources/BinaryCore/`; read those files for behavior details.

General: TypeScript strict-friendly, no `any` in new code, pure functions, no React in `src/binary/core/`. Tests sit next to the code as `*.test.ts` (Vitest, jsdom). Randomness is injected as `rng: () => number` (range [0, 1)); the default is `Math.random`.

---

## A. Binary core — `src/binary/core/`

### `characters.ts`
```ts
export type CharacterGroup = 'digits' | 'uppercase' | 'lowercase';
export const CHARACTER_GROUPS: readonly CharacterGroup[];             // ['digits','uppercase','lowercase']
export const GROUP_RANGES: Record<CharacterGroup, readonly [number, number]>; // [0x30,0x39], [0x41,0x5A], [0x61,0x7A]
export const GROUP_LABEL: Record<CharacterGroup, string>;              // 'Digits' | 'Uppercase' | 'Lowercase'
export function charactersIn(group: CharacterGroup): string[];         // built from GROUP_RANGES via String.fromCharCode
export const ALL_CHARACTERS: readonly string[];                         // 62: digits, then upper, then lower
export function groupOf(ch: string): CharacterGroup | null;            // null unless exactly one char in a group
```

### `codec.ts`
```ts
export function bitsFor(ch: string): string | null;   // 8 chars of '0'/'1' for a single ASCII char (code 0–127), else null
export function charFor(bits: string): string | null; // inverse; null unless exactly 8 '0'/'1' and value <= 127
```

### `formatting.ts`
```ts
export function groupBits(bits: string, separator?: string): string;      // "01100001" → "011 00001"; ≤ 3 chars unchanged; default ' '
export function displayBits(bits: string, grouped: boolean): string;      // grouped ? groupBits(bits) : bits
export function spokenBits(bits: string): string;                          // "zero one one, zero zero zero zero one"; '_' → "blank"; comma after the 3rd
```

### `answers.ts`
```ts
export type BinaryMode = 'bitsToChar' | 'charToBits';
export function normalizeCharacter(raw: string): string | null; // trim whitespace; first char; null if empty
export function keepLastCharacter(raw: string): string;          // last non-whitespace char, or '' (for the Bits→Char input)
export function isCompleteBits(s: string): boolean;              // exactly 8, each '0' | '1'
export function expectedAnswer(target: string, mode: BinaryMode): string; // bitsToChar → target; charToBits → bitsFor(target)
export function normalizeAnswer(raw: string, mode: BinaryMode): string;   // bitsToChar → normalizeCharacter ?? ''; charToBits → trimmed
export function isCorrect(raw: string, target: string, mode: BinaryMode): boolean; // case-sensitive
```

### `pool.ts`
```ts
export type Rng = () => number;
export function poolCharacters(groups: readonly CharacterGroup[]): string[]; // ALL_CHARACTERS order; throws if groups is empty
export function nextCharacter(pool: readonly string[], previous: string | null, rng?: Rng): string; // never === previous when pool.length > 1
export function makeQuestions(groups: readonly CharacterGroup[], count: number, rng?: Rng): string[]; // count ≥ 1; no consecutive repeats
```

### `session.ts` — serializable state machine (React stores it in `useReducer`/`useState`)
```ts
export type Stage = 'answering' | 'feedback' | 'finished';
export type Clock = () => number;            // ms, monotonic within a page load (performance.now)
export interface AnswerResult { character: string; given: string; correct: boolean; ms: number; }
export interface SessionState {
  mode: BinaryMode;
  questions: string[];
  index: number;
  stage: Stage;
  results: AnswerResult[];
  draft: string;                  // partial Char→Bits bits or the Bits→Char character
  suspended: boolean;
  accumulatedMs: number;          // time on the current question before the running segment
  segmentStart: number | null;    // clock value when the running segment began; null when stopped
}
export function createSession(mode: BinaryMode, questions: string[], now: number): SessionState; // throws if questions is empty; answering, running
export function currentCharacter(s: SessionState): string | null;   // null when finished
export function elapsedMs(s: SessionState, now: number): number;    // 0 unless answering
export function setDraft(s: SessionState, draft: string): SessionState;
export function submit(s: SessionState, raw: string, now: number): SessionState;  // only when answering && !suspended; records the result (normalized given), → feedback, draft ''
export function advance(s: SessionState, now: number): SessionState;  // only from feedback && !suspended; last → finished; else next question, timer from 0
export function suspend(s: SessionState, now: number): SessionState; // answering: bank elapsed, stop; feedback: mark; finished: no-op
export function resume(s: SessionState, now: number): SessionState;  // no-op unless suspended; answering → restart segment; feedback → advance
export function score(s: SessionState): number;
export function averageMs(s: SessionState): number | null;
export function lastResult(s: SessionState): AnswerResult | null;

export interface Snapshot {        // stores elapsed, not clock values (performance.now resets on every page load)
  version: 1;
  mode: BinaryMode; questions: string[]; index: number; stage: Exclude<Stage, 'finished'>;
  results: AnswerResult[]; draft: string; elapsedMs: number;
}
export function toSnapshot(s: SessionState, now: number): Snapshot | null; // null when finished
export function fromSnapshot(snap: Snapshot): SessionState;               // suspended: true, segmentStart: null, accumulatedMs = elapsedMs
export function isSnapshot(value: unknown): value is Snapshot;           // strict validation (characters valid, index in range…)
```

### `storage.ts`
```ts
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const STORAGE_KEYS: { binarySettings: 'emt_binary_settings'; binarySnapshot: 'emt_binary_snapshot' };
export interface BinarySettings { mode: BinaryMode; groups: CharacterGroup[]; groupBits: boolean; questionCount: number; }
export const DEFAULT_SETTINGS: BinarySettings; // mode 'charToBits', all three groups, groupBits true, questionCount 10
export const QUESTION_COUNT_RANGE: readonly [1, 100];
export function clampCount(n: number): number;                                // round, then clamp to 1–100; NaN → 10
export function toggleGroup(groups: readonly CharacterGroup[], g: CharacterGroup): CharacterGroup[]; // can't remove the last; result in CHARACTER_GROUPS order
export function loadSettings(store?: KeyValueStore): BinarySettings;          // validates each field; falls back per field to defaults
export function saveSettings(settings: BinarySettings, store?: KeyValueStore): void;
export function saveSnapshot(snap: Snapshot, store?: KeyValueStore): void;
export function loadSnapshot(store?: KeyValueStore): Snapshot | null;         // invalid data → removed, null
export function clearSnapshot(store?: KeyValueStore): void;
```
The default `store` is `localStorage`, accessed inside a try/catch (private mode can throw).

### `index.ts`
Re-exports everything above.

---

## B. Roots logic extraction — `src/roots/logic.ts`
Move these **unchanged** out of `src/App.tsx` and export them: `ROOT_MIN`, `ROOT_MAX`, `cubeLastDigitMap`, `squareLookup`, `choice`, `shuffle`, `clamp`, `avg`, `msToSeconds`, `rootsExcept`, `generateQA`, `buildMCOptions`, and the types `Mode`, `InputType`, `RoundPreset`, `SessionConfig`, `QA`, `Result`. `App.tsx` imports them. **No behavior change.** The UI move comes in Phase 2.

## C. Version and rename
- `src/version.ts`: `export const APP_VERSION: string`, read from `package.json` (`import pkg from '../package.json'`).
- The header shows `v{APP_VERSION}` in place of the hard-coded `v0.3`.
- Rename to **Evelyn's Math Trainer**: `<title>`, the header `<h1>`, the manifest `name` ("Evelyn's Math Trainer") and `short_name` ("Math Trainer"), and the README title and intro (square roots, cube roots and binary).
- The version bump to `0.4.0` happens at deploy time, not in this phase's code.

## D. Service worker — `public/sw.js`
- Registered as `/sw.js?v=${APP_VERSION}` from `src/main.tsx`, so a new version is a new script URL and the browser installs it.
- `const VERSION = new URL(self.location).searchParams.get('v') || 'dev'`; `CACHE = 'emt-' + VERSION`.
- install: precache `/`, `/index.html`, `/manifest.webmanifest` and the icons; `self.skipWaiting()`.
- activate: delete every cache except `CACHE`; `self.clients.claim()`.
- fetch: same-origin GET only (pass everything else through).
  - Navigations (`request.mode === 'navigate'`): **network-first**; update the cached `/index.html`; offline → cached `/index.html`.
  - Other requests: **stale-while-revalidate** (return the cache if present; fetch and update the cache in the background).
- Keep it small and commented.

## E. Tooling
- devDependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`.
- `vite.config.ts`: add `test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] }` (use `/// <reference types="vitest/config" />` or `defineConfig` from `vitest/config`).
- Scripts: `"test": "vitest run"`, `"e2e": "playwright test"`.
- `playwright.config.ts`: one project, **WebKit**, viewport 375×812, `deviceScaleFactor: 3`, `isMobile: true`, `hasTouch: true` (the iPhone 12 mini). `webServer`: `npm run build && npm run preview -- --port 4173 --strictPort`, `baseURL` `http://localhost:4173`. Tests live in `e2e/`.
- `e2e/roots.spec.ts` smoke test: the home page loads with the title "Evelyn's Math Trainer"; a 5-question **typed** square-root round can be played to the summary (read the prompt, type `Math.round(Math.sqrt(n))`); a multiple-choice round answers one question.
- `.gitignore`: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`.
