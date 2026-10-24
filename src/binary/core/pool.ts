import { ALL_CHARACTERS, groupOf, type CharacterGroup } from './characters';

/** Random source returning a number in [0, 1). */
export type Rng = () => number;

function pick<T>(items: readonly T[], rng: Rng): T {
  const i = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[i];
}

/** Characters from the groups, in `ALL_CHARACTERS` order. Throws if `groups` is empty. */
export function poolCharacters(groups: readonly CharacterGroup[]): string[] {
  if (groups.length === 0) throw new Error('poolCharacters needs at least one group');
  const wanted = new Set<CharacterGroup>(groups);
  return ALL_CHARACTERS.filter((ch) => {
    const g = groupOf(ch);
    return g !== null && wanted.has(g);
  });
}

/** Random character; never equal to `previous` when the pool has more than one character. */
export function nextCharacter(pool: readonly string[], previous: string | null, rng: Rng = Math.random): string {
  if (pool.length === 0) throw new Error('nextCharacter needs a non-empty pool');
  if (pool.length > 1 && previous !== null) {
    const candidates = pool.filter((c) => c !== previous);
    if (candidates.length > 0) return pick(candidates, rng);
  }
  return pick(pool, rng);
}

/** `count` questions (count >= 1); no two consecutive questions share a character. */
export function makeQuestions(groups: readonly CharacterGroup[], count: number, rng: Rng = Math.random): string[] {
  if (!(count >= 1)) throw new Error('count must be at least 1');
  const pool = poolCharacters(groups);
  const out: string[] = [];
  let previous: string | null = null;
  for (let i = 0; i < count; i++) {
    const ch = nextCharacter(pool, previous, rng);
    out.push(ch);
    previous = ch;
  }
  return out;
}
