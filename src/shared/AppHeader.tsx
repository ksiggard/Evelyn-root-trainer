import React from 'react';
import { APP_VERSION } from '../version';

export function AppHeader({ onHome, right }: { onHome?: () => void; right?: React.ReactNode }) {
  return (
    <header className="mb-4">
      {(onHome || right) && (
        <div className="flex items-center justify-between mb-2 min-h-[44px]">
          {onHome ? (
            <button
              data-testid="header.home"
              className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl border bg-white/70 text-sm"
              onClick={onHome}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h5v-6h4v6h5V10" />
              </svg>
              Home
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">{right}</div>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">Evelyn's Math Trainer</h1>
        <div className="text-xs text-slate-500 shrink-0">v{APP_VERSION}</div>
      </div>
    </header>
  );
}
