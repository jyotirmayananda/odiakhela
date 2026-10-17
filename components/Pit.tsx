'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Hand, X } from 'lucide-react';
import { memo } from 'react';
import type { CaptureReason, Player } from '@/engine/types';
import type { SeedStyle } from '@/store/settings';
import { hash, Seed } from './Seed';

export type PitFlash = CaptureReason | 'halt' | 'kada' | null;

/** Why a pit matters in the capture being explained (see RevealEvent). */
export type PitMarker = 'last' | 'gap' | 'target' | 'landing' | 'opposite' | 'pair';

/** Seeds drawn individually; beyond this the pile stops growing and the badge carries the count. */
const MAX_DRAWN = 28;

export interface PitProps {
  index: number;
  count: number;
  owner: Player;
  dead: boolean;
  legal: boolean;
  /** How many counters this pit would receive from the hovered move's first handful. */
  projected: number;
  /** Counters in hand if the sowing hand is over this pit. */
  hand: number | null;
  flash: PitFlash;
  marker?: PitMarker | null;
  seedStyle: SeedStyle;
  label: string;
  onSelect: (pit: number) => void;
  onHover: (pit: number | null) => void;
}

function seedSpot(pit: number, k: number, drawn: number) {
  // Golden-angle spiral packs seeds evenly whatever the count.
  const r = 33 * Math.sqrt((k + 0.5) / Math.max(drawn, 7));
  const a = k * 2.39996 + hash(pit) * 6.283;
  return { left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` };
}

const MARKER_STYLE: Record<PitMarker, { label: string; ring: string; tag: string; pulse: boolean }> = {
  // Kasadi capture: last counter → empty pit → the pit that is taken
  last: { label: 'last', ring: 'border-2 border-amber-100/70', tag: 'bg-amber-100 text-wood-900', pulse: false },
  gap: { label: 'empty', ring: 'border-2 border-dashed border-sky-200/90', tag: 'bg-sky-200 text-wood-900', pulse: false },
  target: { label: 'take', ring: 'border-[3px] border-amber-300 shadow-[0_0_22px_rgba(252,211,77,0.8)]', tag: 'bg-amber-300 text-wood-950', pulse: true },
  // Lamlameta sweep: landing pit ↔ opposite pair, plus every other pair
  landing: { label: 'landed', ring: 'border-2 border-sky-200/90', tag: 'bg-sky-200 text-wood-900', pulse: false },
  opposite: { label: 'opposite', ring: 'border-[3px] border-amber-300 shadow-[0_0_22px_rgba(252,211,77,0.8)]', tag: 'bg-amber-300 text-wood-950', pulse: true },
  pair: { label: 'pair', ring: 'border-[3px] border-amber-300 shadow-[0_0_22px_rgba(252,211,77,0.8)]', tag: 'bg-amber-300 text-wood-950', pulse: true },
};

const FLASH_RING: Record<Exclude<PitFlash, null>, string> = {
  empty_gap: 'ring-4 ring-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.75)]',
  sweep: 'ring-4 ring-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.75)]',
  opposite: 'ring-4 ring-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.75)]',
  pasu: 'ring-4 ring-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.7)]',
  round_end: 'ring-2 ring-stone-300/60',
  halt: 'ring-2 ring-brass/70',
  kada: 'ring-2 ring-rose-300/70',
};

export const Pit = memo(function Pit(props: PitProps) {
  const { index, count, owner, dead, legal, projected, hand, flash, marker, seedStyle, label, onSelect, onHover } = props;
  const drawn = Math.min(count, MAX_DRAWN);

  return (
    <motion.button
      type="button"
      aria-label={`${label}: ${dead ? 'dead pit' : `${count} counters`}${legal ? ', playable' : ''}`}
      disabled={!legal}
      onClick={() => onSelect(index)}
      onPointerEnter={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(index)}
      onBlur={() => onHover(null)}
      whileHover={legal ? { scale: 1.06, y: owner === 0 ? -2 : 2 } : undefined}
      whileTap={legal ? { scale: 0.95 } : undefined}
      className={[
        'pit relative aspect-square w-[var(--pit)] rounded-full outline-none transition-shadow',
        'focus-visible:ring-4 focus-visible:ring-amber-200',
        dead ? 'pit-dead cursor-not-allowed' : legal ? 'cursor-pointer' : 'cursor-default',
        legal && !flash ? 'ring-2 ring-amber-200/70 shadow-[0_0_14px_rgba(253,230,138,0.35)]' : '',
        flash ? FLASH_RING[flash] : '',
      ].join(' ')}
    >
      {dead ? (
        <X className="absolute inset-0 m-auto h-1/3 w-1/3 text-stone-500/60" aria-hidden />
      ) : (
        <AnimatePresence initial={false}>
          {Array.from({ length: drawn }, (_, k) => (
            <motion.span
              key={k}
              // Percent margins resolve against the (square) pit's width, centring the 30% seed.
              className="absolute -ml-[15%] -mt-[15%] w-[30%] drop-shadow-[0_2px_1px_rgba(0,0,0,0.55)]"
              style={seedSpot(index, k, drawn)}
              initial={{ scale: 0, y: -18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.3, y: -22, opacity: 0, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            >
              <Seed style={seedStyle} variantSeed={index * 97 + k} />
            </motion.span>
          ))}
        </AnimatePresence>
      )}

      {/* Capture explanation: ring + short label on every pit the rule involves */}
      {marker && (
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <motion.span
            className={`absolute -inset-1 rounded-full ${MARKER_STYLE[marker].ring}`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={
              MARKER_STYLE[marker].pulse
                ? { scale: [1, 1.1, 1], opacity: [1, 0.55, 1] }
                : { scale: 1, opacity: 1 }
            }
            transition={MARKER_STYLE[marker].pulse ? { repeat: Infinity, duration: 0.9 } : { duration: 0.25 }}
          />
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className={`relative whitespace-nowrap rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide shadow-lg sm:text-[10px] ${MARKER_STYLE[marker].tag}`}
          >
            {MARKER_STYLE[marker].label}
          </motion.span>
        </span>
      )}

      {/* Path projection: how many counters land here from the hovered pit */}
      <AnimatePresence>
        {projected > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-amber-200/80 bg-amber-200/10"
          >
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-200 px-1.5 text-[10px] font-bold leading-4 text-wood-900">
              +{projected}
            </span>
          </motion.span>
        )}
      </AnimatePresence>

      {!dead && (
        <span
          className={[
            'pointer-events-none absolute inset-x-0 flex justify-center',
            owner === 0 ? '-bottom-2.5' : '-top-2.5',
          ].join(' ')}
        >
          <motion.span
            key={count}
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            className="min-w-[1.4rem] rounded-full border border-brass/60 bg-wood-900/90 px-1.5 text-center text-[11px] font-bold leading-5 text-amber-100 shadow"
          >
            {count}
          </motion.span>
        </span>
      )}

      {hand !== null && (
        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <motion.span
            layoutId="sowing-hand"
            transition={{ type: 'spring', stiffness: 600, damping: 38 }}
            className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-wood-900 shadow-lg"
          >
            <Hand className="h-3.5 w-3.5" aria-hidden />
            {hand}
          </motion.span>
        </span>
      )}
    </motion.button>
  );
});
