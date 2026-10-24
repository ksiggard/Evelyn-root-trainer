import { describe, it, expect } from 'vitest';
import { CHARACTER_GROUPS, charactersIn, type CharacterGroup } from './characters';
import { makeQuestions, nextCharacter, poolCharacters } from './pool';

/** Small seeded PRNG (mulberry32) so random-based tests are deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** All seven non-empty combinations of the three groups. */
const GROUP_COMBINATIONS: CharacterGroup[][] = [];
for (let mask = 1; mask < 1 << CHARACTER_GROUPS.length; mask++) {
  GROUP_COMBINATIONS.push(CHARACTER_GROUPS.filter((_, i) => mask & (1 << i)));
}

describe('poolCharacters', () => {
  it('has seven group combinations to cover', () => {
    expect(GROUP_COMBINATIONS).toHaveLength(7);
  });

  it.each(GROUP_COMBINATIONS.map((groups) => [groups]))(
    'returns the characters of %j in ALL_CHARACTERS order',
    (groups) => {
      const expected = CHARACTER_GROUPS.filter((g) => groups.includes(g)).flatMap((g) =>
        charactersIn(g),
      );
      expect(poolCharacters(groups)).toEqual(expected);
    },
  );

  it('throws when no groups are given', () => {
    expect(() => poolCharacters([])).toThrow();
  });
});

describe('nextCharacter', () => {
  it('never returns the previous character when the pool has more than one', () => {
    const rng = mulberry32(99);
    const pool = poolCharacters(['digits', 'uppercase']);
    let previous: string | null = null;
    for (let i = 0; i < 1000; i++) {
      const ch = nextCharacter(pool, previous, rng);
      expect(pool).toContain(ch);
      if (previous !== null) {
        expect(ch).not.toBe(previous);
      }
      previous = ch;
    }
  });

  it('can return any character in the pool', () => {
    const rng = mulberry32(5);
    const pool = poolCharacters(['digits']);
    const seen = new Set<string>();
    let previous: string | null = null;
    for (let i = 0; i < 2000; i++) {
      previous = nextCharacter(pool, previous, rng);
      seen.add(previous);
    }
    expect(seen).toEqual(new Set(pool));
  });
});

describe('makeQuestions', () => {
  it.each([1, 10, 100])('returns exactly %i questions with a seeded rng', (count) => {
    const questions = makeQuestions(['digits', 'uppercase', 'lowercase'], count, mulberry32(7));
    expect(questions).toHaveLength(count);
  });

  it.each([1, 10, 100])('returns exactly %i questions with the default rng', (count) => {
    expect(makeQuestions(['digits', 'uppercase', 'lowercase'], count)).toHaveLength(count);
  });

  it('only uses characters from the chosen groups', () => {
    const pool = new Set(poolCharacters(['uppercase', 'lowercase']));
    const questions = makeQuestions(['uppercase', 'lowercase'], 200, mulberry32(11));
    expect(questions.every((ch) => pool.has(ch))).toBe(true);
  });

  it('has no consecutive repeats over 1,000 digits-only questions', () => {
    const questions = makeQuestions(['digits'], 1000, mulberry32(2024));
    expect(questions).toHaveLength(1000);
    for (let i = 1; i < questions.length; i++) {
      expect(questions[i]).not.toBe(questions[i - 1]);
    }
  });
});
