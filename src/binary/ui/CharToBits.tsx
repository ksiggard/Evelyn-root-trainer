import { displayBits, groupOf, GROUP_LABEL, isCompleteBits, spokenBits } from '../core';

export interface CharToBitsProps {
  character: string;
  draft: string;
  groupBits: boolean;
  onDraft: (d: string) => void;
  onSubmit: () => void;
}

const MAX_BITS = 8;

/** Char -> Bits: a character is shown, the child taps out its 8 bits. Fits 375 x 812 without scrolling. */
export function CharToBits({ character, draft, groupBits, onDraft, onSubmit }: CharToBitsProps) {
  const complete = isCompleteBits(draft);
  const padded = draft + '_'.repeat(Math.max(0, MAX_BITS - draft.length));
  const group = groupOf(character);
  const charLabel = `${group ? GROUP_LABEL[group] : 'Character'} ${character}`;
  const filled = draft.length;
  const spoken = filled === 0 ? '8 blank' : `${spokenBits(draft)}${filled < MAX_BITS ? `, ${MAX_BITS - filled} blank` : ''}`;

  const addBit = (bit: '0' | '1') => {
    if (draft.length >= MAX_BITS) return;
    onDraft(draft + bit);
  };

  const bitButton = 'flex-1 min-h-[104px] rounded-xl border border-purple-200 bg-white/70 backdrop-blur shadow ' +
    'font-mono text-5xl font-bold text-purple-900 active:scale-[0.98] active:bg-purple-50 ' +
    'focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400';

  return (
    <div className="flex flex-col gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
      <div
        data-testid="c2b.character"
        role="img"
        aria-label={charLabel}
        className="flex min-h-[112px] items-center justify-center text-8xl font-bold leading-none text-purple-900"
      >
        {character}
      </div>

      <div
        data-testid="c2b.slots"
        data-value={padded}
        role="img"
        aria-label={spoken}
        className="rounded-2xl border bg-white/70 py-2.5 text-center font-mono text-4xl font-semibold tracking-wide text-gray-900 shadow backdrop-blur whitespace-pre"
      >
        {displayBits(padded, groupBits)}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" data-testid="c2b.zero" aria-label="Zero" className={bitButton} onClick={() => addBit('0')}>
          0
        </button>
        <button type="button" data-testid="c2b.one" aria-label="One" className={bitButton} onClick={() => addBit('1')}>
          1
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          data-testid="c2b.backspace"
          aria-label="Delete last bit"
          disabled={draft.length === 0}
          onClick={() => onDraft(draft.slice(0, -1))}
          className="min-h-[56px] w-[104px] rounded-xl border bg-white/70 text-2xl font-semibold text-gray-800 shadow backdrop-blur disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
        >
          <span aria-hidden="true">⌫</span>
        </button>
        <button
          type="button"
          data-testid="c2b.submit"
          disabled={!complete}
          onClick={() => complete && onSubmit()}
          className="min-h-[56px] flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 text-xl font-semibold text-white shadow disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
