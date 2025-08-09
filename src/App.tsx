import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type Mode = 'square' | 'cube';
type InputType = 'typed' | 'mc';
type RoundPreset = 5 | 10 | 15 | 'open';

type SessionConfig = { mode: Mode; inputType: InputType; roundLength: RoundPreset; };
type QA = { prompt: number; root: number; options?: number[]; };
type Result = { qa: QA; answer: number | string; correct: boolean; ms: number; };

const ROOT_MIN = 1, ROOT_MAX = 100;

const cubeLastDigitMap: Record<string, number> = { '0':0,'1':1,'2':8,'3':7,'4':4,'5':5,'6':6,'7':3,'8':2,'9':9 };
const squareLookup = Array.from({length: ROOT_MAX}, (_,i)=>({ n:i+1, sq:(i+1)*(i+1) }));

const choice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const now = ()=> performance.now();
const avg = (nums:number[]) => nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
const msToSeconds = (ms:number)=> Math.round(ms)/1000;
const rootsExcept = (exclude:Set<number>)=>{ const res:number[]=[]; for(let n=ROOT_MIN;n<=ROOT_MAX;n++) if(!exclude.has(n)) res.push(n); return res; };

function generateQA(mode: Mode, usedRoots = new Set<number>()): QA {
  const available:number[]=[]; for(let n=ROOT_MIN;n<=ROOT_MAX;n++) if(!usedRoots.has(n)) available.push(n);
  const root = choice(available.length ? available : Array.from({length:ROOT_MAX},(_,i)=>i+1));
  const prompt = mode==='square' ? root*root : root*root*root; return { prompt, root };
}

function buildMCOptions(correctRoot:number, farAsCorrect:boolean = Math.random()<0.2): number[] {
  const exclude = new Set<number>([correctRoot]);

  const getNear = (center:number, count:number, excludeSet:Set<number>) => {
    const candidates:number[]=[];
    for (let d=1; d<=3 && candidates.length<count*2; d++) {
      const a=center-d, b=center+d;
      if (a>=ROOT_MIN && !excludeSet.has(a)) candidates.push(a);
      if (b<=ROOT_MAX && !excludeSet.has(b)) candidates.push(b);
    }
    const fill = rootsExcept(excludeSet).filter(n=>Math.abs(n-center)<=5);
    const pool = shuffle([...new Set([...candidates,...fill])]);
    const picked:number[]=[];
    for (const n of pool) { if (picked.length>=count) break; picked.push(n); excludeSet.add(n); }
    return picked;
  };
  const getFar = (center:number, excludeSet:Set<number>) => {
    const pool = rootsExcept(excludeSet).filter(n=>Math.abs(n-center)>=10);
    return choice(pool.length?pool:rootsExcept(excludeSet));
  };

  let options:number[]=[];
  if (farAsCorrect) {
    const clusterCenterCandidates = rootsExcept(exclude);
    const clusterCenter = choice(clusterCenterCandidates.filter(n=>Math.abs(n-correctRoot)>=8));
    const near1 = getNear(clusterCenter, 2, exclude);
    const near2 = getNear(clusterCenter, 1, exclude);
    const cluster = [...near1, ...near2];
    while (cluster.length<3) { const f = getNear(clusterCenter,1,exclude); if(!f.length) break; cluster.push(...f); }
    options = shuffle([correctRoot, ...cluster.slice(0,3)]);
  } else {
    const near = getNear(correctRoot, 2, exclude);
    const far = getFar(correctRoot, exclude);
    options = shuffle([correctRoot, ...near, far]).slice(0,4);
  }

  const uniq = Array.from(new Set(options));
  while (uniq.length<4) { const filler = choice(rootsExcept(new Set(uniq))); uniq.push(filler); }
  return shuffle(uniq.slice(0,4));
}

function Donut({ correct, wrong, remaining }:{correct:number; wrong:number; remaining:number}) {
  const total = correct + wrong + remaining;
  const c = 42, circumference = 2 * Math.PI * c;
  const seg = (v:number)=> total ? (v/total)*circumference : 0;
  const correctLen = seg(correct), wrongLen = seg(wrong), remainingLen = seg(remaining);
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24">
      <circle cx="60" cy="60" r={c} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle cx="60" cy="60" r={c} fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray={`${correctLen} ${circumference - correctLen}`} strokeDashoffset={0} />
      <circle cx="60" cy="60" r={c} fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray={`${wrongLen} ${circumference - wrongLen}`} strokeDashoffset={-correctLen} />
      <circle cx="60" cy="60" r={c} fill="none" stroke="#94a3b8" strokeWidth="12" strokeDasharray={`${remainingLen} ${circumference - remainingLen}`} strokeDashoffset={-(correctLen + wrongLen)} />
      <text x="60" y="64" textAnchor="middle" className="fill-slate-700 text-sm font-semibold">{correct}/{total||0}</text>
    </svg>
  );
}

