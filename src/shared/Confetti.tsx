import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface Piece {
  vx: number;
  vy: number;
  color: string;
  w: number;
  h: number;
  circle: boolean;
  angle: number;
  spin: number;
}

interface Burst {
  start: number;
  pieces: Piece[];
}

const LIFETIME = 1.6;
const FADE_START = 0.9;
const GRAVITY = 320;
const PIECE_COUNT = 60;
const PALETTE = ['#facc15', '#f472b6', '#22d3ee', '#fb923c', '#a855f7', '#ffffff'];

function makeBurst(now: number): Burst {
  const pieces: Piece[] = [];
  for (let i = 0; i < PIECE_COUNT; i++) {
    const dir = -Math.PI * (0.05 + Math.random() * 0.9);
    const speed = 150 + Math.random() * 280;
    const circle = Math.random() < 0.5;
    const side = 5 + Math.random() * 4;
    pieces.push({
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? '#facc15',
      w: side,
      h: circle ? side : side * 1.6,
      circle,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() * 2 - 1) * 12,
    });
  }
  return { start: now, pieces };
}

/** Full-screen canvas confetti. Each change of `burst` (and mount with burst > 0) fires one burst. */
export function Confetti({ burst }: { burst: number }): JSX.Element | null {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const burstsRef = useRef<Burst[]>([]);
  const rafRef = useRef<number | null>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const lastBurstRef = useRef<number>(0);

  // Draw loop, set up once per canvas.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const draw = (): void => {
      rafRef.current = null;
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      burstsRef.current = burstsRef.current.filter((b) => (now - b.start) / 1000 < LIFETIME);
      const ox = w / 2;
      const oy = h * 0.2;
      for (const b of burstsRef.current) {
        const t = (now - b.start) / 1000;
        const fade = t < FADE_START ? 1 : Math.max(0, 1 - (t - FADE_START) / (LIFETIME - FADE_START));
        ctx.globalAlpha = fade;
        for (const p of b.pieces) {
          const x = ox + p.vx * t;
          const y = oy + p.vy * t + 0.5 * GRAVITY * t * t;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.angle + p.spin * t);
          ctx.fillStyle = p.color;
          if (p.circle) {
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (burstsRef.current.length > 0) rafRef.current = requestAnimationFrame(draw);
    };
    drawRef.current = draw;

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      drawRef.current = null;
      burstsRef.current = [];
      lastBurstRef.current = 0; // lets a remount (StrictMode) re-fire the initial burst
    };
  }, [reduced]);

  // Spawn on each burst change (declared after the draw effect so drawRef is ready on mount).
  useEffect(() => {
    if (reduced || burst === lastBurstRef.current) return;
    lastBurstRef.current = burst;
    if (burst <= 0) return;
    burstsRef.current.push(makeBurst(performance.now()));
    if (rafRef.current === null && drawRef.current) rafRef.current = requestAnimationFrame(drawRef.current);
  }, [burst, reduced]);

  if (reduced) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="confetti"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
