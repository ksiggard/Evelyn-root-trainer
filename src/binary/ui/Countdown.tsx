import { useEffect, useRef, useState } from 'react';

/** 3, 2, 1 at one second each, then calls onDone exactly once. */
export function Countdown(props: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const doneRef = useRef(false);
  const onDoneRef = useRef(props.onDone);
  onDoneRef.current = props.onDone;

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setN(2), 1000),
      window.setTimeout(() => setN(1), 2000),
      window.setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDoneRef.current();
      }, 3000),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div
      data-testid="countdown"
      role="status"
      aria-live="polite"
      aria-label={`Resuming in ${n}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-teal-50"
    >
      <p className="text-lg font-semibold text-slate-700">Get ready…</p>
      <div aria-hidden="true" className="text-9xl font-extrabold text-indigo-700">
        {n}
      </div>
    </div>
  );
}
