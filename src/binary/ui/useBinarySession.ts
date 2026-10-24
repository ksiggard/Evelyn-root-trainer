import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advance,
  clearSnapshot,
  createSession,
  fromSnapshot,
  loadSnapshot,
  resume,
  saveSnapshot,
  setDraft as setSessionDraft,
  submit as submitSession,
  suspend,
  toSnapshot,
  type BinaryMode,
  type SessionState,
} from '../core';

export interface BinarySessionApi {
  state: SessionState | null;
  awaitingResume: boolean;
  countingDown: boolean;
  start(mode: BinaryMode, questions: string[]): void;
  setDraft(draft: string): void;
  submit(raw: string): void;
  next(): void;
  chooseResume(): void;
  countdownDone(): void;
  endRound(): void;
}

function initialState(): SessionState | null {
  const snap = loadSnapshot();
  return snap ? fromSnapshot(snap) : null;
}

/** Owns the session state, its persistence, and pause/resume on page hide. */
export function useBinarySession(): BinarySessionApi {
  const [state, setState] = useState<SessionState | null>(initialState);
  const [awaitingResume, setAwaitingResume] = useState<boolean>(() => state !== null);
  const [countingDown, setCountingDown] = useState(false);

  // Always holds the latest state so event handlers never read a stale closure.
  const stateRef = useRef<SessionState | null>(state);

  const apply = useCallback((next: SessionState | null) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const suspendAndSave = () => {
      const cur = stateRef.current;
      if (!cur || cur.stage === 'finished') return;
      const now = performance.now();
      const suspended = suspend(cur, now);
      const snap = toSnapshot(suspended, now);
      if (snap) saveSnapshot(snap);
      apply(suspended);
      setAwaitingResume(true);
      setCountingDown(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') suspendAndSave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', suspendAndSave);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', suspendAndSave);
    };
  }, [apply]);

  const start = useCallback(
    (mode: BinaryMode, questions: string[]) => {
      clearSnapshot();
      apply(createSession(mode, questions, performance.now()));
      setAwaitingResume(false);
      setCountingDown(false);
    },
    [apply],
  );

  const setDraft = useCallback(
    (draft: string) => {
      const cur = stateRef.current;
      if (cur) apply(setSessionDraft(cur, draft));
    },
    [apply],
  );

  const submit = useCallback(
    (raw: string) => {
      const cur = stateRef.current;
      if (cur) apply(submitSession(cur, raw, performance.now()));
    },
    [apply],
  );

  const next = useCallback(() => {
    const cur = stateRef.current;
    if (!cur) return;
    const advanced = advance(cur, performance.now());
    if (advanced.stage === 'finished') clearSnapshot();
    apply(advanced);
  }, [apply]);

  const chooseResume = useCallback(() => {
    clearSnapshot();
    setAwaitingResume(false);
    setCountingDown(true);
  }, []);

  const countdownDone = useCallback(() => {
    const cur = stateRef.current;
    if (cur) {
      const resumed = resume(cur, performance.now());
      if (resumed.stage === 'finished') clearSnapshot();
      apply(resumed);
    }
    setCountingDown(false);
  }, [apply]);

  const endRound = useCallback(() => {
    clearSnapshot();
    apply(null);
    setAwaitingResume(false);
    setCountingDown(false);
  }, [apply]);

  return {
    state,
    awaitingResume,
    countingDown,
    start,
    setDraft,
    submit,
    next,
    chooseResume,
    countdownDone,
    endRound,
  };
}
