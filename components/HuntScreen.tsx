'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, HelpCircle, Loader2, RotateCcw, Sparkles, Undo2, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GOATS, type HuntMove, type HuntState, MAX_PLIES, type Side, TIGERS_TO_WIN } from '@/engine/hunt';
import { type HuntOptions, useHuntGame } from '@/hooks/useHuntGame';
import { sounds, vibrate } from '@/lib/feedback';
import { useSettings } from '@/store/settings';
import { GameGuide } from './GameGuide';
import { HuntBoard, Token } from './HuntBoard';
import { Segmented } from './SetupPanel';

const SIDE_NAME: Record<Side, string> = { goat: 'Goats', tiger: 'Tigers' };

export function HuntScreen({ options, onExit }: { options: HuntOptions; onExit: () => void }) {
  const settings = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [guideOpen, setGuideOpen] = useState(false);
  /** Last capture, kept on screen until the next move so it can be read. */
  const [explained, setExplained] = useState<{ move: Extract<HuntMove, { kind: 'jump' }>; captured: number } | null>(null);

  const onMove = useCallback((m: HuntMove, next: HuntState) => {
    const { sound, haptics } = settingsRef.current;
    if (m.kind === 'jump') {
      setExplained({ move: m, captured: next.captured });
      if (sound) sounds.capture(4);
      if (haptics) vibrate([30, 40, 60]);
    } else {
      setExplained(null);
      if (sound) sounds.drop();
    }
  }, []);

  const g = useHuntGame(options, { speed: settings.speed, onMove });
  const { state } = g;
  const vsAI = options.humanSide !== null;
  const name = (side: Side) => (vsAI ? (side === options.humanSide ? 'You' : 'Machine') : SIDE_NAME[side]);

  useEffect(() => {
    if (!state.winner) return;
    const humanWon = vsAI ? state.winner === options.humanSide : state.winner !== 'draw';
    if (!humanWon) return;
    if (settingsRef.current.sound) sounds.win();
    void import('canvas-confetti').then(({ default: confetti }) =>
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, colors: ['#d4a24c', '#f5e6c8', '#e8862a', '#e8c27a'] }),
    );
  }, [state.winner, vsAI, options.humanSide]);

  const status = g.capture
    ? `Tiger jumps! Goat ${state.captured + 1} of ${TIGERS_TO_WIN} taken`
    : g.aiThinking
      ? 'Machine is thinking…'
      : state.winner
        ? ''
        : g.isHumanTurn
          ? state.turn === 'goat'
            ? state.goatsInHand > 0
              ? `${vsAI ? 'Your move' : 'Goats'} – place a goat on any empty point (${state.goatsInHand} left)`
              : `${vsAI ? 'Your move' : 'Goats'} – tap a goat, then a glowing point`
            : `${vsAI ? 'Your move' : 'Tigers'} – tap a tiger, then a glowing point (or jump a goat)`
          : `${name(state.turn)} to move`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="ghost-btn flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Games
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl text-amber-50">Bagha Chheli</h2>
          <p className="text-xs text-amber-200/60">
            Odisha · Tigers &amp; goats{vsAI && ` · you play the ${options.humanSide === 'goat' ? 'goats' : 'tigers'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setGuideOpen(true)} className="ghost-btn" aria-label="About and how to play">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => settings.set({ sound: !settings.sound })} className="ghost-btn" aria-label={settings.sound ? 'Mute' : 'Unmute'}>
            {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <AnimatePresence>{guideOpen && <GameGuide game="bagha_chheli" initialTab="play" onClose={() => setGuideOpen(false)} />}</AnimatePresence>

      <div className="flex min-h-8 items-center justify-center gap-2 text-center text-sm text-amber-100/80" aria-live="polite">
        {g.aiThinking && <Loader2 className="h-4 w-4 animate-spin" />}
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={g.capture ? 'rounded-full bg-amber-300 px-3 py-0.5 font-semibold text-wood-950' : ''}
        >
          {status}
        </motion.span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[13rem_1fr_13rem]">
        <SidePanel side="goat" title={name('goat')} active={!state.winner && state.turn === 'goat'}>
          <Stat label="To place" value={`${state.goatsInHand} / ${GOATS}`} />
          <Stat label="Captured" value={`${state.captured}`} warn={state.captured >= TIGERS_TO_WIN - 1} />
          <p className="text-xs leading-relaxed text-amber-100/55">Win by trapping all 4 tigers so none can move or jump.</p>
        </SidePanel>

        <HuntBoard
          pieces={g.pieces}
          targets={g.targets}
          selectable={g.selectable}
          selected={g.selected}
          capture={g.capture}
          lastMove={g.lastMove}
          trapped={g.busy ? [] : g.trapped}
          danger={!g.busy && g.isHumanTurn && state.turn === 'goat' ? g.danger : []}
          onTap={g.tapPoint}
        />

        <SidePanel side="tiger" title={name('tiger')} active={!state.winner && state.turn === 'tiger'}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/60">Goats captured</p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: TIGERS_TO_WIN }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 rounded-full ${i < state.captured ? 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.7)]' : 'bg-wood-700'}`} />
              ))}
            </div>
            <p className="mt-1 text-sm font-bold tabular-nums text-amber-100">
              {state.captured} / {TIGERS_TO_WIN}
            </p>
          </div>
          <Stat label="Trapped" value={`${g.trapped.length} / 4`} warn={g.trapped.length >= 3} />
          <p className="text-xs leading-relaxed text-amber-100/55">Win by capturing {TIGERS_TO_WIN} goats.</p>
        </SidePanel>
      </div>

      <HuntExplainer explained={explained} />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={g.back}
          disabled={!g.canBack || g.aiThinking}
          className="ghost-btn flex items-center gap-1.5 disabled:opacity-30"
          title={g.selected !== null ? 'Cancel selection – pick another piece' : 'Undo last move'}
        >
          <Undo2 className="h-4 w-4" /> Back
        </button>
        <div className="w-56">
          <Segmented value={settings.speed} options={['slow', 'normal', 'fast'] as const} onChange={(speed) => settings.set({ speed })} />
        </div>
        <span className="text-xs text-amber-100/45">Drawn after {MAX_PLIES} moves without a result.</span>
      </div>

      <AnimatePresence>
        {state.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="panel w-full max-w-sm space-y-4 rounded-3xl p-6 text-center">
              {state.winner !== 'draw' && (
                <div className="mx-auto h-16 w-16">
                  <Token side={state.winner} />
                </div>
              )}
              <h3 className="font-display text-2xl text-amber-50">
                {state.winner === 'draw'
                  ? 'The game is drawn'
                  : vsAI
                    ? state.winner === options.humanSide
                      ? 'You win!'
                      : 'The machine wins'
                    : `${SIDE_NAME[state.winner]} win!`}
              </h3>
              <p className="text-sm text-amber-100/70">
                {state.winner === 'tiger'
                  ? `The tigers captured ${state.captured} goats.`
                  : state.winner === 'goat'
                    ? 'Every tiger is trapped – none can move or jump.'
                    : `${MAX_PLIES} moves passed without a result.`}
              </p>
              <button type="button" onClick={g.newGame} className="brass-btn flex w-full items-center justify-center gap-2 py-2.5">
                <RotateCcw className="h-4 w-4" /> Play again
              </button>
              <button type="button" onClick={onExit} className="text-sm text-amber-100/60 underline-offset-4 hover:underline">
                Choose another game
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidePanel({ side, title, active, children }: { side: Side; title: string; active: boolean; children: React.ReactNode }) {
  return (
    <section
      className={`panel flex flex-row flex-wrap items-center gap-4 rounded-2xl p-4 lg:flex-col lg:items-stretch ${
        active ? 'ring-2 ring-amber-200/60' : 'opacity-80'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="h-9 w-9">
          <Token side={side} />
        </span>
        <div>
          <p className="font-display text-lg leading-tight text-amber-50">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/60">{side === 'goat' ? 'Chheli · 20' : 'Bagha · 4'}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/60">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${warn ? 'text-amber-300' : 'text-amber-100'}`}>{value}</p>
    </div>
  );
}

/** Plain-language "why" for the latest tiger capture. */
function HuntExplainer({ explained }: { explained: { move: Extract<HuntMove, { kind: 'jump' }>; captured: number } | null }) {
  if (!explained) {
    return (
      <p className="flex min-h-[5.5rem] items-center justify-center px-4 text-center text-xs text-amber-100/40">
        Capture: a tiger jumps over a goat next to it, along a line, into the empty point straight beyond – and the goat is
        taken. Goats never capture; they win by trapping.
      </p>
    );
  }
  const left = TIGERS_TO_WIN - explained.captured;
  return (
    <motion.section
      key={JSON.stringify(explained.move)}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-300/15 via-wood-900/90 to-wood-950/90 p-4 shadow-[0_0_30px_-6px_rgba(252,211,77,0.55)]"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Sparkles className="h-5 w-5 text-amber-300" aria-hidden />
        <h3 className="font-display text-2xl text-amber-200">Tiger jumps!</h3>
        <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-wood-950">
          {explained.captured} of {TIGERS_TO_WIN} goats taken
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {['A goat stood right next to the tiger, on a line', 'The point straight beyond that goat, on the same line, was empty'].map((w) => (
          <li key={w} className="flex items-start gap-2 text-sm text-amber-50">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
            {w}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-semibold text-amber-200">→ So the tiger leapt over it into that point, and the goat is off the board.</p>
      <p className="mt-1 text-xs text-amber-100/55">
        {left > 0
          ? `${left} more and the tigers win. Goats: keep the point behind every goat covered, or the goat out of a tiger’s reach.`
          : 'That was the fifth – the tigers win.'}
      </p>
    </motion.section>
  );
}
