/** 8-character "0"/"1" string for a single ASCII character (code 0-127), else null. */
export function bitsFor(ch: string): string | null {
  if (ch.length !== 1) return null;
  const code = ch.charCodeAt(0);
  if (code > 127) return null;
  return code.toString(2).padStart(8, '0');
}

/** Inverse of `bitsFor`. Null unless `bits` is exactly 8 chars, all "0"/"1", value <= 127. */
export function charFor(bits: string): string | null {
  if (!/^[01]{8}$/.test(bits)) return null;
  const value = parseInt(bits, 2);
  return value <= 127 ? String.fromCharCode(value) : null;
}
