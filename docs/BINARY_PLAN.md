# Plan — Add Binary Training to Evelyn's Root Trainer (PWA)

Status: **Approved 2026-10-24. Phase 1 in progress.**

**Your decisions:** the app is renamed **Evelyn's Math Trainer**; Bits → Char is **typed only**; every phase deploys **straight to production** (push to `main` → Netlify) with a **version bump shown in the app**, and you test the live app.

**Goal:** one app where she can switch between **Square roots**, **Cube roots** and **Binary**, at any time. The binary trainer reuses everything we worked out for the Apple apps (`../Apple/`): the same rules, modes, feedback, results and pause/resume behavior, rebuilt in the PWA's existing stack. It installs on her iPhone from Safari (Add to Home Screen), with no developer setup and no parental-control changes.

---

## 0. Decisions

| Topic | Decision | Why |
|---|---|---|
| Stack | Keep Vite + React 18 + TypeScript + Tailwind + framer-motion + recharts. No new runtime dependencies. | Matches the app as it is; nothing new to learn or ship. |
| Test tooling (dev-only) | **Vitest** for logic and components (with `@testing-library/react` + `jsdom`), plus **Playwright** for end-to-end tests, run in **WebKit** (Safari's engine) at **iPhone 12 mini size (375 × 812)**. | WebKit catches iPhone Safari behavior that Chrome wouldn't. |
| Code layout | Split the 457-line `App.tsx`: `src/App.tsx` becomes a small shell with the trainer switcher; `src/roots/` holds the existing trainer (moved, behavior unchanged); `src/binary/core/` is pure TypeScript logic (a port of `BinaryCore`); `src/binary/ui/` holds the screens; `src/shared/` holds storage and confetti helpers. | Same separation as the Apple apps: logic is testable with no UI. |
| Switching trainers | **Home screen with two big buttons: Root Training and Binary Training.** Root Training opens today's layout unchanged (square/cube choice stays in its setup card). Binary Training opens the binary screens. Both have a **Home** button; mid-round it asks "End this round?" first. | Your design: a clear choice up front, with today's roots app untouched. |
| Roots trainer | **Behavior unchanged.** It gets characterization tests first, so we can prove the move didn't break anything. | Protects what already works. |
| Binary setup | A setup card in the same style as the roots card: **mode** (Bits → Char / Char → Bits), **question count** (5 · 10 · 15 presets plus a − / + stepper up to 100), **character sets** (Digits / Uppercase / Lowercase; at least one stays on), **Group bits 3+5** toggle, **Start**. | Matches how the roots setup works. No separate settings screen. |
| Char → Bits | Big **0 / 1** buttons, ⌫, **Submit** enabled only at 8 bits; taps past 8 are ignored. | Same as the Apple apps. |
| Bits → Char | Native text input. Typing keeps only the latest character. `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`, and `inputMode="numeric"` when the pool is digits only. Shows "You entered: **A**", with **Retry** and **Submit**. Case-sensitive. | The iPhone keyboard works here, so there's no Scribble problem. |
| Feedback | Full-screen green or red, with symbol + word and `A = 010 00001` (always the pair). "You: …" when wrong. **Confetti** with a 🎉 replay button on correct answers. A big **Next** button, and tapping anywhere goes next. | The design we settled on, including the contrast fixes. |
| Results | Score `x / n`, average time, and a bar chart: correct bars solid green, wrong bars red stripes (an SVG pattern), not color-only. **Play again** and **Back to setup**. | The same design as the Apple apps. |
| Pause/resume | Leaving the app (`visibilitychange` → hidden) suspends the timer and saves the round to `localStorage`. On return, or on a fresh launch with a saved round: **Resume / New round**, then **3-2-1**. A quick notification pull-down doesn't pause it. | The same rules as the Apple apps. iOS often kills home-screen PWAs in the background, so the save matters. |
| Haptics | **None.** iOS Safari has no vibration API. Confetti and color carry the feedback. | Platform limit. |
| Accessibility | WCAG AA contrast, tap targets ≥ 44 px, `aria-label`s that read bits digit by digit, `prefers-reduced-motion` turns off confetti and flashes, and iPhone safe areas are respected. | Same standard as before. |
| **Offline / update fix** | Rewrite `public/sw.js`: page loads go to the network first (falling back to the cache offline); built assets are cached as they load; old caches are cleared on activate; a new version takes over on the next launch. | **The current worker keeps serving the first version of the page it saved,** so a new deploy can fail to reach her phone or load a blank screen. This has to be fixed for her to ever see binary training. |
| Deploy flow | After each phase's gate passes: bump the version (`package.json`, shown in the app header, e.g. `v0.4.0`), commit, and **push to `main`**; Netlify deploys to production. You confirm the new version number on her phone. | Your call: fast loop, and the version number shows when the deploy is live. |


---

## 1. How each phase runs
Same loop as the Apple build: **Opus** writes the spec and interfaces → **Sonnet** agents implement in parallel → **Haiku** writes and runs tests → **Opus** reviews → short report.

**Gate (Haiku; the next phase can't start until all pass):**
```bash
npm run build
npx vitest run
npx playwright test
```
Plus screenshots of every new screen at 375 × 812 in WebKit, saved to `screenshots/phase-N/` for review.

---

## 2. Phases

### Phase 1 — Foundation (no visible change)
| Task | Owner |
|---|---|
| Add Vitest, Testing Library and Playwright (WebKit only, iPhone 12 mini viewport); `npm test` and `npm run e2e` scripts | Haiku |
| Move the pure roots functions (`generateQA`, `buildMCOptions`, tip math) into `src/roots/logic.ts` unchanged, and write **characterization tests** that pin their current behavior | Sonnet, tests by Haiku |
| Port `BinaryCore` to `src/binary/core/`: character groups (from real ASCII codes), codec, answer checker (trim, case-sensitive, exactly 8 bits), question pool (no back-to-back repeats), bit formatting (3 + 5), session (timing with an injectable clock, suspend/resume, score, average), snapshot save/load, settings | Sonnet |
| Port the unit tests (the Swift suite had 133): every character round-trips, type prefixes, upper vs lower differ by one bit, pool filtering, timing with pause excluded, snapshot round-trip | Haiku |
| Service-worker fix plus a test that a new build replaces the old one | Sonnet, tests by Haiku |
| Playwright smoke test: the roots trainer still plays a full typed round and a multiple-choice round | Haiku |

### Phase 2 — Trainer switcher and Binary screens
| Task | Owner | Parallel group |
|---|---|---|
| App shell: trainer switcher, remembered choice, "End this round?" guard; roots trainer mounted from `src/roots/` | Sonnet | A |
| Binary setup card | Sonnet | A |
| Char → Bits screen | Sonnet | A |
| Bits → Char screen (keyboard handling, keep-last-character, iOS focus quirks) | Sonnet | A |
| Feedback overlay + confetti (canvas, reduced-motion aware) | Sonnet | A |
| Results (stats, striped bar chart, Play again) | Sonnet | A |
| Pause/resume: visibility handling, Resume prompt, 3-2-1 countdown | Sonnet | A |
| End-to-end tests ported from the iPhone UI tests: full set in each mode, wrong answer, 8-bit limit, keep-last-character, case-sensitivity, character-set filtering, group-bits toggle, confetti replay doesn't advance, resume after reload, Play again, switching trainers mid-round | Haiku | B |

**🛑 Checkpoint A:** deployed to production; you and she try it on her phone.

### Phase 3 — Polish and accessibility
| Task | Owner |
|---|---|
| Contrast audit in WebKit screenshots (measured ratios, fixes) | Sonnet; Haiku captures screenshots |
| Safe areas and standalone-mode check (`viewport-fit=cover`, status bar), no horizontal scroll, smallest screen | Sonnet |
| Rename to Evelyn's Math Trainer (title, header, manifest, README) — may land earlier | Sonnet |
| Optional hint: tint the first 3 bits by type (`001` digit, `010` upper, `011` lower) | Sonnet |

**🛑 Checkpoint B.**

### Every phase — ship to her phone
1. Gate passes → bump the version → commit → push to `main` → Netlify publishes (about a minute).
2. On her phone: open the app, close it fully, reopen it, and check the version in the header. After the Phase 1 offline fix, a new version takes over on the next launch.
3. If the home-screen name doesn't update after the rename, delete and re-add the icon: Safari → Share → Add to Home Screen.

---

## 3. Risks
| Risk | Mitigation |
|---|---|
| iOS only opens the keyboard when `focus()` happens during a tap | Focus the Bits → Char input inside the Start/Next tap handlers; if the keyboard still doesn't appear, show a "Tap to type" field. Checked on the real phone at Checkpoint A. |
| The current offline cache blocks updates | Fixed in Phase 1, before any binary UI ships. |
| iOS kills the PWA in the background | The round is saved to `localStorage` on hide; Resume works after a cold start. |
| Moving the roots code breaks it | Characterization tests and a Playwright smoke test come first; the roots code is moved without rewriting it. |
| `localStorage` is cleared if the PWA goes unused for a long time (Safari storage policy) | Acceptable. Settings fall back to defaults; nothing important is lost. |
