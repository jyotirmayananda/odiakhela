'use client';

import { LayoutGroup, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { ownerOf, STORE } from '@/engine/rules';
import type { BoardView, GameState, Player, RevealEvent, SowEvent } from '@/engine/types';
import type { SeedStyle } from '@/store/settings';
import { Pit, type PitFlash, type PitMarker } from './Pit';
import { Store } from './Store';

export interface BoardProps {
  game: GameState;
  view: BoardView;
  activeEvent: SowEvent | null;
  legalMoves: number[];
  onSelect: (pit: number) => void;
  previewPath: (pit: number | null) => number[];
  playerNames: [string, string];
  seedStyle: SeedStyle;
  showProjection: boolean;
  /** Rotate 180° so the active player always sits at the bottom (pass-and-play). */
  rotated: boolean;
  /** Separate id per board on screen so the sowing hand never animates between boards. */
  layoutGroupId?: string;
  /** Smallest pit diameter before the board scrolls instead of shrinking. */
  minPit?: string;
  /** Capture being explained right now: its pits get labelled markers. */
  reveal?: RevealEvent | null;
}

function flashFor(e: SowEvent | null): { pit: number; kind: PitFlash } | null {
  if (!e) return null;
  if (e.type === 'capture') return { pit: e.pit, kind: e.reason };
  if (e.type === 'halt') return { pit: e.pit, kind: e.reason === 'kada' ? 'kada' : 'halt' };
  return null;
}

function markersFor(reveal: RevealEvent | null): Map<number, PitMarker> {
  const m = new Map<number, PitMarker>();
  if (!reveal) return m;
  if (reveal.rule === 'gap') {
    m.set(reveal.last, 'last');
    m.set(reveal.gap, 'gap');
    m.set(reveal.target, 'target');
  } else if (reveal.rule === 'sweep') {
    m.set(reveal.landing, 'landing');
    for (const p of reveal.pairs) m.set(p, p === reveal.opposite ? 'opposite' : 'pair');
  } else if (reveal.rule === 'opposite') {
    m.set(reveal.landing, 'landing');
    m.set(reveal.opposite, 'target');
  }
  // extra_turn marks the store instead (see Store's callout).
  return m;
}

export function Board(props: BoardProps) {
  const { game, view, activeEvent, legalMoves, onSelect, previewPath, playerNames, seedStyle, showProjection, rotated, layoutGroupId = 'board', minPit = '2.6rem', reveal = null } = props;
  const n = game.pitsPerSide;
  const [hovered, setHovered] = useState<number | null>(null);

  const legal = useMemo(() => new Set(legalMoves), [legalMoves]);
  const projection = useMemo(() => {
    const counts = new Map<number, number>();
    if (!showProjection || hovered === null || !legal.has(hovered)) return counts;
    for (const p of previewPath(hovered)) counts.set(p, (counts.get(p) ?? 0) + 1);
    return counts;
  }, [hovered, legal, previewPath, showProjection]);

  const markers = useMemo(() => markersFor(reveal), [reveal]);
  // Column (0 = leftmost) of a sweep's landing pit; its opposite pit shares that column.
  // Bottom-row pit k is column k; the top row runs right to left (pit 2n-1-k is column k).
  const beamColumn =
    reveal?.rule === 'sweep' || reveal?.rule === 'opposite'
      ? reveal.landing < n
        ? reveal.landing
        : 2 * n - 1 - reveal.landing
      : null;

  const flash = flashFor(activeEvent);
  const storeGlow: Player | null =
    activeEvent?.type === 'capture' && activeEvent.reason !== 'round_end'
      ? activeEvent.player
      : activeEvent?.type === 'store_drop'
        ? activeEvent.player
        : reveal?.rule === 'extra_turn'
          ? reveal.player
          : null;
  const freeTurn: Player | null = reveal?.rule === 'extra_turn' ? reveal.player : null;
  // Kalah path hints: seeds the hovered move drops into the mover's own store.
  const storeProjected = projection.get(STORE) ?? 0;

  const handleSelect = useCallback(
    (pit: number) => {
      setHovered(null);
      onSelect(pit);
    },
    [onSelect],
  );

  // Top row shows Player 2's pits right-to-left so sowing reads counterclockwise.
  const topRow = Array.from({ length: n }, (_, k) => 2 * n - 1 - k);
  const bottomRow = Array.from({ length: n }, (_, k) => k);

  const renderPit = (i: number) => (
    <Pit
      key={i}
      index={i}
      count={view.pits[i]}
      owner={ownerOf(game, i)}
      dead={game.deadPits[i]}
      legal={legal.has(i)}
      projected={projection.get(i) ?? 0}
      hand={view.handPit === i && view.hand > 0 ? view.hand : null}
      flash={flash?.pit === i ? flash.kind : null}
      marker={markers.get(i) ?? null}
      seedStyle={seedStyle}
      label={`${playerNames[ownerOf(game, i)]} pit ${(i % n) + 1}`}
      onSelect={handleSelect}
      onHover={setHovered}
    />
  );

  const rowStyle = { gridTemplateColumns: `repeat(${n}, var(--pit))` };
  const active = game.activePlayer;

  return (
    <div className="board-scroll -mx-4 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-0">
      <motion.div
        animate={{ rotate: rotated ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="board mx-auto w-max rounded-[2rem] p-[var(--pad)]"
        style={{ ['--pit' as string]: pitSize(n, minPit) }}
      >
        <span className="hinge left-6" aria-hidden />
        <span className="hinge right-6" aria-hidden />
        <LayoutGroup id={layoutGroupId}>
          <div className="flex items-center gap-[var(--flank)]">
            <Store
              count={view.stores[1]}
              label={playerNames[1]}
              active={active === 1}
              glowing={storeGlow === 1}
              seedStyle={seedStyle}
              projected={active === 1 ? storeProjected : 0}
              callout={freeTurn === 1 ? 'free turn' : null}
            />

            <div className="flex flex-col gap-1">
              <RowLabel player={1} active={active === 1} name={playerNames[1]} direction="left" />
              <div className="relative">
                {beamColumn !== null && beamColumn >= 0 && (
                  // Sweep: a glowing link from the landing pit up to the pair opposite it.
                  <motion.span
                    aria-hidden
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="pointer-events-none absolute z-0 w-2 origin-bottom rounded-full bg-gradient-to-t from-sky-200 via-amber-200 to-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]"
                    style={{
                      left: `calc(${beamColumn} * (var(--pit) + var(--gap)) + var(--pit) / 2 - 0.25rem)`,
                      top: 'calc(var(--pit) / 2)',
                      bottom: 'calc(var(--pit) / 2)',
                    }}
                  />
                )}
                <div className="grid gap-[var(--gap)]" style={rowStyle}>
                  {topRow.map(renderPit)}
                </div>
                <div className="my-1.5 h-px bg-gradient-to-r from-transparent via-brass/50 to-transparent" />
                <div className="grid gap-[var(--gap)]" style={rowStyle}>
                  {bottomRow.map(renderPit)}
                </div>
              </div>
              <RowLabel player={0} active={active === 0} name={playerNames[0]} direction="right" />
            </div>

            <Store
              count={view.stores[0]}
              label={playerNames[0]}
              active={active === 0}
              glowing={storeGlow === 0}
              seedStyle={seedStyle}
              projected={active === 0 ? storeProjected : 0}
              callout={freeTurn === 0 ? 'free turn' : null}
            />
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}

/**
 * Pit diameter that fits the whole board in its container (`.board-scroll` is a size
 * container, so 100cqw is the width actually available). A row is n pits plus ~2 pit
 * widths for the stores; the rest is board padding, flank gaps and pit gaps (CSS variables
 * on .board, smaller on phones) plus slack for the store and row labels.
 * Below the minimum the board scrolls sideways instead of shrinking further.
 */
function pitSize(n: number, min: string): string {
  const fixed = `2 * var(--pad) - 2 * var(--flank) - ${n - 1} * var(--gap) - 2.5rem`;
  const max = n > 7 ? '4.6rem' : '5.6rem';
  return `clamp(${min}, calc((100cqw - ${fixed}) / ${n + 2.2}), ${max})`;
}

function RowLabel({ active, name, direction }: { player: Player; active: boolean; name: string; direction: 'left' | 'right' }) {
  const Arrow = direction === 'left' ? ArrowLeft : ArrowRight;
  return (
    <div
      className={`flex items-center gap-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${
        // Keep clear of the count badges that overhang each row.
        direction === 'left' ? 'mb-2.5 flex-row-reverse justify-start' : 'mt-2.5'
      } ${active ? 'text-amber-200' : 'text-amber-100/35'}`}
    >
      <span>{name}</span>
      <motion.span
        animate={active ? { x: direction === 'left' ? [0, -6, 0] : [0, 6, 0] } : { x: 0 }}
        transition={active ? { repeat: Infinity, duration: 1.4 } : undefined}
      >
        <Arrow className="h-3.5 w-3.5" aria-hidden />
      </motion.span>
      <span className="h-px flex-1 bg-current opacity-30" />
    </div>
  );
}
