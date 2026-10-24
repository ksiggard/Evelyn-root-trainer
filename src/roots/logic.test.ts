import { describe, it, expect } from 'vitest';
import {
  ROOT_MAX,
  ROOT_MIN,
  avg,
  buildMCOptions,
  clamp,
  cubeLastDigitMap,
  generateQA,
  msToSeconds,
  rootsExcept,
  shuffle,
  squareLookup,
} from './logic';

const ALL_ROOTS = Array.from({ length: ROOT_MAX - ROOT_MIN + 1 }, (_, i) => ROOT_MIN + i);

const randomRoot = (): number => Math.floor(Math.random() * ROOT_MAX) + ROOT_MIN;

describe('constants and lookups', () => {
  it('roots range from 1 to 100', () => {
    expect(ROOT_MIN).toBe(1);
    expect(ROOT_MAX).toBe(100);
  });

  it('squareLookup pairs each root with its square', () => {
    expect(squareLookup).toHaveLength(100);
    expect(squareLookup[0]).toEqual({ n: 1, sq: 1 });
    expect(squareLookup[9]).toEqual({ n: 10, sq: 100 });
    expect(squareLookup[99]).toEqual({ n: 100, sq: 10000 });
  });

  it('cubeLastDigitMap maps each last digit to the last digit of its cube root', () => {
    expect(cubeLastDigitMap).toEqual({
      '0': 0,
      '1': 1,
      '2': 8,
      '3': 7,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 3,
      '8': 2,
      '9': 9,
    });
  });
});

describe('generateQA', () => {
  it('square mode returns a root in 1–100 with prompt = root²', () => {
    for (let i = 0; i < 200; i++) {
      const qa = generateQA('square');
      expect(Number.isInteger(qa.root)).toBe(true);
      expect(qa.root).toBeGreaterThanOrEqual(ROOT_MIN);
      expect(qa.root).toBeLessThanOrEqual(ROOT_MAX);
      expect(qa.prompt).toBe(qa.root * qa.root);
    }
  });

  it('cube mode returns a root in 1–100 with prompt = root³', () => {
    for (let i = 0; i < 200; i++) {
      const qa = generateQA('cube');
      expect(qa.root).toBeGreaterThanOrEqual(ROOT_MIN);
      expect(qa.root).toBeLessThanOrEqual(ROOT_MAX);
      expect(qa.prompt).toBe(qa.root ** 3);
    }
  });

  it('avoids used roots when possible, returning the one unused root', () => {
    const used = new Set(ALL_ROOTS.filter((n) => n !== 37));
    for (let i = 0; i < 20; i++) {
      expect(generateQA('square', used).root).toBe(37);
      expect(generateQA('cube', used).root).toBe(37);
    }
  });

  it('still returns a valid root when every root is used', () => {
    const used = new Set(ALL_ROOTS);
    const qa = generateQA('square', used);
    expect(qa.root).toBeGreaterThanOrEqual(ROOT_MIN);
    expect(qa.root).toBeLessThanOrEqual(ROOT_MAX);
  });
});

describe('buildMCOptions', () => {
  it.each([true, false])(
    'returns 4 unique options in 1–100 that include the correct root (farAsCorrect=%s)',
    (farAsCorrect) => {
      for (let i = 0; i < 200; i++) {
        const root = randomRoot();
        const options = buildMCOptions(root, farAsCorrect);
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options).toContain(root);
        for (const option of options) {
          expect(Number.isInteger(option)).toBe(true);
          expect(option).toBeGreaterThanOrEqual(ROOT_MIN);
          expect(option).toBeLessThanOrEqual(ROOT_MAX);
        }
      }
    },
  );

  it.each([1, 100])('handles the edge root %i for both farAsCorrect values', (root) => {
    for (const farAsCorrect of [true, false]) {
      const options = buildMCOptions(root, farAsCorrect);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(root);
    }
  });
});

describe('shuffle', () => {
  it('preserves every element', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate its input', () => {
    const input = [1, 2, 3, 4];
    shuffle(input);
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it('handles an empty array', () => {
    expect(shuffle([])).toEqual([]);
  });
});

describe('clamp', () => {
  it.each([
    [5, 1, 10, 5],
    [-1, 1, 10, 1],
    [99, 1, 10, 10],
    [1, 1, 10, 1],
    [10, 1, 10, 10],
  ])('clamp(%s, %s, %s) → %s', (n, min, max, expected) => {
    expect(clamp(n, min, max)).toBe(expected);
  });
});

describe('avg', () => {
  it('returns 0 for an empty list', () => {
    expect(avg([])).toBe(0);
  });

  it('returns the arithmetic mean', () => {
    expect(avg([1, 2, 3])).toBe(2);
    expect(avg([2000, 4000])).toBe(3000);
  });
});

describe('msToSeconds', () => {
  it('converts milliseconds to seconds', () => {
    expect(msToSeconds(1234)).toBe(1.234);
    expect(msToSeconds(0)).toBe(0);
  });
});

describe('rootsExcept', () => {
  it('returns every root not in the excluded set', () => {
    const result = rootsExcept(new Set([1, 2, 100]));
    expect(result).toHaveLength(97);
    expect(result).not.toContain(1);
    expect(result).not.toContain(2);
    expect(result).not.toContain(100);
    expect(result).toContain(3);
  });
});
