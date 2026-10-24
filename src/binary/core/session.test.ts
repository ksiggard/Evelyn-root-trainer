import { describe, it, expect } from 'vitest';
import {
  advance,
  averageMs,
  createSession,
  currentCharacter,
  elapsedMs,
  fromSnapshot,
  isSnapshot,
  lastResult,
  resume,
  score,
  setDraft,
  submit,
  suspend,
  toSnapshot,
  type SessionState,
  type Snapshot,
} from './session';

const QUESTIONS = ['A', 'B', 'C'];

function fresh(now = 0, questions: string[] = QUESTIONS): SessionState {
  return createSession('bitsToChar', questions, now);
}

/** Freezes an object graph so any in-place mutation throws (ESM modules are strict). */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

/** Deep-copies JSON-compatible state so a later comparison detects mutation. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('createSession', () => {
  it('starts on the first question, answering, running, with no results', () => {
    const s = createSession('charToBits', QUESTIONS, 1000);
    expect(s.mode).toBe('charToBits');
    expect(s.questions).toEqual(QUESTIONS);
    expect(s.index).toBe(0);
    expect(s.stage).toBe('answering');
    expect(s.results).toEqual([]);
    expect(s.draft).toBe('');
    expect(s.suspended).toBe(false);
    expect(s.accumulatedMs).toBe(0);
    expect(s.segmentStart).toBe(1000);
    expect(currentCharacter(s)).toBe('A');
    expect(lastResult(s)).toBeNull();
    expect(score(s)).toBe(0);
    expect(averageMs(s)).toBeNull();
  });

  it('throws when there are no questions', () => {
    expect(() => createSession('bitsToChar', [], 0)).toThrow();
  });

  it('counts elapsed time from the given now', () => {
    const s = fresh(1000);
    expect(elapsedMs(s, 2500)).toBe(1500);
  });
});

describe('currentCharacter and elapsedMs', () => {
  it('returns null for the character once finished', () => {
    let s = fresh(0, ['A']);
    s = submit(s, 'A', 1000) as SessionState;
    s = advance(s, 1000);
    expect(currentCharacter(s)).toBeNull();
  });

  it('is 0 while in feedback', () => {
    const s = submit(fresh(0), 'A', 1000) as SessionState;
    expect(elapsedMs(s, 5000)).toBe(0);
  });

  it('is 0 once finished', () => {
    let s = fresh(0, ['A']);
    s = submit(s, 'A', 1000) as SessionState;
    s = advance(s, 1000);
    expect(elapsedMs(s, 9000)).toBe(0);
  });
});

describe('setDraft', () => {
  it('sets the draft and leaves the rest of the state alone', () => {
    const before = fresh(0);
    const after = setDraft(before, 'B');
    expect(after.draft).toBe('B');
    expect({ ...after, draft: '' }).toEqual({ ...before, draft: '' });
  });
});

describe('submit', () => {
  it('records a correct answer with its duration and moves to feedback', () => {
    const s = submit(fresh(0), 'A', 3000) as SessionState;
    expect(s.stage).toBe('feedback');
    expect(s.results).toEqual([{ character: 'A', given: 'A', correct: true, ms: 3000 }]);
    expect(lastResult(s)).toEqual({ character: 'A', given: 'A', correct: true, ms: 3000 });
    expect(score(s)).toBe(1);
  });

  it('records a wrong answer and does not raise the score', () => {
    const s = submit(fresh(0), 'B', 3000) as SessionState;
    expect(s.results).toEqual([{ character: 'A', given: 'B', correct: false, ms: 3000 }]);
    expect(score(s)).toBe(0);
    expect(s.stage).toBe('feedback');
  });

  it('stores the normalized answer', () => {
    const s = submit(fresh(0), ' A\n', 1000) as SessionState;
    expect(s.results[0]).toMatchObject({ given: 'A', correct: true });
  });

  it('clears the draft', () => {
    const s = submit(setDraft(fresh(0), 'A'), 'A', 1000) as SessionState;
    expect(s.draft).toBe('');
  });

  it('accepts eight bits in charToBits mode', () => {
    const s = submit(createSession('charToBits', ['A'], 0), '01000001', 1000) as SessionState;
    expect(s.results[0]).toMatchObject({ character: 'A', given: '01000001', correct: true });
  });

  it('is ignored in feedback', () => {
    const once = submit(fresh(0), 'A', 1000) as SessionState;
    const before = clone(once);
    expect(submit(once, 'B', 2000)).toEqual(before);
    expect(clone(once)).toEqual(before);
  });

  it('is ignored while suspended', () => {
    const s = suspend(fresh(0), 500);
    const before = clone(s);
    expect(submit(s, 'A', 1000)).toEqual(before);
    expect(clone(s)).toEqual(before);
  });

  it('is ignored once finished', () => {
    let s = fresh(0, ['A']);
    s = submit(s, 'A', 1000) as SessionState;
    s = advance(s, 1000);
    const before = clone(s);
    expect(submit(s, 'A', 2000)).toEqual(before);
    expect(clone(s)).toEqual(before);
  });
});

describe('advance', () => {
  it('moves to the next question and resets the timer to zero', () => {
    let s = submit(fresh(0), 'A', 2000) as SessionState;
    s = advance(s, 2000);
    expect(s.index).toBe(1);
    expect(s.stage).toBe('answering');
    expect(currentCharacter(s)).toBe('B');
    expect(elapsedMs(s, 2000)).toBe(0);
    expect(elapsedMs(s, 3000)).toBe(1000);
  });

  it('is ignored while answering', () => {
    const s = fresh(0);
    expect(advance(s, 1000)).toEqual(s);
  });

  it('is ignored while suspended in feedback', () => {
    const s = suspend(submit(fresh(0), 'A', 1000) as SessionState, 2000);
    const before = clone(s);
    expect(advance(s, 3000)).toEqual(before);
  });

  it('finishes the session after the last question', () => {
    let s = fresh(0);
    let now = 0;
    for (const ch of QUESTIONS) {
      now += 1000;
      s = submit(s, ch, now) as SessionState;
      now += 1000;
      s = advance(s, now);
    }
    expect(s.stage).toBe('finished');
    expect(currentCharacter(s)).toBeNull();
    expect(s.results).toHaveLength(3);
    expect(score(s)).toBe(3);
  });
});

describe('score and averageMs', () => {
  it('averageMs is null when there are no results', () => {
    expect(averageMs(fresh(0))).toBeNull();
  });

  it('counts correct answers and averages durations (2000 and 4000 → 3000)', () => {
    let s = submit(fresh(0), 'A', 2000) as SessionState;
    s = advance(s, 2000);
    s = submit(s, 'X', 6000) as SessionState;
    expect(score(s)).toBe(1);
    expect(averageMs(s)).toBe(3000);
  });
});

describe('suspend and resume', () => {
  it('excludes time spent away from the answer duration', () => {
    let s = fresh(0);
    s = suspend(s, 2000);
    expect(s.suspended).toBe(true);
    expect(elapsedMs(s, 62000)).toBe(2000);
    s = resume(s, 62000);
    expect(s.suspended).toBe(false);
    s = submit(s, 'A', 63000) as SessionState;
    expect(lastResult(s)?.ms).toBe(3000);
  });

  it('suspending in feedback and resuming advances to the next question', () => {
    let s = submit(fresh(0), 'A', 1000) as SessionState;
    s = suspend(s, 5000);
    expect(s.stage).toBe('feedback');
    expect(s.suspended).toBe(true);
    expect(s.index).toBe(0);
    s = resume(s, 9000);
    expect(s.suspended).toBe(false);
    expect(s.index).toBe(1);
    expect(s.stage).toBe('answering');
    expect(elapsedMs(s, 9000)).toBe(0);
  });

  it('resume does nothing when not suspended', () => {
    const s = fresh(0);
    expect(resume(s, 1000)).toEqual(s);
  });

  it('suspend does nothing once finished', () => {
    let s = fresh(0, ['A']);
    s = submit(s, 'A', 1000) as SessionState;
    s = advance(s, 1000);
    const before = clone(s);
    const after = suspend(s, 5000);
    expect(after.stage).toBe('finished');
    expect(after.suspended).toBe(false);
    expect(clone(after)).toEqual(before);
  });
});

describe('toSnapshot and fromSnapshot', () => {
  function partlyAnswered(): SessionState {
    let s = createSession('bitsToChar', QUESTIONS, 0);
    s = submit(s, 'A', 2000) as SessionState;
    s = advance(s, 2000);
    s = setDraft(s, 'B');
    return s;
  }

  it('toSnapshot is null when finished', () => {
    let s = fresh(0, ['A']);
    s = submit(s, 'A', 1000) as SessionState;
    s = advance(s, 1000);
    expect(toSnapshot(s, 2000)).toBeNull();
  });

  it('toSnapshot captures index, stage, results, draft and elapsed time', () => {
    const snap = toSnapshot(partlyAnswered(), 3000) as Snapshot;
    expect(snap).toEqual({
      version: 1,
      mode: 'bitsToChar',
      questions: QUESTIONS,
      index: 1,
      stage: 'answering',
      results: [{ character: 'A', given: 'A', correct: true, ms: 2000 }],
      draft: 'B',
      elapsedMs: 1000,
    });
  });

  it('round-trips through JSON and restores the state', () => {
    const original = partlyAnswered();
    const json = JSON.stringify(toSnapshot(original, 3000));
    const restored = fromSnapshot(JSON.parse(json) as Snapshot);
    expect(restored.index).toBe(original.index);
    expect(restored.stage).toBe(original.stage);
    expect(restored.results).toEqual(original.results);
    expect(restored.draft).toBe('B');
    expect(restored.questions).toEqual(QUESTIONS);
    expect(restored.mode).toBe('bitsToChar');
  });

  it('restores suspended with the timer stopped and the saved elapsed time', () => {
    const json = JSON.stringify(toSnapshot(partlyAnswered(), 3000));
    const restored = fromSnapshot(JSON.parse(json) as Snapshot);
    expect(restored.suspended).toBe(true);
    expect(restored.segmentStart).toBeNull();
    expect(restored.accumulatedMs).toBe(1000);
    expect(elapsedMs(restored, 99999)).toBe(1000);
  });

  it('keeps timing correctly after resuming a restored session', () => {
    const json = JSON.stringify(toSnapshot(partlyAnswered(), 3000));
    let restored = fromSnapshot(JSON.parse(json) as Snapshot);
    restored = resume(restored, 5000);
    restored = submit(restored, 'B', 7000) as SessionState;
    expect(lastResult(restored)?.ms).toBe(3000);
  });

  it('a snapshot taken while suspended is still valid', () => {
    const snap = toSnapshot(suspend(partlyAnswered(), 2500), 9000);
    expect(snap).not.toBeNull();
    expect(isSnapshot(snap)).toBe(true);
  });
});

describe('isSnapshot', () => {
  const valid = (): Snapshot =>
    clone(toSnapshot(createSession('charToBits', ['A', 'b', '5'], 0), 0) as Snapshot);

  it('accepts a snapshot produced by toSnapshot', () => {
    expect(isSnapshot(valid())).toBe(true);
  });

  it.each([null, undefined, 'snapshot', 42, true, [], {}])('rejects garbage value %j', (value) => {
    expect(isSnapshot(value)).toBe(false);
  });

  it('rejects an unknown version', () => {
    expect(isSnapshot({ ...valid(), version: 2 })).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(isSnapshot({ ...valid(), mode: 'nope' })).toBe(false);
  });

  it('rejects a finished stage', () => {
    expect(isSnapshot({ ...valid(), stage: 'finished' })).toBe(false);
  });

  it.each([['AB'], ['!'], [' '], ['é']])('rejects invalid question character %j', (bad) => {
    const snap = valid();
    expect(isSnapshot({ ...snap, questions: ['A', bad] })).toBe(false);
  });

  it.each([-1, 3, 1.5])('rejects an out-of-range index %s', (index) => {
    expect(isSnapshot({ ...valid(), index })).toBe(false);
  });
});

describe('inputs are not mutated', () => {
  it('setDraft, submit, advance, suspend and resume leave a frozen state untouched', () => {
    const frozen = deepFreeze(submit(fresh(0), 'A', 1000) as SessionState);
    const before = clone(frozen);

    expect(() => setDraft(frozen, 'B')).not.toThrow();
    expect(() => submit(frozen, 'B', 2000)).not.toThrow();
    expect(() => advance(frozen, 2000)).not.toThrow();
    expect(() => suspend(frozen, 2000)).not.toThrow();
    expect(() => resume(frozen, 2000)).not.toThrow();
    expect(clone(frozen)).toEqual(before);
  });

  it('advance, suspend and resume leave a frozen answering state untouched', () => {
    const frozen = deepFreeze(fresh(0));
    const before = clone(frozen);

    expect(() => submit(frozen, 'A', 1000)).not.toThrow();
    expect(() => suspend(frozen, 1000)).not.toThrow();
    expect(() => advance(frozen, 1000)).not.toThrow();
    expect(clone(frozen)).toEqual(before);
  });

  it('read-only queries leave a frozen state untouched', () => {
    const frozen = deepFreeze(submit(fresh(0), 'A', 1000) as SessionState);
    const before = clone(frozen);

    expect(() => currentCharacter(frozen)).not.toThrow();
    expect(() => elapsedMs(frozen, 5000)).not.toThrow();
    expect(() => score(frozen)).not.toThrow();
    expect(() => averageMs(frozen)).not.toThrow();
    expect(() => lastResult(frozen)).not.toThrow();
    expect(() => toSnapshot(frozen, 5000)).not.toThrow();
    expect(clone(frozen)).toEqual(before);
  });

  it('fromSnapshot and isSnapshot leave a frozen snapshot untouched', () => {
    const snap = deepFreeze(
      clone(toSnapshot(submit(fresh(0), 'A', 1000) as SessionState, 2000) as Snapshot),
    );
    const before = clone(snap);

    expect(isSnapshot(snap)).toBe(true);
    expect(() => fromSnapshot(snap)).not.toThrow();
    expect(clone(snap)).toEqual(before);
  });
});
