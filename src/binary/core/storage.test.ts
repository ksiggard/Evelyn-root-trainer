import { describe, it, expect, vi, afterEach } from 'vitest';
import { CHARACTER_GROUPS, type CharacterGroup } from './characters';
import { createSession, toSnapshot, type Snapshot } from './session';
import {
  DEFAULT_SETTINGS,
  QUESTION_COUNT_RANGE,
  STORAGE_KEYS,
  clampCount,
  clearSnapshot,
  loadSettings,
  loadSnapshot,
  saveSettings,
  saveSnapshot,
  toggleGroup,
  type BinarySettings,
  type KeyValueStore,
} from './storage';

/** In-memory KeyValueStore fake. */
function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

function storeWith(key: string, value: string): KeyValueStore {
  const store = memoryStore();
  store.setItem(key, value);
  return store;
}

const validSnapshot = (): Snapshot =>
  toSnapshot(createSession('charToBits', ['A', 'b'], 0), 0) as Snapshot;

afterEach(() => {
  vi.restoreAllMocks();
  try {
    localStorage.clear();
  } catch {
    // jsdom always provides localStorage; ignore if it does not.
  }
});

describe('STORAGE_KEYS', () => {
  it('uses the documented key names', () => {
    expect(STORAGE_KEYS.binarySettings).toBe('emt_binary_settings');
    expect(STORAGE_KEYS.binarySnapshot).toBe('emt_binary_snapshot');
  });
});

describe('defaults', () => {
  it('DEFAULT_SETTINGS is charToBits, all groups, grouped bits, 10 questions', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      mode: 'charToBits',
      groups: ['digits', 'uppercase', 'lowercase'],
      groupBits: true,
      questionCount: 10,
    });
  });

  it('QUESTION_COUNT_RANGE is 1 to 100', () => {
    expect([...QUESTION_COUNT_RANGE]).toEqual([1, 100]);
  });
});

describe('clampCount', () => {
  it.each([
    [0, 1],
    [-5, 1],
    [101, 100],
    [50.6, 51],
    [50.4, 50],
    [1, 1],
    [100, 100],
    [NaN, 10],
  ])('clampCount(%s) → %s', (input, expected) => {
    expect(clampCount(input)).toBe(expected);
  });
});

describe('toggleGroup', () => {
  it('adds a missing group and keeps CHARACTER_GROUPS order', () => {
    expect(toggleGroup(['lowercase'], 'digits')).toEqual(['digits', 'lowercase']);
    expect(toggleGroup(['lowercase', 'digits'], 'uppercase')).toEqual([
      'digits',
      'uppercase',
      'lowercase',
    ]);
  });

  it('removes an enabled group when others remain', () => {
    expect(toggleGroup(['digits', 'uppercase', 'lowercase'], 'uppercase')).toEqual([
      'digits',
      'lowercase',
    ]);
  });

  it.each(CHARACTER_GROUPS.map((g) => [g]))(
    'never removes the last remaining group %s',
    (group) => {
      expect(toggleGroup([group as CharacterGroup], group as CharacterGroup)).toEqual([group]);
    },
  );

  it('does not mutate its input', () => {
    const input: CharacterGroup[] = ['lowercase'];
    toggleGroup(input, 'digits');
    expect(input).toEqual(['lowercase']);
  });
});

describe('loadSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults for unparseable JSON', () => {
    const store = storeWith(STORAGE_KEYS.binarySettings, 'not json {');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back per field for garbage values', () => {
    const store = storeWith(
      STORAGE_KEYS.binarySettings,
      JSON.stringify({ mode: 'nope', groups: 'x', groupBits: 'yes', questionCount: 'abc' }),
    );
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields and defaults the rest for partial JSON', () => {
    const store = storeWith(STORAGE_KEYS.binarySettings, JSON.stringify({ mode: 'bitsToChar' }));
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, mode: 'bitsToChar' });
  });

  it('keeps valid fields when only some are invalid', () => {
    const store = storeWith(
      STORAGE_KEYS.binarySettings,
      JSON.stringify({ mode: 'charToBits', groupBits: false, questionCount: 'many' }),
    );
    expect(loadSettings(store)).toEqual({
      ...DEFAULT_SETTINGS,
      groupBits: false,
    });
  });

  it('clamps an out-of-range question count', () => {
    const store = storeWith(STORAGE_KEYS.binarySettings, JSON.stringify({ questionCount: 500 }));
    expect(loadSettings(store).questionCount).toBe(100);
  });
});

describe('saveSettings and loadSettings', () => {
  it('round-trips settings through the store', () => {
    const store = memoryStore();
    const settings: BinarySettings = {
      mode: 'bitsToChar',
      groups: ['uppercase'],
      groupBits: false,
      questionCount: 25,
    };
    saveSettings(settings, store);
    expect(loadSettings(store)).toEqual(settings);
  });

  it('writes under the settings key', () => {
    const store = memoryStore();
    saveSettings(DEFAULT_SETTINGS, store);
    expect(store.map.has(STORAGE_KEYS.binarySettings)).toBe(true);
  });

  it('uses localStorage when no store is given', () => {
    const settings: BinarySettings = { ...DEFAULT_SETTINGS, questionCount: 42 };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it('falls back to defaults when localStorage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('snapshot storage', () => {
  it('save then load returns an equal snapshot', () => {
    const store = memoryStore();
    const snap = validSnapshot();
    saveSnapshot(snap, store);
    expect(loadSnapshot(store)).toEqual(snap);
  });

  it('saving again replaces the previous snapshot', () => {
    const store = memoryStore();
    const first = validSnapshot();
    const second = toSnapshot(createSession('bitsToChar', ['Z'], 0), 0) as Snapshot;
    saveSnapshot(first, store);
    saveSnapshot(second, store);
    expect(loadSnapshot(store)).toEqual(second);
  });

  it('load returns null when nothing is stored', () => {
    expect(loadSnapshot(memoryStore())).toBeNull();
  });

  it('load returns null and removes stored data that is not valid JSON', () => {
    const store = storeWith(STORAGE_KEYS.binarySnapshot, 'garbage{');
    expect(loadSnapshot(store)).toBeNull();
    expect(store.getItem(STORAGE_KEYS.binarySnapshot)).toBeNull();
  });

  it('load returns null and removes an invalid snapshot', () => {
    const store = storeWith(
      STORAGE_KEYS.binarySnapshot,
      JSON.stringify({ ...validSnapshot(), index: 99 }),
    );
    expect(loadSnapshot(store)).toBeNull();
    expect(store.getItem(STORAGE_KEYS.binarySnapshot)).toBeNull();
  });

  it('clear removes the saved snapshot', () => {
    const store = memoryStore();
    saveSnapshot(validSnapshot(), store);
    clearSnapshot(store);
    expect(store.getItem(STORAGE_KEYS.binarySnapshot)).toBeNull();
    expect(loadSnapshot(store)).toBeNull();
  });

  it('clear does not fail when there is nothing stored', () => {
    const store = memoryStore();
    expect(() => clearSnapshot(store)).not.toThrow();
    expect(store.getItem(STORAGE_KEYS.binarySnapshot)).toBeNull();
  });
});
