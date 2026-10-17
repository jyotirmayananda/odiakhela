'use client';

import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { CENTRE, cellOf, type ChowkaMove, HOME, OFF, SAFE_CELLS, type Seat, SEAT_NAMES, START_CELLS } from '@/engine/chowka';

export const SEAT_COLOURS: Record<Seat, { fill: string; rim: string; soft: string }> = {
  0: { fill: '#d6455d', rim: '#7a1626', soft: 'rgba(214,69,93,0.22)' },
  1: { fill: '#2fa36b', rim: '#0f4d30', soft: 'rgba(47,163,107,0.22)' },
  2: { fill: '#5b6ee0', rim: '#1f2a78', soft: 'rgba(91,110,224,0.22)' },
  3: { fill: '#f0a020', rim: '#7a4a05', soft: 'rgba(240,160,32,0.25)' },
};

/** Layout in % of the square container: yards in the margins, the 5×5 board in the middle. */
const M = 12;
const B = 100 - 2 * M;
const CELL = B / 5;
const centreOf = (cell: number) => ({ x: M + ((cell % 5) + 0.5) * CELL, y: M + (Math.floor(cell / 5) + 0.5) * CELL });

function yardSpot(seat: Seat, i: number) {
  const along = (i - 1.5) * 6.5;
  const edge = M / 2;
  return [
    { x: 50 + along, y: 100 - edge },
    { x: 100 - edge, y: 50 - along },
    { x: 50 - along, y: edge },
    { x: edge, y: 50 + along },
  ][seat];
}

/** Offsets so several pawns on one square stay visible. */
function cluster(j: number, n: number) {
  if (n === 1) return { dx: 0, dy: 0 };
  if (n === 2) return { dx: j === 0 ? -2.8 : 2.8, dy: 0 };
  if (n <= 4) return { dx: j % 2 ? 2.8 : -2.8, dy: j < 2 ? -2.8 : 2.8 };
  return { dx: ((j % 4) - 1.5) * 3, dy: (Math.floor(j / 4) - 1.5) * 3 };
}

export interface ChowkaBoardProps {
  seats: Seat[];
  /** pawns[seat][i] positions as drawn. */
  pawns: number[][];
  /** Legal moves for the seat to play (only when a person is choosing). */
  moves?: ChowkaMove[];
  turn?: Seat;
  /** Pawns of the seat to play held back by the closed gate. */
  gateBlocked?: number[];
  reveal?: { cell: number; captured: { seat: Seat; pawn: number }[] } | null;
  /** Extra square labels (guide diagrams). */
  labels?: Record<number, string>;
  onPawn?: (pawn: number) => void;
}

