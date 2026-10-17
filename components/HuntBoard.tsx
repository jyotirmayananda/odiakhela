'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LINES, type HuntMove, pointCol, pointName, pointRow, POINTS, type Side } from '@/engine/hunt';
import type { HuntPiece } from '@/hooks/useHuntGame';

/** Point position on the board in %, shared by the SVG lines and the HTML pieces. */
const PAD = 9;
const STEP = (100 - 2 * PAD) / 4;
const pos = (p: number) => ({ x: PAD + pointCol(p) * STEP, y: PAD + pointRow(p) * STEP });

export interface HuntBoardProps {
  pieces: HuntPiece[];
  /** Tappable points and the move each tap makes. */
  targets?: Map<number, HuntMove>;
  /** Pieces the player may pick up. */
  selectable?: Set<number>;
  selected?: number | null;
  /** A jump being explained: tiger's start, the goat taken, the landing point. */
  capture?: Extract<HuntMove, { kind: 'jump' }> | null;
  lastMove?: HuntMove | null;
  trapped?: number[];
  /** Goats a tiger could jump right now (shown as a warning to the goat player). */
  danger?: number[];
  onTap?: (point: number) => void;
  /** Extra labels for guide diagrams, e.g. { 13: 'taken' }. */
  labels?: Record<number, string>;
  className?: string;
}

