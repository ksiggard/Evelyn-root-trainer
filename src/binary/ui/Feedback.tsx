import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import type { BinaryMode } from '../core/answers';
import { bitsFor } from '../core/codec';
import { displayBits } from '../core/formatting';
import type { AnswerResult } from '../core/session';
import { Confetti } from '../../shared/Confetti';
import { useReducedMotion } from '../../shared/useReducedMotion';

export interface FeedbackProps {
  result: AnswerResult;
  mode: BinaryMode;
  groupBits: boolean;
  isLast: boolean;
  onNext: () => void;
}

/** Full-screen right/wrong overlay for both modes. Tapping anywhere advances. */
export function Feedback({ result, mode, groupBits, isLast, onNext }: FeedbackProps): JSX.Element {
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState<number>(result.correct ? 1 : 0);
  const [shown, setShown] = useState<boolean>(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const correct = result.correct;
  const bits = bitsFor(result.character) ?? '';
  const pair = `${result.character} = ${displayBits(bits, groupBits)}`;
  const you = mode === 'bitsToChar' ? result.given : displayBits(result.given, groupBits);
  const showFx = correct && !reduced;
  const visible = reduced || shown;

  const celebrate = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setBurst((n) => n + 1);
  };
  const next = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onNext();
  };

  return (
    <div
      data-testid="feedback"
      onClick={onNext}
      className={`fixed inset-0 z-40 flex flex-col items-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 text-center text-white transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: correct ? '#15803d' : '#b91c1c' }}
    >
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
        <div
          data-testid="feedback.status"
          data-value={correct ? 'correct' : 'wrong'}
          className="flex flex-col items-center gap-2"
        >
          <div
            aria-hidden="true"
            className={`flex h-24 w-24 items-center justify-center rounded-full bg-white text-6xl font-bold leading-none ${
              correct ? 'text-[#15803d]' : 'text-[#b91c1c]'
            }`}
          >
            {correct ? '✓' : '✗'}
          </div>
          <div className="text-4xl font-bold">{correct ? 'Correct!' : 'Not quite'}</div>
        </div>

        <div data-testid="feedback.pair" className="max-w-full break-words font-mono text-3xl font-semibold">
          {pair}
        </div>

        {!correct && (
          <div data-testid="feedback.you" className="max-w-full break-words font-mono text-2xl opacity-90">
            You: {you}
          </div>
        )}

        {showFx && (
          <button
            type="button"
            data-testid="feedback.confetti"
            aria-label="Celebrate again"
            onClick={celebrate}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-black/35 text-3xl"
          >
            <span aria-hidden="true">🎉</span>
          </button>
        )}
      </div>

      <button
        type="button"
        data-testid="feedback.next"
        onClick={next}
        className="min-h-[56px] w-full rounded-2xl bg-white text-xl font-semibold text-black"
      >
        {isLast ? 'See results' : 'Next'}
      </button>

      {showFx && <Confetti burst={burst} />}
    </div>
  );
}
