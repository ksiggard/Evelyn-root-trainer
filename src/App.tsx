import React, { useState } from 'react';
import { Home } from './Home';
import { RootsTrainer } from './roots/RootsTrainer';
import { BinaryTrainer } from './binary/ui/BinaryTrainer';
import { loadSnapshot } from './binary/core';

type Screen = 'home' | 'roots' | 'binary';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (loadSnapshot() ? 'binary' : 'home'));
  const goHome = () => setScreen('home');

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-purple-50 via-indigo-50 to-teal-50 text-slate-800">
      <div className="max-w-md mx-auto p-4 pb-24">
        {screen === 'home' && <Home onChoose={setScreen} />}
        {screen === 'roots' && <RootsTrainer onHome={goHome} />}
        {screen === 'binary' && <BinaryTrainer onHome={goHome} />}
        <footer className="mt-6 text-center text-xs text-slate-400">Preferences are saved on this device.</footer>
      </div>
    </div>
  );
}