function SquareTip({ nSquared, root }:{nSquared:number; root:number}) {
  let lower = {n:0,sq:0}; for (const x of squareLookup) { if (x.sq<=nSquared) lower=x; else break; }
  let upper = {n:0,sq:0}; for (const x of squareLookup) { if (x.sq>=nSquared){ upper=x; break; } }
  return (
    <div className="space-y-1 text-sm">
      <div>Think in ranges: find consecutive squares around the number.</div>
      <div>{lower.n}² = {lower.sq} and {upper.n}² = {upper.sq}</div>
      <div>Since {nSquared.toLocaleString()} is exactly {root}², the root is <span className="font-semibold">{root}</span>.</div>
    </div>
  );
}
function CubeTip({ nCubed, root }:{nCubed:number; root:number}) {
  const s = String(nCubed);
  const leading = Number(s.slice(0, Math.max(0, s.length-3)) || '0');
  const last3 = s.slice(-3);
  const cubeTable = [0,1,8,27,64,125,216,343,512,729,1000];
  let tens = 0; for (let t=1;t<=10;t++) if (cubeTable[t] <= leading) tens = t;
  const lastDigit = cubeLastDigitMap[last3[last3.length-1]];
  return (
    <div className="space-y-1 text-sm">
      <div>Split the cube into the leading part and the last three digits.</div>
      <div>Leading: <span className="font-mono">{leading}</span> → largest cube ≤ this is {tens}³.</div>
      <div>Last three digits: <span className="font-mono">{last3}</span> → last digit {last3[last3.length-1]} maps to root last digit {lastDigit}.</div>
      <div>Put together: <span className="font-semibold">{tens}{lastDigit}</span> = {root}.</div>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<SessionConfig>(() => {
    const saved = localStorage.getItem('ert_config');
    return saved ? JSON.parse(saved) : { mode:'square', inputType:'mc', roundLength:10 };
  });
  useEffect(()=> localStorage.setItem('ert_config', JSON.stringify(config)), [config]);

  const [started, setStarted] = useState(false);
  const [usedRoots, setUsedRoots] = useState<Set<number>>(new Set());
  const [qa, setQA] = useState<QA|null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showFeedback, setShowFeedback] = useState<null|'correct'|'wrong'>(null);
  const [startTime, setStartTime] = useState<number|null>(null);

  const fixedRoundTotal = typeof config.roundLength === 'number' ? config.roundLength : null;
  const correctCount = results.filter(r=>r.correct).length;
  const wrongCount   = results.filter(r=>!r.correct).length;
  const remaining    = fixedRoundTotal!==null ? Math.max(fixedRoundTotal - results.length, 0) : 0;

  const loadNext = (preferSimilar?:boolean) => {
    const nextQA = generateQA(config.mode, usedRoots);
    if (preferSimilar && results.length) {
      const lastRoot = results[results.length-1].qa.root;
      const near = clamp(lastRoot + (Math.random()<0.5?-1:1)*(1+Math.floor(Math.random()*2)), ROOT_MIN, ROOT_MAX);
      nextQA.root = near; nextQA.prompt = config.mode==='square' ? near*near : near*near*near;
    }
    const farCorrectBias = Math.random()<0.2;
    const mc = config.inputType==='mc' ? buildMCOptions(nextQA.root, farCorrectBias) : undefined;
    setQA({...nextQA, options: mc});
    setOptions(mc || []);
    setTyped('');
    setShowFeedback(null);
    setStartTime(performance.now());
    setUsedRoots(prev => new Set(prev).add(nextQA.root));
  };

  const startGame = () => {
    setStarted(true); setUsedRoots(new Set()); setResults([]); setShowReport(false); loadNext();
  };

  const onContinue = (preferSimilar?:boolean) => {
    setShowFeedback(null);
    if (fixedRoundTotal!==null && results.length >= fixedRoundTotal) setShowReport(true);
    else loadNext(!!preferSimilar);
  };

  const submitAnswer = (ans:number|string) => {
    if (!qa || startTime===null) return;
    const elapsed = performance.now() - startTime;
    const numericAns = typeof ans==='number' ? ans : parseInt(String(ans).trim(),10);
    const isCorrect = numericAns === qa.root;
    setResults(prev => [...prev, { qa, answer: ans, correct: isCorrect, ms: elapsed }]);
    setShowFeedback(isCorrect ? 'correct' : 'wrong');

    const nextCount = results.length + 1;
    if (isCorrect) {
      setTimeout(()=>{
        setShowFeedback(null);
        if (fixedRoundTotal!==null && nextCount >= fixedRoundTotal) setShowReport(true);
        else loadNext();
      }, 1200);
    }
  };

  const reportData = useMemo(()=> results.map((r,i)=>({ index:i+1, seconds: msToSeconds(r.ms), correct:r.correct })), [results]);
  const avgSeconds = useMemo(()=> msToSeconds(avg(results.map(r=>r.ms))), [results]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-purple-50 via-indigo-50 to-teal-50 text-slate-800">
      <div className="max-w-md mx-auto p-4 pb-24">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">Evelyn's Root Trainer</h1>
          <div className="flex items-center gap-2">
            {started && (
              <button className="px-3 py-1.5 rounded-xl border text-sm" onClick={()=>{ setShowReport(false); setStarted(false); }}>Back to setup</button>
            )}
            <div className="text-xs text-slate-500">v0.3</div>
          </div>
        </header>

        {!started && (
          <div className="mb-4 rounded-2xl bg-white/70 backdrop-blur border shadow">
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2">Mode</div>
                <div className="grid grid-cols-2 gap-2">
                  <button className={`px-3 py-2 rounded-xl border ${config.mode==='square'?'bg-purple-600 text-white border-purple-600':'bg-white'}`} onClick={()=>setConfig(c=>({...c,mode:'square'}))}>Square roots</button>
                  <button className={`px-3 py-2 rounded-xl border ${config.mode==='cube'?'bg-purple-600 text-white border-purple-600':'bg-white'}`} onClick={()=>setConfig(c=>({...c,mode:'cube'}))}>Cube roots</button>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Answer type</div>
                <div className="grid grid-cols-2 gap-2">
                  <button className={`px-3 py-2 rounded-xl border ${config.inputType==='typed'?'bg-indigo-600 text-white border-indigo-600':'bg-white'}`} onClick={()=>setConfig(c=>({...c,inputType:'typed'}))}>Type answer</button>
                  <button className={`px-3 py-2 rounded-xl border ${config.inputType==='mc'?'bg-indigo-600 text-white border-indigo-600':'bg-white'}`} onClick={()=>setConfig(c=>({...c,inputType:'mc'}))}>Multiple choice</button>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Round length</div>
                <div className="grid grid-cols-4 gap-2">
                  {[5,10,15].map(n=>(
                    <button key={n} className={`px-3 py-2 rounded-xl border ${config.roundLength===n?'bg-teal-600 text-white border-teal-600':'bg-white'}`} onClick={()=>setConfig(c=>({...c,roundLength:n as RoundPreset}))}>{n}</button>
                  ))}
                  <button className={`px-3 py-2 rounded-xl border ${config.roundLength==='open'?'bg-teal-600 text-white border-teal-600':'bg-white'}`} onClick={()=>setConfig(c=>({...c,roundLength:'open'}))}>Open</button>
                </div>
              </div>

              <div className="pt-2">
                <button className="w-full px-4 py-3 rounded-xl text-white bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90" onClick={startGame}>Start</button>
              </div>
            </div>
          </div>
        )}

        {started && qa && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {fixedRoundTotal!==null ? (
                <div className="flex items-center gap-4">
                  <Donut correct={correctCount} wrong={wrongCount} remaining={remaining} />
                  <div className="text-sm text-slate-600">
                    <div>Correct: {correctCount}</div>
                    <div>Wrong: {wrongCount}</div>
                    <div>Remaining: {remaining}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">Correct <span className="font-semibold">{correctCount}</span> · Wrong {wrongCount} · Total {results.length}</div>
              )}
              <div><button className="px-3 py-1.5 rounded-xl border text-sm" onClick={()=>setShowReport(true)}>End round</button></div>
            </div>

            <div className="rounded-2xl bg-white/70 backdrop-blur border shadow">
              <div className="p-6">
                <div className="text-center">
                  <div className="text-sm text-slate-500 mb-2">Find the {config.mode==='square'?'square':'cube'} root of</div>
                  <AnimatePresence mode="wait">
                    <motion.div key={qa.prompt} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ rotateX: 90, opacity: 0 }} transition={{ duration: 0.35 }} className="text-5xl font-bold tracking-tight select-none">
                      {qa.prompt.toLocaleString()}
                    </motion.div>
                  </AnimatePresence>

                </div>

                <div className="mt-6">
                  {config.inputType==='typed' ? (
                    <div className="flex gap-2">
                      <input inputMode="numeric" pattern="[0-9]*" className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="Type the root (1–100)" value={typed} onChange={(e)=>setTyped(e.target.value.replace(/[^0-9]/g,''))} onKeyDown={(e)=>{ if(e.key==='Enter' && typed.length) submitAnswer(typed); }} />
                      <button className="px-4 py-3 rounded-xl text-white bg-gradient-to-r from-purple-600 to-teal-500" onClick={()=> typed && submitAnswer(typed)}>Submit</button>

                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {options.map(opt => (
                        <button key={opt} className="py-5 text-lg rounded-xl border bg-white hover:bg-slate-50" onClick={()=>submitAnswer(opt)}>{opt}</button>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence>

                  {showFeedback && (

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className={`mt-6 rounded-xl p-4 ${showFeedback==='correct' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-rose-50 to-red-50 border border-red-200'}`}>

                      {showFeedback==='correct' ? (

                        <div className="flex items-center justify-between gap-2">

                          <div className="flex items-center gap-2">

                            <span className="text-2xl">🎉</span>

                            <div className="font-semibold">Nice! That's correct.</div>

                          </div>

                          <button className="px-3 py-2 rounded-xl text-white bg-gradient-to-r from-purple-600 to-teal-500" onClick={()=> onContinue(false)}>Next</button>

                        </div>

                      ) : (

                        <div className="space-y-3">

                          <div className="flex items-center gap-2">

                            <span className="text-2xl">🤔</span>

                            <div>The correct root is <span className="font-semibold">{qa.root}</span>.</div>

                          </div>

                          <div>

                            {config.mode==='square' ? (

                              <SquareTip nSquared={qa.prompt} root={qa.root} />

                            ) : (

                              <CubeTip nCubed={qa.prompt} root={qa.root} />

                            )}

                          </div>

                          <div className="pt-1 flex gap-2">

                            <button className="px-3 py-2 rounded-xl text-white bg-gradient-to-r from-purple-600 to-teal-500" onClick={()=> onContinue(false)}>Continue</button>

                            <button className="px-3 py-2 rounded-xl border" onClick={()=> onContinue(true)}>Try a similar one</button>

                          </div>

                        </div>

                      )}

                    </motion.div>

                  )}

                </AnimatePresence>

              </div>

            </div>

          </div>

        )}

        <AnimatePresence>

          {showReport && (

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" onClick={()=>setShowReport(false)}>

              <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="bg-white w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl p-4 md:p-6 shadow-xl" onClick={(e)=>e.stopPropagation()}>

                <div className="flex items-center justify-between mb-2">

                  <h2 className="text-lg font-semibold">Round summary</h2>

                  <button className="px-3 py-1.5 rounded-xl border" onClick={()=>setShowReport(false)}>Close</button>

                </div>

                <div className="text-sm text-slate-600 mb-4">

                  <div className="flex flex-wrap gap-4">

                    <div>Correct: <span className="font-semibold text-green-600">{correctCount}</span></div>

                    <div>Wrong: <span className="font-semibold text-red-600">{wrongCount}</span></div>

                    <div>Average time: <span className="font-semibold">{avgSeconds.toFixed(2)}s</span></div>

                  </div>

                </div>

                <div className="h-64">

                  <ResponsiveContainer width="100%" height="100%">

                    <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="index" name="Question" type="number" allowDecimals={false} />

                      <YAxis dataKey="seconds" name="Seconds" type="number" />

                      <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value)=>`${value}s`} />

                      <Legend />

                      <Scatter name="Answers" data={reportData} shape={(props:any)=>{

                        const { cx, cy, payload } = props; const isCorrect = payload.correct;

                        return (

                          <g transform={`translate(${cx},${cy})`}>

                            <circle r={10} fill={isCorrect ? '#86efac' : '#fecaca'} opacity={0.35} />

                            <text textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill={isCorrect ? '#16a34a' : '#dc2626'}>

                              {isCorrect ? '+' : '−'}

                            </text>

                          </g>

                        );

                      }} />

                    </ScatterChart>

                  </ResponsiveContainer>

                </div>

                <div className="mt-4 flex flex-wrap gap-2">

                  <button className="px-3 py-2 rounded-xl text-white bg-gradient-to-r from-purple-600 to-teal-500" onClick={()=>{ setShowReport(false); startGame(); }}>Play again</button>

                  <button className="px-3 py-2 rounded-xl border" onClick={()=>{ setShowReport(false); onContinue(true); }}>Try a similar one</button>

                  <button className="px-3 py-2 rounded-xl border" onClick={()=>{ setShowReport(false); setStarted(false); }}>Back to setup</button>

                </div>

              </motion.div>

            </motion.div>

          )}

        </AnimatePresence>

        <footer className="mt-6 text-center text-xs text-slate-400">Preferences are saved on this device.</footer>

      </div>

    </div>

  );
}
