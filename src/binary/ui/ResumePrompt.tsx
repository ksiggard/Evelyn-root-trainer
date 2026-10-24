import type { BinaryMode } from '../core';

const MODE_LABEL: Record<BinaryMode, string> = {
  charToBits: 'Char → Bits',
  bitsToChar: 'Bits → Char',
};

export function ResumePrompt(props: {
  questionNumber: number;
  total: number;
  mode: BinaryMode;
  onResume: () => void;
  onNewRound: () => void;
}) {
  const { questionNumber, total, mode, onResume, onNewRound } = props;
  return (
    <div
      data-testid="resume.prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-teal-50 p-4 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
        <h2 id="resume-title" className="text-2xl font-bold text-slate-900">
          Welcome back!
        </h2>
        <p className="mt-2 text-slate-700">
          You were on question {questionNumber} of {total} ({MODE_LABEL[mode]}).
        </p>
        <button
          type="button"
          data-testid="resume.resume"
          onClick={onResume}
          className="mt-6 min-h-[56px] w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 text-lg font-bold text-white shadow active:opacity-90"
        >
          Resume
        </button>
        <button
          type="button"
          data-testid="resume.newRound"
          onClick={onNewRound}
          className="mt-3 min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 active:bg-slate-100"
        >
          New round
        </button>
      </div>
    </div>
  );
}
