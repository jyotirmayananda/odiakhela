'use client';

import { motion } from 'framer-motion';
import type { SeedStyle } from '@/store/settings';
import { hash, Seed } from './Seed';

const MAX_DRAWN = 48;

export function Store({
  count,
  label,
  active,
  glowing,
  seedStyle,
  projected = 0,
  callout = null,
}: {
  count: number;
  label: string;
  active: boolean;
  glowing: boolean;
  seedStyle: SeedStyle;
  /** Seeds the hovered move would drop in here (Kalah path hints). */
  projected?: number;
  /** Short label shown on the store, e.g. "free turn". */
  callout?: string | null;
}) {
  const drawn = Math.min(count, MAX_DRAWN);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`store-label text-[10px] font-semibold uppercase tracking-[0.18em] ${active ? 'text-amber-200' : 'text-amber-100/50'}`}>
        {label}
      </span>
      <motion.div
        animate={glowing ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
        className={[
          'pit relative w-[calc(var(--pit)*0.95)] overflow-hidden rounded-[999px]',
          glowing ? 'ring-4 ring-amber-300 shadow-[0_0_28px_rgba(252,211,77,0.7)]' : active ? 'ring-2 ring-amber-200/50' : '',
        ].join(' ')}
        style={{ height: 'calc(var(--pit) * 2 + 1.75rem)' }}
        aria-label={`${label}: ${count} counters`}
      >
        {Array.from({ length: drawn }, (_, k) => (
          <motion.span
            key={k}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute w-[34%] drop-shadow-[0_2px_1px_rgba(0,0,0,0.5)]"
            style={{ left: `${12 + hash(k * 13 + 1) * 54}%`, bottom: `${4 + (k / MAX_DRAWN) * 78 + hash(k * 7) * 6}%` }}
          >
            <Seed style={seedStyle} variantSeed={k * 31 + 5} />
          </motion.span>
        ))}
        <span className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
          <span className="store-count rounded-full border border-brass/70 bg-wood-900/90 px-2.5 py-0.5 text-lg font-bold tabular-nums text-amber-100 shadow-lg">
            {count}
          </span>
        </span>
        {projected > 0 && (
          <span className="pointer-events-none absolute inset-1 rounded-full border-2 border-dashed border-amber-200/80">
            <span className="absolute inset-x-0 bottom-2 flex justify-center">
              <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-bold leading-4 text-wood-900">+{projected}</span>
            </span>
          </span>
        )}
        {callout && (
          <span className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="whitespace-nowrap rounded-full bg-sky-200 px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide text-wood-900 shadow-lg"
            >
              {callout}
            </motion.span>
          </span>
        )}
      </motion.div>
    </div>
  );
}
