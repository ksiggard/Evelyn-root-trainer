/** `index` is the zero-based current question; shown as "index + 1 of total". */
export function QuizHeader(props: { index: number; total: number; onEnd: () => void }) {
  const { index, total, onEnd } = props;
  const shown = Math.min(total, index + 1);
  const pct = total > 0 ? Math.round((shown / total) * 100) : 0;
  return (
    <div className="mb-3 flex items-center gap-3">
      <button
        type="button"
        data-testid="quiz.end"
        onClick={onEnd}
        aria-label="End round"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white/80 text-xl font-bold text-slate-700 shadow-sm active:bg-slate-100"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <div
        className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={shown}
        aria-label="Progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-[width] motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span data-testid="quiz.progress" className="min-w-[4.5rem] text-right text-sm font-semibold text-slate-700">
        {shown} of {total}
      </span>
    </div>
  );
}
