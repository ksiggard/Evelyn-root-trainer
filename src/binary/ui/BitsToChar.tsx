import { useLayoutEffect, useRef, useState } from 'react';
import { displayBits, bitsFor, keepLastCharacter, spokenBits } from '../core';

export interface BitsToCharProps {
  character: string;
  draft: string;
  groupBits: boolean;
  digitsOnly: boolean;
  onDraft: (d: string) => void;
  onSubmit: () => void;
}

/**
 * Bits -> Char: 8 bits are shown, the child types the character. Everything sits in the top
 * ~430 px so the iOS keyboard never covers it.
 */
export function BitsToChar({ character, draft, groupBits, digitsOnly, onDraft, onSubmit }: BitsToCharProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const bits = bitsFor(character) ?? '';
  const hasDraft = draft.length > 0;

  // Focus during the tap that showed the question so iOS opens the keyboard.
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, [character]);

  const submit = () => {
    if (!hasDraft) return;
    inputRef.current?.blur();
    onSubmit();
  };

  const retry = () => {
    onDraft('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2 px-4 pt-1">
      <div
        data-testid="b2c.bits"
        data-value={bits}
        role="img"
        aria-label={spokenBits(bits)}
        className="whitespace-pre rounded-2xl border bg-white/70 py-3 text-center font-mono text-5xl font-bold text-gray-900 shadow backdrop-blur"
      >
        {displayBits(bits, groupBits)}
      </div>

      <input
        ref={inputRef}
        data-testid="b2c.input"
        type="text"
        value={draft}
        onChange={(e) => onDraft(keepLastCharacter(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        inputMode={digitsOnly ? 'numeric' : 'text'}
        enterKeyHint="done"
        aria-label="Your answer"
        placeholder="Type a character"
        className="min-h-[48px] w-full rounded-xl border-2 border-purple-300 bg-white px-3 text-center text-xl text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-purple-400"
      />

      <div className="flex h-8 items-center justify-center">
        {!focused && (
          <button
            type="button"
            data-testid="b2c.focus"
            onClick={() => inputRef.current?.focus()}
            className="min-h-[32px] rounded-xl px-3 text-base font-semibold text-purple-700 underline"
          >
            Tap here to type
          </button>
        )}
      </div>

      <div
        data-testid="b2c.preview"
        data-value={draft}
        role="status"
        aria-label={hasDraft ? `You entered ${draft}` : 'Nothing entered yet'}
        className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border bg-white/70 shadow backdrop-blur"
      >
        <span className="text-base font-semibold text-gray-700">You entered:</span>
        {hasDraft ? (
          <span className="text-7xl font-bold leading-none text-purple-900">{draft}</span>
        ) : (
          <span className="text-xl text-gray-600">Type a character</span>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          data-testid="b2c.retry"
          disabled={!hasDraft}
          onMouseDown={(e) => e.preventDefault()}
          onClick={retry}
          className="min-h-[56px] flex-1 rounded-xl border bg-white/70 text-lg font-semibold text-gray-800 shadow backdrop-blur disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
        >
          <span aria-hidden="true">↺ </span>Retry
        </button>
        <button
          type="button"
          data-testid="b2c.submit"
          disabled={!hasDraft}
          onClick={submit}
          className="min-h-[56px] flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 text-xl font-semibold text-white shadow disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
