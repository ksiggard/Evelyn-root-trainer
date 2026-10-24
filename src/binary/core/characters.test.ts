import { describe, it, expect } from 'vitest';
import {
  ALL_CHARACTERS,
  CHARACTER_GROUPS,
  GROUP_LABEL,
  GROUP_RANGES,
  charactersIn,
  groupOf,
} from './characters';

const range = (lo: number, hi: number): number[] =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('CHARACTER_GROUPS', () => {
  it('lists digits, uppercase, lowercase in that order', () => {
    expect([...CHARACTER_GROUPS]).toEqual(['digits', 'uppercase', 'lowercase']);
  });
});

describe('GROUP_RANGES', () => {
  it('matches the documented ASCII ranges', () => {
    expect(GROUP_RANGES.digits).toEqual([0x30, 0x39]);
    expect(GROUP_RANGES.uppercase).toEqual([0x41, 0x5a]);
    expect(GROUP_RANGES.lowercase).toEqual([0x61, 0x7a]);
  });
});

describe('GROUP_LABEL', () => {
  it('provides the display labels', () => {
    expect(GROUP_LABEL.digits).toBe('Digits');
    expect(GROUP_LABEL.uppercase).toBe('Uppercase');
    expect(GROUP_LABEL.lowercase).toBe('Lowercase');
  });
});

describe('charactersIn', () => {
  it.each([
    ['digits', 10],
    ['uppercase', 26],
    ['lowercase', 26],
  ] as const)('%s has %i characters', (group, count) => {
    expect(charactersIn(group)).toHaveLength(count);
  });

  it.each(['digits', 'uppercase', 'lowercase'] as const)(
    '%s holds the ASCII codes of its range in order',
    (group) => {
      const [lo, hi] = GROUP_RANGES[group];
      const codes = charactersIn(group).map((ch) => ch.charCodeAt(0));
      expect(codes).toEqual(range(lo, hi));
    },
  );
});

describe('ALL_CHARACTERS', () => {
  it('contains 62 unique characters', () => {
    expect(ALL_CHARACTERS).toHaveLength(62);
    expect(new Set(ALL_CHARACTERS).size).toBe(62);
  });

  it('is digits, then uppercase, then lowercase', () => {
    expect([...ALL_CHARACTERS]).toEqual([
      ...charactersIn('digits'),
      ...charactersIn('uppercase'),
      ...charactersIn('lowercase'),
    ]);
    expect(ALL_CHARACTERS[0]).toBe('0');
    expect(ALL_CHARACTERS[10]).toBe('A');
    expect(ALL_CHARACTERS[36]).toBe('a');
    expect(ALL_CHARACTERS[61]).toBe('z');
  });
});

describe('groupOf', () => {
  it.each(['0', '5', '9'])('identifies digit sample %s', (ch) => {
    expect(groupOf(ch)).toBe('digits');
  });

  it.each(['A', 'M', 'Z'])('identifies uppercase sample %s', (ch) => {
    expect(groupOf(ch)).toBe('uppercase');
  });

  it.each(['a', 'm', 'z'])('identifies lowercase sample %s', (ch) => {
    expect(groupOf(ch)).toBe('lowercase');
  });

  it.each(['!', ' ', 'é', '@', '[', '`', '{', ':'])(
    'returns null for %j, which is outside 0-9, A-Z, a-z',
    (ch) => {
      expect(groupOf(ch)).toBeNull();
    },
  );

  it('returns null for an empty string', () => {
    expect(groupOf('')).toBeNull();
  });

  it('returns null for more than one character', () => {
    expect(groupOf('AB')).toBeNull();
  });
});