export function HuntBoard({
  pieces,
  targets = new Map(),
  selectable = new Set(),
  selected = null,
  capture = null,
  lastMove = null,
  trapped = [],
  danger = [],
  onTap,
  labels = {},
  className = '',
}: HuntBoardProps) {
  const jumpFrom = capture?.from;
  const jumpTo = capture?.to;
  return (
    <div className={`board relative mx-auto aspect-square w-full max-w-[34rem] rounded-[2rem] ${className}`}>
      <span className="hinge left-8" aria-hidden />
      <span className="hinge right-8" aria-hidden />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {LINES.map(([a, b]) => {
          const p = pos(a);
          const q = pos(b);
          return (
            <g key={`${a}-${b}`}>
              {/* carved groove: dark cut with a light lower edge */}
              <line x1={p.x} y1={p.y + 0.35} x2={q.x} y2={q.y + 0.35} stroke="rgba(255,220,170,0.12)" strokeWidth="1.1" strokeLinecap="round" />
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#1a0f0d" strokeWidth="1" strokeLinecap="round" />
            </g>
          );
        })}
        {capture && (
          <motion.line
            x1={pos(capture.from).x}
            y1={pos(capture.from).y}
            x2={pos(capture.to).x}
            y2={pos(capture.to).y}
            stroke="#fcd34d"
            strokeWidth="2.2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ filter: 'drop-shadow(0 0 2px rgba(252,211,77,0.9))' }}
          />
        )}
        {Array.from({ length: POINTS }, (_, p) => (
          <circle key={p} cx={pos(p).x} cy={pos(p).y} r="1.3" fill="#c9a24f" opacity="0.8" />
        ))}
      </svg>

      {/* tap targets and markers, one per point */}
      {Array.from({ length: POINTS }, (_, p) => {
        const move = targets.get(p);
        const canPick = selectable.has(p);
        const label =
          labels[p] ??
          (capture?.over === p ? 'taken' : jumpTo === p ? 'landed' : jumpFrom === p ? 'jumped' : move?.kind === 'jump' ? 'jump' : null);
        const isLast = lastMove && !capture && (lastMove.to === p || ('from' in lastMove && lastMove.from === p));
        return (
          <button
            key={p}
            type="button"
            disabled={!onTap || (!move && !canPick && selected === null)}
            onClick={() => onTap?.(p)}
            aria-label={`${pointName(p)}${move ? (move.kind === 'jump' ? ': jump here and capture' : ': move here') : canPick ? ': pick up' : ''}`}
            className="absolute z-10 flex h-[15%] w-[15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
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
            {capture?.over === p && (
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

      {/* pieces slide between points */}
      <AnimatePresence>
        {pieces.map((pc) => {
          const { x, y } = pos(pc.at);
          const isTrapped = pc.side === 'tiger' && trapped.includes(pc.at);
          const isSelected = selected === pc.at;
          const atRisk = pc.side === 'goat' && danger.includes(pc.at);
          return (
            <motion.div
              key={pc.id}
              className="pointer-events-none absolute z-20 h-[12%] w-[12%]"
              initial={{ left: `${x}%`, top: `${y}%`, scale: 0, opacity: 0 }}
              animate={{ left: `${x}%`, top: `${y}%`, scale: isSelected ? 1.12 : 1, opacity: 1 }}
              exit={{ scale: 0.2, opacity: 0, y: -24, transition: { duration: 0.5 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              style={{ marginLeft: '-6%', marginTop: '-6%' }}
            >
              <Token side={pc.side} />
              {isSelected && <span className="absolute -inset-1 rounded-full ring-4 ring-amber-200" />}
              {selectable.has(pc.at) && !isSelected && <span className="absolute -inset-0.5 rounded-full ring-2 ring-amber-200/60" />}
              {isTrapped && (
                <>
                  <span className="absolute -inset-1 rounded-full ring-[3px] ring-sky-200 shadow-[0_0_16px_rgba(186,230,253,0.8)]" />
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-200 px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide text-wood-900 shadow">
                    trapped
                  </span>
                </>
              )}
              {atRisk && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-400 text-[10px] font-black text-white shadow" title="A tiger can jump this goat">
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

/** Tiger (Bagha) and goat (Chheli) tokens as SVG. */
export function Token({ side }: { side: Side }) {
  if (side === 'tiger') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]" aria-label="Tiger">
        <defs>
          <radialGradient id="tiger-fur" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffc46b" />
            <stop offset="60%" stopColor="#e8862a" />
            <stop offset="100%" stopColor="#a8501a" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="18" fill="url(#tiger-fur)" stroke="#5a2a10" strokeWidth="1.2" />
        {/* ears */}
        <circle cx="9" cy="9" r="4" fill="#e8862a" stroke="#5a2a10" strokeWidth="1" />
        <circle cx="31" cy="9" r="4" fill="#e8862a" stroke="#5a2a10" strokeWidth="1" />
        {/* stripes */}
        {['M6 18 Q10 17 12 20', 'M34 18 Q30 17 28 20', 'M8 25 Q12 24 13 27', 'M32 25 Q28 24 27 27', 'M17 6 Q20 10 23 6', 'M18 11 Q20 13 22 11'].map((d) => (
          <path key={d} d={d} stroke="#2a140a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        ))}
        {/* eyes, muzzle */}
        <circle cx="15" cy="18" r="1.8" fill="#2a140a" />
        <circle cx="25" cy="18" r="1.8" fill="#2a140a" />
        <ellipse cx="20" cy="26" rx="6" ry="4.5" fill="#fff4dc" />
        <path d="M18 24 L22 24 L20 26.5 Z" fill="#2a140a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]" aria-label="Goat">
      <defs>
        <radialGradient id="goat-coat" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#ece2cf" />
          <stop offset="100%" stopColor="#b9a888" />
        </radialGradient>
      </defs>
      {/* horns */}
      <path d="M12 9 Q8 2 4 5" stroke="#6b5636" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M28 9 Q32 2 36 5" stroke="#6b5636" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="21" r="16" fill="url(#goat-coat)" stroke="#8a7350" strokeWidth="1.2" />
      {/* ears */}
      <ellipse cx="5.5" cy="19" rx="4" ry="2.2" fill="#ddd0b6" stroke="#8a7350" strokeWidth="0.8" />
      <ellipse cx="34.5" cy="19" rx="4" ry="2.2" fill="#ddd0b6" stroke="#8a7350" strokeWidth="0.8" />
      <circle cx="15" cy="19" r="1.7" fill="#3a2a18" />
      <circle cx="25" cy="19" r="1.7" fill="#3a2a18" />
      <ellipse cx="20" cy="27" rx="4.5" ry="3.2" fill="#d9c9aa" />
      <circle cx="18.4" cy="27" r="0.8" fill="#3a2a18" />
      <circle cx="21.6" cy="27" r="0.8" fill="#3a2a18" />
    </svg>
  );
}
