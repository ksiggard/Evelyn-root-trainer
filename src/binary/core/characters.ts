/** A set of characters the quiz can draw from. */
export type CharacterGroup = 'digits' | 'uppercase' | 'lowercase';

/** All groups, in ASCII order. */
export const CHARACTER_GROUPS: readonly CharacterGroup[] = ['digits', 'uppercase', 'lowercase'];

/** ASCII range (inclusive char codes): digits 0x30-0x39, uppercase 0x41-0x5A, lowercase 0x61-0x7A. */
export const GROUP_RANGES: Record<CharacterGroup, readonly [number, number]> = {
  digits: [0x30, 0x39],
  uppercase: [0x41, 0x5a],
  lowercase: [0x61, 0x7a],
};

/** A user-facing name for each group. */
export const GROUP_LABEL: Record<CharacterGroup, string> = {
  digits: 'Digits',
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
};

/** Characters of a group in ASCII order, built from `GROUP_RANGES`. */
export function charactersIn(group: CharacterGroup): string[] {
  const [lo, hi] = GROUP_RANGES[group];
  const out: string[] = [];
  for (let code = lo; code <= hi; code++) out.push(String.fromCharCode(code));
  return out;
}

/** All 62 characters: digits, then uppercase, then lowercase. */
export const ALL_CHARACTERS: readonly string[] = CHARACTER_GROUPS.flatMap(charactersIn);

/** The group a character belongs to, or null if it isn't exactly one of 0-9 / A-Z / a-z. */
export function groupOf(ch: string): CharacterGroup | null {
  if (ch.length !== 1) return null;
  const code = ch.charCodeAt(0);
  for (const g of CHARACTER_GROUPS) {
    const [lo, hi] = GROUP_RANGES[g];
    if (code >= lo && code <= hi) return g;
  }
  return null;
}
