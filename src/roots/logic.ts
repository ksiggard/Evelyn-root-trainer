export type Mode = 'square' | 'cube';
export type InputType = 'typed' | 'mc';
export type RoundPreset = 5 | 10 | 15 | 'open';

export type SessionConfig = { mode: Mode; inputType: InputType; roundLength: RoundPreset; };
export type QA = { prompt: number; root: number; options?: number[]; };
export type Result = { qa: QA; answer: number | string; correct: boolean; ms: number; };

export const ROOT_MIN = 1, ROOT_MAX = 100;

export const cubeLastDigitMap: Record<string, number> = { '0':0,'1':1,'2':8,'3':7,'4':4,'5':5,'6':6,'7':3,'8':2,'9':9 };
export const squareLookup = Array.from({length: ROOT_MAX}, (_,i)=>({ n:i+1, sq:(i+1)*(i+1) }));

export const choice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = <T,>(arr: T[]) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
export const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const avg = (nums:number[]) => nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
export const msToSeconds = (ms:number)=> Math.round(ms)/1000;
export const rootsExcept = (exclude:Set<number>)=>{ const res:number[]=[]; for(let n=ROOT_MIN;n<=ROOT_MAX;n++) if(!exclude.has(n)) res.push(n); return res; };

export function generateQA(mode: Mode, usedRoots = new Set<number>()): QA {
  const available:number[]=[]; for(let n=ROOT_MIN;n<=ROOT_MAX;n++) if(!usedRoots.has(n)) available.push(n);
  const root = choice(available.length ? available : Array.from({length:ROOT_MAX},(_,i)=>i+1));
  const prompt = mode==='square' ? root*root : root*root*root; return { prompt, root };
}

export function buildMCOptions(correctRoot:number, farAsCorrect:boolean = Math.random()<0.2): number[] {
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
