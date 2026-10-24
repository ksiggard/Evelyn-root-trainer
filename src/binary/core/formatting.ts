/**
 * "01100001" -> "011 00001". Splits after the 3rd character (3 type bits, then 5 for which one);
 * strings of 3 characters or fewer are returned unchanged.
 */
export function groupBits(bits: string, separator = ' '): string {
  if (bits.length <= 3) return bits;
  return bits.slice(0, 3) + separator + bits.slice(3);
}

/** Applies the "Group bits 3 + 5" setting: `groupBits` when `grouped` is true, otherwise `bits` unchanged. */
export function displayBits(bits: string, grouped: boolean): string {
  return grouped ? groupBits(bits) : bits;
}

/** Spoken form for screen readers: "zero one one, zero zero zero zero one". "_" is "blank". */
export function spokenBits(bits: string): string {
  const words = Array.from(bits).map((c) => (c === '0' ? 'zero' : c === '1' ? 'one' : c === '_' ? 'blank' : c));
  if (words.length > 3) words[2] += ',';
  return words.join(' ');
}
