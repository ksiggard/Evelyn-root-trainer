import { bitsFor } from './codec';

/** Which direction a quiz runs. */
export type BinaryMode = 'bitsToChar' | 'charToBits';

/** Trims whitespace; returns the first character, or null if nothing is left. */
export function normalizeCharacter(raw: string): string | null {
  const first = Array.from(raw.trim())[0];
  return first === undefined ? null : first;
}

/** The last non-whitespace character, or '' (for the Bits -> Char input). */
export function keepLastCharacter(raw: string): string {
  const chars = Array.from(raw.replace(/\s+/g, ''));
  return chars.length ? chars[chars.length - 1] : '';
}

/** True if exactly 8 characters, each "0" or "1". */
export function isCompleteBits(s: string): boolean {
  return /^[01]{8}$/.test(s);
}

/** The correct answer for `target` in `mode`. */
export function expectedAnswer(target: string, mode: BinaryMode): string {
  return mode === 'bitsToChar' ? target : (bitsFor(target) ?? '');
}

/** The normalized form used for display and recording. */
export function normalizeAnswer(raw: string, mode: BinaryMode): string {
  return mode === 'bitsToChar' ? (normalizeCharacter(raw) ?? '') : raw.trim();
}

/** Normalizes `raw` for `mode`, then compares with the target. Case-sensitive. */
export function isCorrect(raw: string, target: string, mode: BinaryMode): boolean {
  if (mode === 'bitsToChar') return normalizeCharacter(raw) === target;
  const trimmed = raw.trim();
  return isCompleteBits(trimmed) && trimmed === bitsFor(target);
}
