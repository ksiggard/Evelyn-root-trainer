import { useState } from 'react';
import {
  CHARACTER_GROUPS,
  GROUP_LABEL,
  bitsFor,
  clampCount,
  displayBits,
  loadSettings,
  saveSettings,
  toggleGroup,
  type BinarySettings,
  type CharacterGroup,
} from '../core';

const PRESETS = [5, 10, 15, 20] as const;

const sel = 'bg-purple-600 text-white border-purple-600';
const unsel = 'bg-white text-slate-800';
const btn = 'min-h-[44px] px-3 py-2 rounded-xl border';

export function BinarySetup({ onStart }: { onStart: (settings: BinarySettings) => void }) {
  const [settings, setSettings] = useState<BinarySettings>(() => loadSettings());

  const update = (patch: Partial<BinarySettings>) => {
    const next: BinarySettings = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const exampleBits = bitsFor('A') ?? '01000001';

  return (
    <div className="mb-4 rounded-2xl bg-white/70 backdrop-blur border shadow">
      <div className="p-4 space-y-4">
        <div>
          <div className="text-sm font-semibold mb-2">Mode</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="setup.mode.charToBits"
              aria-pressed={settings.mode === 'charToBits'}
              className={`${btn} ${settings.mode === 'charToBits' ? sel : unsel}`}
              onClick={() => update({ mode: 'charToBits' })}
            >
              Char → Bits
            </button>
            <button
              type="button"
              data-testid="setup.mode.bitsToChar"
              aria-pressed={settings.mode === 'bitsToChar'}
              className={`${btn} ${settings.mode === 'bitsToChar' ? sel : unsel}`}
              onClick={() => update({ mode: 'bitsToChar' })}
            >
              Bits → Char
            </button>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Example:{' '}
            <span className="font-mono" data-testid="setup.example">
              A = {displayBits(exampleBits, settings.groupBits)}
            </span>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Questions</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                data-testid={`setup.count.${n}`}
                aria-pressed={settings.questionCount === n}
                className={`${btn} min-w-[44px] ${settings.questionCount === n ? 'bg-teal-700 text-white border-teal-700' : unsel}`}
                onClick={() => update({ questionCount: n })}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              data-testid="setup.count.minus"
              aria-label="Fewer questions"
              className={`${btn} w-11 text-xl bg-white`}
              onClick={() => update({ questionCount: clampCount(settings.questionCount - 1) })}
            >
              −
            </button>
            <span data-testid="setup.count" className="min-w-[3ch] text-center text-xl font-semibold" aria-live="polite">
              {settings.questionCount}
            </span>
            <button
              type="button"
              data-testid="setup.count.plus"
              aria-label="More questions"
              className={`${btn} w-11 text-xl bg-white`}
              onClick={() => update({ questionCount: clampCount(settings.questionCount + 1) })}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Character sets</div>
          <div className="flex flex-wrap gap-2">
            {CHARACTER_GROUPS.map((g: CharacterGroup) => {
              const on = settings.groups.includes(g);
              const last = on && settings.groups.length === 1;
              return (
                <button
                  key={g}
                  type="button"
                  data-testid={`setup.group.${g}`}
                  aria-pressed={on}
                  disabled={last}
                  className={`${btn} ${on ? 'bg-indigo-600 text-white border-indigo-600' : unsel} ${last ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={() => update({ groups: toggleGroup(settings.groups, g) })}
                >
                  {GROUP_LABEL[g]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Group bits 3 + 5</div>
            <div className="text-xs text-slate-600 font-mono">011 00001 vs 01100001</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.groupBits}
            aria-label="Group bits 3 + 5"
            data-testid="setup.groupBits"
            className={`relative shrink-0 h-8 w-14 rounded-full border transition-colors ${settings.groupBits ? 'bg-teal-700 border-teal-700' : 'bg-slate-300 border-slate-400'}`}
            onClick={() => update({ groupBits: !settings.groupBits })}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${settings.groupBits ? 'translate-x-6' : ''}`}
            />
          </button>
        </div>

        <button
          type="button"
          data-testid="setup.start"
          className="w-full min-h-[56px] px-4 py-3 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-teal-600 hover:opacity-90"
          onClick={() => onStart(settings)}
        >
          Start
        </button>
      </div>
    </div>
  );
}
