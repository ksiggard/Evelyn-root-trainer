import { isCorrect, normalizeAnswer, type BinaryMode } from './answers';
import { ALL_CHARACTERS } from './characters';

/** Where a session is in its question cycle. */
export type Stage = 'answering' | 'feedback' | 'finished';

/** Milliseconds, monotonic within a page load (performance.now). */
export type Clock = () => number;

/** One graded answer. `ms` is the time spent on the question. */
export interface AnswerResult {
  character: string;
  given: string;
  correct: boolean;
  ms: number;
}

/** Everything about a running set. Plain data; every function returns a new object. */
export interface SessionState {
  mode: BinaryMode;
  questions: string[];
  index: number;
  stage: Stage;
  results: AnswerResult[];
  /** Partial Char->Bits bits or the Bits->Char character. */
  draft: string;
  suspended: boolean;
  /** Time on the current question before the running segment. */
  accumulatedMs: number;
  /** Clock value when the running segment began; null when stopped. */
  segmentStart: number | null;
}

/** Starts on question 0 in `answering` with the timer running. Throws if `questions` is empty. */
export function createSession(mode: BinaryMode, questions: string[], now: number): SessionState {
  if (questions.length === 0) throw new Error('A session needs at least one question');
  return {
    mode,
    questions: [...questions],
    index: 0,
    stage: 'answering',
    results: [],
    draft: '',
    suspended: false,
    accumulatedMs: 0,
    segmentStart: now,
  };
}

/** `questions[index]` unless finished, then null. */
export function currentCharacter(s: SessionState): string | null {
  return s.stage === 'finished' ? null : (s.questions[s.index] ?? null);
}

/** Time on the current question so far. 0 unless answering. */
export function elapsedMs(s: SessionState, now: number): number {
  if (s.stage !== 'answering') return 0;
  if (s.segmentStart === null) return s.accumulatedMs;
  return s.accumulatedMs + Math.max(0, now - s.segmentStart);
}

/** Stores the in-progress entry. */
export function setDraft(s: SessionState, draft: string): SessionState {
  return { ...s, draft };
}

/** Grades and records an answer. Returns `s` unchanged unless answering and not suspended. */
export function submit(s: SessionState, raw: string, now: number): SessionState {
  const character = currentCharacter(s);
  if (s.stage !== 'answering' || s.suspended || character === null) return s;
  const result: AnswerResult = {
    character,
    given: normalizeAnswer(raw, s.mode),
    correct: isCorrect(raw, character, s.mode),
    ms: elapsedMs(s, now),
  };
  return {
    ...s,
    results: [...s.results, result],
    stage: 'feedback',
    draft: '',
    accumulatedMs: 0,
    segmentStart: null,
  };
}

/** Moves on from feedback: to the next question, or to `finished` after the last. */
export function advance(s: SessionState, now: number): SessionState {
  if (s.stage !== 'feedback' || s.suspended) return s;
  if (s.index + 1 >= s.questions.length) {
    return { ...s, stage: 'finished', draft: '', accumulatedMs: 0, segmentStart: null };
  }
  return {
    ...s,
    index: s.index + 1,
    stage: 'answering',
    draft: '',
    accumulatedMs: 0,
    segmentStart: now,
  };
}

/** Pauses. While answering, banks the elapsed time and stops the timer. */
export function suspend(s: SessionState, now: number): SessionState {
  if (s.suspended) return s;
  switch (s.stage) {
    case 'answering':
      return { ...s, suspended: true, accumulatedMs: elapsedMs(s, now), segmentStart: null };
    case 'feedback':
      return { ...s, suspended: true };
    case 'finished':
      return s;
  }
}

/** Resumes a suspended session. Answering: the timer continues; feedback: advances to the next question. */
export function resume(s: SessionState, now: number): SessionState {
  if (!s.suspended) return s;
  const running: SessionState = { ...s, suspended: false };
  switch (s.stage) {
    case 'answering':
      return { ...running, segmentStart: now };
    case 'feedback':
      return advance(running, now);
    case 'finished':
      return running;
  }
}

/** Number of correct results. */
export function score(s: SessionState): number {
  return s.results.filter((r) => r.correct).length;
}

/** Mean of result durations in ms; null when there are no results. */
export function averageMs(s: SessionState): number | null {
  if (s.results.length === 0) return null;
  return s.results.reduce((sum, r) => sum + r.ms, 0) / s.results.length;
}

/** The most recent result, or null. */
export function lastResult(s: SessionState): AnswerResult | null {
  return s.results.length ? s.results[s.results.length - 1] : null;
}

/** Saved form of a paused set. Stores elapsed time, not clock values (performance.now resets per page load). */
export interface Snapshot {
  version: 1;
  mode: BinaryMode;
  questions: string[];
  index: number;
  stage: Exclude<Stage, 'finished'>;
  results: AnswerResult[];
  draft: string;
  elapsedMs: number;
}

/** The full state as a snapshot, or null when finished. Works whether or not suspended. */
export function toSnapshot(s: SessionState, now: number): Snapshot | null {
  if (s.stage === 'finished') return null;
  return {
    version: 1,
    mode: s.mode,
    questions: [...s.questions],
    index: s.index,
    stage: s.stage,
    results: s.results.map((r) => ({ ...r })),
    draft: s.draft,
    elapsedMs: elapsedMs(s, now),
  };
}

/** Rebuilds a session from a snapshot, suspended with the timer stopped. Call `resume` to continue. */
export function fromSnapshot(snap: Snapshot): SessionState {
  return {
    mode: snap.mode,
    questions: [...snap.questions],
    index: snap.index,
    stage: snap.stage,
    results: snap.results.map((r) => ({ ...r })),
    draft: snap.draft,
    suspended: true,
    accumulatedMs: snap.elapsedMs,
    segmentStart: null,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidChar(v: unknown): v is string {
  return typeof v === 'string' && ALL_CHARACTERS.includes(v);
}

function isNonNegative(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function isResult(v: unknown): v is AnswerResult {
  return (
    isObject(v) &&
    isValidChar(v.character) &&
    typeof v.given === 'string' &&
    typeof v.correct === 'boolean' &&
    isNonNegative(v.ms)
  );
}

/** Strict validation of untrusted data (characters valid, index in range, results consistent with stage). */
export function isSnapshot(value: unknown): value is Snapshot {
  if (!isObject(value)) return false;
  if (value.version !== 1) return false;
  if (value.mode !== 'bitsToChar' && value.mode !== 'charToBits') return false;
  if (value.stage !== 'answering' && value.stage !== 'feedback') return false;
  const { questions, index, results } = value;
  if (!Array.isArray(questions) || questions.length === 0 || !questions.every(isValidChar)) return false;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= questions.length) return false;
  if (!Array.isArray(results) || !results.every(isResult)) return false;
  const expectedResults = value.stage === 'feedback' ? index + 1 : index;
  if (results.length !== expectedResults) return false;
  if (typeof value.draft !== 'string') return false;
  return isNonNegative(value.elapsedMs);
}
