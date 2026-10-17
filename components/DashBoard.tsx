'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { type DashMove, POINTS, SEGMENTS, type Side } from '@/engine/dash';
import type { DashPiece } from '@/hooks/useDashGame';

/** Board units → % of the square container (the board spans x, y ∈ [-3, 3]). */
const SCALE = 14;
const pos = (p: number) => ({ x: 50 + POINTS[p].x * SCALE, y: 50 + POINTS[p].y * SCALE });

export const DASH_NAMES: Record<Side, string> = { 0: 'Ivory', 1: 'Ebony' };

export interface DashBoardProps {
  pieces: DashPiece[];
  targets?: Map<number, DashMove>;
  selectable?: Set<number>;
  selected?: number | null;
  /** The jump being shown: start, piece taken, landing. */
  jumping?: Extract<DashMove, { kind: 'jump' }> | null;
  lastMove?: DashMove | null;
  /** Mid-chain: this piece must jump again. */
  chainFrom?: number | null;
  danger?: number[];
  labels?: Record<number, string>;
  onTap?: (p: number) => void;
}

export function DashBoard({
  pieces,
  targets = new Map(),
  selectable = new Set(),
  selected = null,
  jumping = null,
  lastMove = null,
  chainFrom = null,
  danger = [],
  labels = {},
  onTap,
}: DashBoardProps) {
  return (
    <div className="board relative mx-auto aspect-square w-full max-w-[34rem] rounded-[2rem]">
      <span className="hinge left-8" aria-hidden />
      <span className="hinge right-8" aria-hidden />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {SEGMENTS.map(([a, b]) => {
          const p = pos(a);
          const q = pos(b);
          return (
            <g key={`${a}-${b}`}>
              <line x1={p.x} y1={p.y + 0.35} x2={q.x} y2={q.y + 0.35} stroke="rgba(255,220,170,0.12)" strokeWidth="1.1" strokeLinecap="round" />
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#1a0f0d" strokeWidth="1" strokeLinecap="round" />
            </g>
          );
        })}
        {jumping && (
          <motion.line
            x1={pos(jumping.from).x}
            y1={pos(jumping.from).y}
            x2={pos(jumping.to).x}
            y2={pos(jumping.to).y}
            stroke="#fcd34d"
            strokeWidth="2.2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            style={{ filter: 'drop-shadow(0 0 2px rgba(252,211,77,0.9))' }}
          />
        )}
        {POINTS.map((pt) => (
          <circle key={pt.id} cx={pos(pt.id).x} cy={pos(pt.id).y} r="1.3" fill="#c9a24f" opacity="0.8" />
        ))}
      </svg>

      {POINTS.map(({ id: p }) => {
        const move = targets.get(p);
        const label =
          labels[p] ??
          (jumping?.over === p ? 'taken' : jumping?.to === p ? 'landed' : jumping?.from === p ? 'jumped' : move?.kind === 'jump' ? 'jump' : null);
        const isLast = lastMove && !jumping && (lastMove.to === p || lastMove.from === p);
        return (
          <button
            key={p}
            type="button"
            disabled={!onTap || (!move && !selectable.has(p) && selected === null)}
            onClick={() => onTap?.(p)}
            aria-label={`Point ${p}${move ? (move.kind === 'jump' ? ': jump here and capture' : ': move here') : selectable.has(p) ? ': pick up' : ''}`}
            className="absolute z-10 flex h-[13%] w-[13%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
            style={{ left: `${pos(p).x}%`, top: `${pos(p).y}%` }}
          >
            {isLast && <span className="absolute inset-[18%] rounded-full bg-amber-100/10" />}
            {move && (
              <motion.span
                className={`absolute inset-[16%] rounded-full border-2 border-dashed ${move.kind === 'jump' ? 'border-amber-300 bg-amber-300/25' : 'border-amber-200/80 bg-amber-200/10'}`}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
              />
            )}
            {jumping?.over === p && (
              <motion.span
                className="absolute inset-[10%] rounded-full border-[3px] border-rose-300 shadow-[0_0_22px_rgba(253,164,175,0.8)]"
                animate={{ scale: [1, 1.12, 1], opacity: [1, 0.6, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )}
            {label && (
              <span
                className={`absolute -bottom-1 z-30 whitespace-nowrap rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide shadow-lg sm:text-[10px] ${
                  label === 'taken' ? 'bg-rose-300 text-wood-950' : label === 'jump' ? 'bg-amber-300 text-wood-950' : 'bg-sky-200 text-wood-900'
                }`}
              >
                {label}
              </span>
            )}
          </button>
        );
      })}

      <AnimatePresence>
        {pieces.map((pc) => {
          const { x, y } = pos(pc.at);
          const isSelected = selected === pc.at;
          const canPick = selectable.has(pc.at);
          return (
            <motion.div
              key={pc.id}
              className="pointer-events-none absolute z-20 h-[10%] w-[10%]"
              initial={{ left: `${x}%`, top: `${y}%`, scale: 0, opacity: 0 }}
              animate={{ left: `${x}%`, top: `${y}%`, scale: isSelected ? 1.12 : 1, opacity: 1 }}
              exit={{ scale: 0.2, opacity: 0, y: -24, transition: { duration: 0.45 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              style={{ marginLeft: '-5%', marginTop: '-5%' }}
            >
              <Guti side={pc.side} />
              {isSelected && <span className="absolute -inset-1 rounded-full ring-4 ring-amber-200" />}
              {canPick && !isSelected && <span className="absolute -inset-0.5 rounded-full ring-2 ring-amber-200/70" />}
              {chainFrom === pc.at && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300 px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide text-wood-950 shadow">
                  jump again
                </span>
              )}
              {danger.includes(pc.at) && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-400 text-[10px] font-black text-white shadow" title="This piece can be jumped">
                  !
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** A turned wooden piece: ivory (moves first) or ebony. */
export function Guti({ side }: { side: Side }) {
  const [hi, mid, lo, rim] = side === 0 ? ['#fffaf0', '#efe2c4', '#c7ad80', '#8a7350'] : ['#7a5a48', '#3a2620', '#1a0f0d', '#c9a24f'];
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]" aria-label={DASH_NAMES[side]}>
      <defs>
        <radialGradient id={`guti-${side}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill={`url(#guti-${side})`} stroke={rim} strokeWidth="1.6" />
      <circle cx="20" cy="20" r="11" fill="none" stroke={rim} strokeWidth="1" opacity="0.6" />
      <circle cx="20" cy="20" r="3" fill={rim} opacity="0.55" />
    </svg>
  );
}
