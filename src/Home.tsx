import React from 'react';
import { AppHeader } from './shared/AppHeader';

export function Home({ onChoose }: { onChoose: (trainer: 'roots' | 'binary') => void }) {
  return (
    <div>
      <AppHeader />
      <div className="space-y-4">
        <button
          data-testid="home.roots"
          className="w-full min-h-[140px] rounded-2xl p-5 text-left text-white shadow bg-gradient-to-br from-purple-700 to-indigo-700 flex items-center gap-4"
          onClick={() => onChoose('roots')}
        >
          <span className="text-6xl font-bold leading-none" aria-hidden="true">√</span>
          <span>
            <span className="block text-xl font-bold">Root Training</span>
            <span className="block text-sm opacity-95">Square &amp; cube roots</span>
          </span>
        </button>
        <button
          data-testid="home.binary"
          className="w-full min-h-[140px] rounded-2xl p-5 text-left text-white shadow bg-gradient-to-br from-teal-700 to-indigo-700 flex items-center gap-4"
          onClick={() => onChoose('binary')}
        >
          <span className="text-5xl font-bold font-mono leading-none" aria-hidden="true">01</span>
          <span>
            <span className="block text-xl font-bold">Binary Training</span>
            <span className="block text-sm opacity-95">Letters &amp; numbers in 8-bit code</span>
            <span className="block mt-1 text-xs font-mono opacity-95">A = 010 00001</span>
          </span>
        </button>
      </div>
    </div>
  );
}