export function ChowkaBoard({ seats, pawns, moves = [], turn, gateBlocked = [], reveal = null, labels = {}, onPawn }: ChowkaBoardProps) {
  const [hover, setHover] = useState<number | null>(null);
  const movable = (seat: Seat, i: number) => seat === turn && moves.some((m) => m.from === pawns[seat][i]);
  const hovered = hover !== null && turn !== undefined ? moves.find((m) => m.from === pawns[turn][hover]) : undefined;
  const hoverCell = hovered && turn !== undefined ? cellOf(turn, hovered.to) : null;

  // Group on-board pawns by square so they can be fanned out.
  const groups = new Map<number, { seat: Seat; i: number }[]>();
  for (const seat of seats) {
    pawns[seat].forEach((pos, i) => {
      if (pos === OFF) return;
      const c = pos === HOME ? CENTRE : cellOf(seat, pos);
      groups.set(c, [...(groups.get(c) ?? []), { seat, i }]);
    });
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[36rem] select-none">
      {/* the carved board */}
      <div className="board absolute rounded-2xl" style={{ left: `${M - 1.5}%`, top: `${M - 1.5}%`, width: `${B + 3}%`, height: `${B + 3}%` }} />
      <div className="absolute grid grid-cols-5 grid-rows-5" style={{ left: `${M}%`, top: `${M}%`, width: `${B}%`, height: `${B}%` }}>
        {Array.from({ length: 25 }, (_, c) => {
          const r = Math.floor(c / 5);
          const col = c % 5;
          const inner = r >= 1 && r <= 3 && col >= 1 && col <= 3;
          const startSeat = START_CELLS.indexOf(c) as Seat | -1;
          const active = startSeat >= 0 && seats.includes(startSeat as Seat);
          const label = labels[c] ?? (reveal?.cell === c ? 'capture' : hoverCell === c ? (hovered?.captures.length ? 'capture' : hovered?.to === HOME ? 'home' : 'here') : null);
          return (
            <div
              key={c}
              className={`relative border border-wood-950/70 ${c === CENTRE ? 'bg-amber-200/15' : inner ? 'bg-wood-950/35' : 'bg-wood-800/30'}`}
              style={active ? { background: SEAT_COLOURS[startSeat as Seat].soft } : undefined}
            >
              {SAFE_CELLS.has(c) && (
                <svg viewBox="0 0 10 10" className="absolute inset-[12%] h-[76%] w-[76%]" aria-hidden>
                  <line x1="0" y1="0" x2="10" y2="10" stroke={c === CENTRE ? '#e8c97f' : '#c9a24f'} strokeWidth="0.7" opacity="0.75" />
                  <line x1="10" y1="0" x2="0" y2="10" stroke={c === CENTRE ? '#e8c97f' : '#c9a24f'} strokeWidth="0.7" opacity="0.75" />
                </svg>
              )}
              {c === CENTRE && (
                <span className="absolute inset-x-0 bottom-0.5 text-center text-[8px] font-bold uppercase tracking-widest text-amber-200/70 sm:text-[9px]">home</span>
              )}
              {(hoverCell === c || reveal?.cell === c) && (
                <motion.span
                  className={`absolute inset-[6%] rounded-lg border-2 border-dashed ${reveal?.cell === c || hovered?.captures.length ? 'border-rose-300 bg-rose-300/15' : 'border-amber-200 bg-amber-200/10'}`}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                />
              )}
              {label && (
                <span
                  className={`absolute -top-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide shadow ${
                    label === 'capture' ? 'bg-rose-300 text-wood-950' : label === 'safe' ? 'bg-emerald-200 text-wood-900' : 'bg-amber-200 text-wood-900'
                  }`}
                >
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* pawns: in their yard before entering, otherwise on (or fanned around) their square */}
      {seats.flatMap((seat) =>
        pawns[seat].map((pos, i) => {
          let x: number;
          let y: number;
          if (pos === OFF) ({ x, y } = yardSpot(seat, i));
          else {
            const c = pos === HOME ? CENTRE : cellOf(seat, pos);
            const group = groups.get(c)!;
            const j = group.findIndex((g) => g.seat === seat && g.i === i);
            const { dx, dy } = cluster(j, group.length);
            ({ x, y } = centreOf(c));
            x += dx;
            y += dy;
          }
          const canMove = movable(seat, i);
          const locked = seat === turn && gateBlocked.includes(i);
          const doomed = reveal?.captured.some((c) => c.seat === seat && c.pawn === i);
          const colour = SEAT_COLOURS[seat];
          return (
            <motion.button
              key={`${seat}-${i}`}
              type="button"
              disabled={!canMove || !onPawn}
              onClick={() => onPawn?.(i)}
              onPointerEnter={() => canMove && setHover(i)}
              onPointerLeave={() => setHover(null)}
              aria-label={`${SEAT_NAMES[seat]} pawn ${i + 1}${pos === OFF ? ' (waiting to enter)' : pos === HOME ? ' (home)' : ''}${canMove ? ', can move' : ''}`}
              className={`absolute z-20 h-[5.6%] w-[5.6%] rounded-full outline-none focus-visible:ring-4 focus-visible:ring-amber-200 ${canMove ? 'cursor-pointer' : 'cursor-default'}`}
              initial={false}
              animate={{ left: `${x}%`, top: `${y}%`, scale: doomed ? [1, 1.25, 1] : 1 }}
              transition={doomed ? { scale: { repeat: Infinity, duration: 0.6 } } : { type: 'spring', stiffness: 380, damping: 30 }}
              style={{ marginLeft: '-2.8%', marginTop: '-2.8%' }}
            >
              <span
                className="block h-full w-full rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff8 0%, ${colour.fill} 45%, ${colour.rim} 100%)`,
                  boxShadow: `0 2px 3px rgba(0,0,0,0.6), inset 0 -2px 3px rgba(0,0,0,0.35)`,
                }}
              />
              {canMove && (
                <motion.span
                  className="absolute -inset-1 rounded-full ring-[3px] ring-amber-200"
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
              {doomed && <span className="absolute -inset-1 rounded-full ring-[3px] ring-rose-300" />}
              {locked && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-200 text-wood-900 shadow" title="Gate closed: capture first">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              )}
            </motion.button>
          );
        }),
      )}
    </div>
  );
}

/** Four cowries. Mouth up = the toothed opening shows; mouth down = the smooth humped back. */
export function Shells({ shells, rolling, value }: { shells: boolean[] | null; rolling: boolean; value: number | null }) {
  const faces = shells ?? [true, false, true, false];
  const name = value === 4 ? 'Chamma' : value === 8 ? 'Ashta' : null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {faces.map((up, k) => (
          <motion.div
            key={k}
            className="h-10 w-8"
            animate={rolling ? { rotate: [0, 200 + k * 60, 360 + k * 90], y: [0, -14, 0] } : { rotate: k * 9 - 13, y: 0 }}
            transition={rolling ? { duration: 0.6, ease: 'easeOut' } : { duration: 0.2 }}
          >
            <Cowrie up={rolling ? k % 2 === 0 : up} dim={!shells && !rolling} />
          </motion.div>
        ))}
      </div>
      <div className="h-7">
        {value !== null && !rolling && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-full px-3 py-1 text-sm font-bold ${name ? 'bg-amber-300 text-wood-950 shadow-[0_0_16px_rgba(252,211,77,0.6)]' : 'bg-wood-900 text-amber-100'}`}
          >
            {name ? `${name} – ${value}, throw again!` : `Move ${value}`}
          </motion.span>
        )}
      </div>
    </div>
  );
}

function Cowrie({ up, dim }: { up: boolean; dim: boolean }) {
  return (
    <svg viewBox="0 0 32 40" className={`h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,0.55)] ${dim ? 'opacity-40' : ''}`} aria-label={up ? 'mouth up' : 'mouth down'}>
      <ellipse cx="16" cy="20" rx="13" ry="18" fill={up ? '#f5ead2' : '#e9d6ad'} stroke="#8a7350" strokeWidth="1" />
      {up ? (
        <>
          <path d="M16 4 Q13 20 16 36" stroke="#5e4a2e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {[9, 14, 19, 24, 29].map((y) => (
            <g key={y}>
              <line x1="12.6" y1={y} x2="15" y2={y} stroke="#6b5636" strokeWidth="0.9" />
              <line x1="17" y1={y} x2="19.4" y2={y} stroke="#6b5636" strokeWidth="0.9" />
            </g>
          ))}
        </>
      ) : (
        <>
          <ellipse cx="16" cy="20" rx="9" ry="13" fill="#d8bf8e" opacity="0.7" />
          {[
            [12, 12],
            [19, 15],
            [14, 23],
            [20, 27],
            [11, 29],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#a07a44" opacity="0.7" />
          ))}
          <ellipse cx="12" cy="11" rx="4" ry="2" fill="#fff" opacity="0.5" />
        </>
      )}
    </svg>
  );
}

