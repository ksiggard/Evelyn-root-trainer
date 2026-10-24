import React, { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnswerResult } from '../core';

const CORRECT = '#16a34a';
const WRONG = '#dc2626';
const STRIPES_ID = 'wrongStripes';
const SCROLL_AFTER = 20;
const BAR_PX = 18;
const CHART_HEIGHT = 220;

interface Datum {
  n: number;
  seconds: number;
  character: string;
  correct: boolean;
}

/** Hidden SVG that defines the stripe pattern for the whole document (chart bars and legend swatch). */
function StripeDefs(): JSX.Element {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={STRIPES_ID} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#ffffff" />
          <rect width="4" height="8" fill={WRONG} />
        </pattern>
      </defs>
    </svg>
  );
}

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: Datum }>;
}

function BarTip({ active, payload }: TipProps): JSX.Element | null {
  const d = active && payload && payload.length > 0 ? payload[0].payload : null;
  if (!d) return null;
  return (
    <div className="rounded-lg border bg-white px-2 py-1 text-xs shadow">
      <div className="font-mono text-sm">{d.character}</div>
      <div>{d.seconds.toFixed(1)} s · {d.correct ? 'Correct' : 'Wrong'}</div>
    </div>
  );
}

function Swatch({ fill }: { fill: string }): JSX.Element {
  return (
    <svg width="16" height="16" aria-hidden="true" className="shrink-0">
      <rect x="0.5" y="0.5" width="15" height="15" rx="2" fill={fill} stroke="#475569" strokeWidth="1" />
    </svg>
  );
}

export function Results(props: {
  results: AnswerResult[];
  groupBits: boolean;
  onPlayAgain: () => void;
  onSetup: () => void;
  onHome: () => void;
}): JSX.Element {
  const { results, onPlayAgain, onSetup, onHome } = props;

  const data = useMemo<Datum[]>(
    () => results.map((r, i) => ({ n: i + 1, seconds: r.ms / 1000, character: r.character, correct: r.correct })),
    [results],
  );
  const score = results.filter((r) => r.correct).length;
  const avgSeconds = results.length === 0 ? 0 : results.reduce((a, r) => a + r.ms, 0) / results.length / 1000;
  const avgText = avgSeconds.toFixed(1);
  const summary = `${score} of ${results.length} correct, average ${avgText} seconds`;
  const scrolls = results.length > SCROLL_AFTER;
  const ticks = data.length <= 10 ? data.map((d) => d.n) : data.filter((d) => d.n === 1 || d.n % 5 === 0).map((d) => d.n);

  const chart = (width?: number): JSX.Element => (
    <BarChart data={data} width={width} height={CHART_HEIGHT} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="n" ticks={ticks} interval={0} tick={{ fontSize: 12, fill: '#334155' }} />
      <YAxis
        width={44}
        tick={{ fontSize: 12, fill: '#334155' }}
        tickFormatter={(v: number) => `${v}s`}
        allowDecimals
      />
      <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(100,116,139,0.12)' }} />
      <Bar dataKey="seconds" radius={[3, 3, 0, 0]} isAnimationActive={false}>
        {data.map((d) => (
          <Cell
            key={d.n}
            fill={d.correct ? CORRECT : `url(#${STRIPES_ID})`}
            stroke={d.correct ? CORRECT : WRONG}
            strokeWidth={d.correct ? 0 : 1}
          />
        ))}
      </Bar>
    </BarChart>
  );

  return (
    <div className="space-y-4 pb-[env(safe-area-inset-bottom)]">
      <StripeDefs />
      <div className="rounded-2xl bg-white/70 backdrop-blur border shadow p-4 text-center">
        <div className="text-sm text-slate-600">Score</div>
        <div className="text-5xl font-bold" data-testid="results.score">
          {score} / {results.length}
        </div>
        <div className="mt-1 text-slate-700" data-testid="results.average">
          Average {avgText} s
        </div>
      </div>

      <div className="rounded-2xl bg-white/70 backdrop-blur border shadow p-3">
        <div className="text-sm font-medium text-slate-700 mb-1">Seconds per question</div>
        <div
          role="img"
          aria-label={summary}
          data-testid="results.chart"
          className={scrolls ? 'overflow-x-auto' : ''}
        >
          {scrolls ? (
            chart(data.length * BAR_PX + 60)
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              {chart()}
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-2 flex justify-center gap-5 text-sm text-slate-700" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <Swatch fill={CORRECT} /> Correct
          </span>
          <span className="flex items-center gap-1.5">
            <Swatch fill={`url(#${STRIPES_ID})`} /> Wrong
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          data-testid="results.playAgain"
          onClick={onPlayAgain}
          className="w-full min-h-[56px] px-4 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90"
        >
          Play again
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="results.setup"
            onClick={onSetup}
            className="min-h-[48px] px-3 py-2 rounded-xl border bg-white/80 text-slate-800 hover:bg-white"
          >
            Back to setup
          </button>
          <button
            type="button"
            data-testid="results.home"
            onClick={onHome}
            className="min-h-[48px] px-3 py-2 rounded-xl border bg-white/80 text-slate-800 hover:bg-white"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
