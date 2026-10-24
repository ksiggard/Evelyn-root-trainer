import { describe, it, expect } from 'vitest';
import { ALL_CHARACTERS, charactersIn } from './characters';
import { bitsFor, charFor } from './codec';

describe('bitsFor', () => {
  it.each(ALL_CHARACTERS)('%s encodes to 8 bits of 0 or 1 starting with 0', (ch) => {
    const bits = bitsFor(ch);
    expect(bits).not.toBeNull();
    expect(bits).toMatch(/^0[01]{7}$/);
  });

  it.each(ALL_CHARACTERS)('%s round-trips through charFor', (ch) => {
    expect(charFor(bitsFor(ch) as string)).toBe(ch);
  });

  it.each(charactersIn('digits'))(
    'digit %s starts with 0011 and ends with its value',
    (digit) => {
      const bits = bitsFor(digit) as string;
      expect(bits.startsWith('0011')).toBe(true);
      expect(parseInt(bits.slice(4), 2)).toBe(Number(digit));
    },
  );

  it.each(charactersIn('uppercase'))(
    'uppercase %s starts with 010 and ends with its alphabet position',
    (letter) => {
      const bits = bitsFor(letter) as string;
      expect(bits.startsWith('010')).toBe(true);
      expect(parseInt(bits.slice(3), 2)).toBe(letter.charCodeAt(0) - 64);
    },
  );

  it.each(charactersIn('lowercase'))(
    'lowercase %s starts with 011 and ends with its alphabet position',
    (letter) => {
      const bits = bitsFor(letter) as string;
      expect(bits.startsWith('011')).toBe(true);
      expect(parseInt(bits.slice(3), 2)).toBe(letter.charCodeAt(0) - 96);
    },
  );

  it.each(charactersIn('uppercase'))(
    'the case pair of %s differs only at bit index 2',
    (upper) => {
      const lower = upper.toLowerCase();
      const upperBits = bitsFor(upper) as string;
      const lowerBits = bitsFor(lower) as string;
      const differing = [...upperBits]
        .map((bit, i) => (bit !== lowerBits[i] ? i : -1))
        .filter((i) => i >= 0);
      expect(differing).toEqual([2]);
    },
  );

  it('matches the known reference values', () => {
    expect(bitsFor('5')).toBe('00110101');
    expect(bitsFor('A')).toBe('01000001');
    expect(bitsFor('a')).toBe('01100001');
  });

  it.each(['é', '€', '😀', '', 'ab'])('returns null for %j', (input) => {
    expect(bitsFor(input)).toBeNull();
  });
});

describe('charFor', () => {
  it('decodes known bit strings', () => {
    expect(charFor('01000001')).toBe('A');
    expect(charFor('01100001')).toBe('a');
    expect(charFor('00110101')).toBe('5');
  });

  it.each(['0100000', '010000011', '0100000a', '0100 0001', '', '11111111'])(
    'returns null for malformed or out-of-range input %j',
    (bits) => {
      expect(charFor(bits)).toBeNull();
    },
  );
});
