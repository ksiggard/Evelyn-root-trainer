import type { BinaryMode } from './answers';
import { CHARACTER_GROUPS, type CharacterGroup } from './characters';
import { isSnapshot, type Snapshot } from './session';

/** The subset of `Storage` the app uses; lets tests pass a fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** localStorage keys. */
export const STORAGE_KEYS = {
  binarySettings: 'emt_binary_settings',
  binarySnapshot: 'emt_binary_snapshot',
} as const;

/** User preferences for a binary quiz. */
export interface BinarySettings {
  mode: BinaryMode;
  groups: CharacterGroup[];
  /** Show bit strings grouped 3 + 5 ("011 00001"). */
  groupBits: boolean;
  questionCount: number;
}

/** Char->Bits, all three groups, grouped bits, 10 questions. */
export const DEFAULT_SETTINGS: BinarySettings = {
  mode: 'charToBits',
  groups: [...CHARACTER_GROUPS],
  groupBits: true,
  questionCount: 10,
};

/** Allowed question counts (inclusive). */
export const QUESTION_COUNT_RANGE = [1, 100] as const;

/** Rounds, then clamps into `QUESTION_COUNT_RANGE`. NaN becomes 10. */
export function clampCount(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_SETTINGS.questionCount;
  return Math.min(QUESTION_COUNT_RANGE[1], Math.max(QUESTION_COUNT_RANGE[0], Math.round(n)));
}

/** Adds the group if absent; removes it if present and not the last one. Result is in `CHARACTER_GROUPS` order. */
export function toggleGroup(groups: readonly CharacterGroup[], g: CharacterGroup): CharacterGroup[] {
  const set = new Set<CharacterGroup>(groups);
  if (set.has(g)) {
    if (set.size > 1) set.delete(g);
  } else {
    set.add(g);
  }
  return CHARACTER_GROUPS.filter((x) => set.has(x));
}

/** localStorage, or null when unavailable (private mode can throw on access). */
function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function read(key: string, store?: KeyValueStore): string | null {
  try {
    return (store ?? defaultStore())?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string, store?: KeyValueStore): void {
  try {
    (store ?? defaultStore())?.setItem(key, value);
  } catch {
    // Storage full or blocked; settings simply won't persist.
  }
}

function remove(key: string, store?: KeyValueStore): void {
  try {
    (store ?? defaultStore())?.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

/** Saved settings; each field is validated and falls back to its default independently. */
export function loadSettings(store?: KeyValueStore): BinarySettings {
  const result: BinarySettings = { ...DEFAULT_SETTINGS, groups: [...DEFAULT_SETTINGS.groups] };
  const text = read(STORAGE_KEYS.binarySettings, store);
  if (text === null) return result;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return result;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return result;
  const o = raw as Record<string, unknown>;
  if (o.mode === 'bitsToChar' || o.mode === 'charToBits') result.mode = o.mode;
  if (Array.isArray(o.groups)) {
    const valid = CHARACTER_GROUPS.filter((g) => (o.groups as unknown[]).includes(g));
    if (valid.length > 0) result.groups = valid;
  }
  if (typeof o.groupBits === 'boolean') result.groupBits = o.groupBits;
  if (typeof o.questionCount === 'number' && Number.isFinite(o.questionCount)) {
    result.questionCount = clampCount(o.questionCount);
  }
  return result;
}

/** Persists settings. */
export function saveSettings(settings: BinarySettings, store?: KeyValueStore): void {
  write(STORAGE_KEYS.binarySettings, JSON.stringify(settings), store);
}

/** Persists the paused set. */
export function saveSnapshot(snap: Snapshot, store?: KeyValueStore): void {
  write(STORAGE_KEYS.binarySnapshot, JSON.stringify(snap), store);
}

/** The saved snapshot, or null if missing or invalid (invalid data is removed). */
export function loadSnapshot(store?: KeyValueStore): Snapshot | null {
  const text = read(STORAGE_KEYS.binarySnapshot, store);
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (isSnapshot(parsed)) return parsed;
  } catch {
    // fall through to removal
  }
  remove(STORAGE_KEYS.binarySnapshot, store);
  return null;
}

/** Deletes the saved snapshot, if any. */
export function clearSnapshot(store?: KeyValueStore): void {
  remove(STORAGE_KEYS.binarySnapshot, store);
}
