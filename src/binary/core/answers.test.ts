import { describe, it, expect } from 'vitest';
import {
  expectedAnswer,
  isCompleteBits,
  isCorrect,
  keepLastCharacter,
  normalizeAnswer,
  normalizeCharacter,
} from './answers';

describe('normalizeCharacter', () => {
  it('trims surrounding whitespace and newlines', () => {
    expect(normalizeCharacter('  A\n')).toBe('A');
  });

  it('returns the first character when several are given', () => {
    expect(normalizeCharacter('AB')).toBe('A');
  });

  it.each(['', '   ', '\n\t \n'])('returns null for blank input %j', (raw) => {
    expect(normalizeCharacter(raw)).toBeNull();
  });
});

describe('keepLastCharacter', () => {
  it.each([
    ['ab', 'b'],
    [' a ', 'a'],
    ['', ''],
    ['  ', ''],
  ])('keeps the last non-whitespace character of %j → %j', (raw, expected) => {
    expect(keepLastCharacter(raw)).toBe(expected);
  });
});

describe('isCompleteBits', () => {
  it.each(['01000001', '00000000', '11111111'])('accepts %s', (bits) => {
    expect(isCompleteBits(bits)).toBe(true);
  });

  it.each(['', '0100000', '010000011', '0100000a', '0100000 ', ' 01000001', '01000002', '0100 0001'])(
    'rejects %j',
    (bits) => {
      expect(isCompleteBits(bits)).toBe(false);
    },
  );
});

describe('expectedAnswer', () => {
  it('returns the character itself in bitsToChar mode', () => {
    expect(expectedAnswer('A', 'bitsToChar')).toBe('A');
  });

  it('returns the eight bits in charToBits mode', () => {
    expect(expectedAnswer('A', 'charToBits')).toBe('01000001');
    expect(expectedAnswer('a', 'charToBits')).toBe('01100001');
  });
});

describe('normalizeAnswer', () => {
  it('bitsToChar returns the first character as a string', () => {
    expect(normalizeAnswer('  a\n', 'bitsToChar')).toBe('a');
    expect(normalizeAnswer('AB', 'bitsToChar')).toBe('A');
  });

  it('bitsToChar returns an empty string for blank input', () => {
    expect(normalizeAnswer('', 'bitsToChar')).toBe('');
    expect(normalizeAnswer('   ', 'bitsToChar')).toBe('');
  });

  it('charToBits returns the trimmed string', () => {
    expect(normalizeAnswer(' 01000001 ', 'charToBits')).toBe('01000001');
    expect(normalizeAnswer('  0100 ', 'charToBits')).toBe('0100');
  });
});

describe('isCorrect in bitsToChar mode', () => {
  it('accepts the matching character after trimming', () => {
    expect(isCorrect('  A\n', 'A', 'bitsToChar')).toBe(true);
  });

  it('is case-sensitive: wrong case is incorrect', () => {
    expect(isCorrect('a', 'A', 'bitsToChar')).toBe(false);
    expect(isCorrect('A', 'a', 'bitsToChar')).toBe(false);
    expect(isCorrect('a', 'a', 'bitsToChar')).toBe(true);
  });

  it('rejects bit strings and empty input', () => {
    expect(isCorrect('01000001', 'A', 'bitsToChar')).toBe(false);
    expect(isCorrect('', 'A', 'bitsToChar')).toBe(false);
    expect(isCorrect('   ', 'A', 'bitsToChar')).toBe(false);
  });
});

describe('isCorrect in charToBits mode', () => {
  it('accepts the exact eight bits', () => {
    expect(isCorrect('01000001', 'A', 'charToBits')).toBe(true);
  });

  it('accepts bits surrounded by whitespace', () => {
    expect(isCorrect(' 01000001 ', 'A', 'charToBits')).toBe(true);
  });

  it.each(['0100000', '010000011', '', '0100000a', '0100 0001', '01000002'])(
    'requires exactly eight bits, rejecting %j',
    (raw) => {
      expect(isCorrect(raw, 'A', 'charToBits')).toBe(false);
    },
  );

  it('rejects the character itself and the bits of another character', () => {
    expect(isCorrect('A', 'A', 'charToBits')).toBe(false);
    expect(isCorrect('01100001', 'A', 'charToBits')).toBe(false);
  });
});
