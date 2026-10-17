'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, HelpCircle, Loader2, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type DashMove, type DashState, PIECES, piecesOf, QUIET_LIMIT, type Side } from '@/engine/dash';
import { type DashCapture, type DashOptions, useDashGame } from '@/hooks/useDashGame';
import { sounds, vibrate } from '@/lib/feedback';
import { useSettings } from '@/store/settings';
import { DASH_NAMES, DashBoard, Guti } from './DashBoard';
import { GameGuide } from './GameGuide';
import { Segmented } from './SetupPanel';

export function DashScreen({ options, onExit }: { options: DashOptions; onExit: () => void }) {
  const settings = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [guideOpen, setGuideOpen] = useState(false);

  const onMove = useCallback((m: DashMove, _s: DashState) => {
    const { sound, haptics } = settingsRef.current;
    if (m.kind === 'jump') {
      if (sound) sounds.capture(3);
      if (haptics) vibrate([30, 40, 60]);
    } else if (sound) sounds.drop();
  }, []);

  const g = useDashGame(options, { speed: settings.speed, onMove });
  const { state } = g;
  const vsAI = options.humanSide !== null;
  const name = (side: Side) => (vsAI ? (side === options.humanSide ? 'You' : 'Machine') : DASH_NAMES[side]);
  const you = (side: Side) => vsAI && side === options.humanSide;

  useEffect(() => {
    if (state.winner === null || state.winner === 'draw') return;
    if (vsAI && state.winner !== options.humanSide) return;
    if (settingsRef.current.sound) sounds.win();
    void import('canvas-confetti').then(({ default: confetti }) =>
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, colors: ['#d4a24c', '#f5e6c8', '#3a2620', '#e8c27a'] }),
    );
  }, [state.winner, vsAI, options.humanSide]);

  const sidePanel = (side: Side) => (
    <section
      className={`panel flex flex-row flex-wrap items-center gap-4 rounded-2xl p-4 lg:flex-col lg:items-stretch ${
        state.winner === null && state.turn === side ? 'ring-2 ring-amber-200/60' : 'opacity-80'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="h-9 w-9">
          <Guti side={side} />
        </span>
        <div>
          <p className="font-display text-lg leading-tight text-amber-50">{name(side)}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/60">
            {DASH_NAMES[side]}
            {side === 0 ? ' · moves first' : ''}
          </p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/60">Pieces left</p>
        <div className="mt-1 flex flex-wrap gap-0.5">
          {Array.from({ length: PIECES }, (_, k) => (
            <span
              key={k}
              className={`h-2.5 w-2.5 rounded-full ${k < piecesOf(state.board, side) ? (side === 0 ? 'bg-amber-100' : 'bg-wood-600 ring-1 ring-brass/60') : 'bg-wood-950/60'}`}
            />
          ))}
        </div>
        <p className="mt-1 text-sm font-bold tabular-nums text-amber-100">
          {piecesOf(state.board, side)} / {PIECES}
        </p>
      </div>
    </section>
  );

  const status = g.jumping
    ? `${name(state.turn)} ${you(state.turn) ? 'capture' : 'captures'}!`
    : g.aiThinking
      ? 'Machine is thinking…'
      : state.winner !== null
        ? ''
        : g.isHumanTurn
          ? state.chainFrom !== null
            ? 'Keep going – the same piece must jump again'
            : g.mustCapture
              ? `${vsAI ? 'You' : DASH_NAMES[state.turn]} must capture – pick a glowing piece and jump`
              : `${vsAI ? 'Your move' : DASH_NAMES[state.turn]} – tap a piece, then a glowing point`
          : `${name(state.turn)} to move`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="ghost-btn flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Games
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl text-amber-50">Dash-guti</h2>
          <p className="text-xs text-amber-200/60">
            Ten pieces · compulsory captures{vsAI && ` · you play ${DASH_NAMES[options.humanSide!].toLowerCase()}`}
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

      <AnimatePresence>{guideOpen && <GameGuide game="dash_guti" initialTab="play" onClose={() => setGuideOpen(false)} />}</AnimatePresence>

      <div className="flex min-h-8 items-center justify-center gap-2 text-center text-sm text-amber-100/80" aria-live="polite">
        {g.aiThinking && <Loader2 className="h-4 w-4 animate-spin" />}
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={g.jumping || (g.isHumanTurn && g.mustCapture) ? 'rounded-full bg-amber-300 px-3 py-0.5 font-semibold text-wood-950' : ''}
        >
          {status}
        </motion.span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[13rem_1fr_13rem]">
        {sidePanel(1)}

        <DashBoard
          pieces={g.pieces}
          targets={g.targets}
          selectable={g.selectable}
          selected={g.selected}
          jumping={g.jumping}
          lastMove={g.lastMove}
          chainFrom={g.isHumanTurn ? state.chainFrom : null}
          danger={g.danger}
          onTap={g.tapPoint}
        />

        <div className="flex flex-col gap-4">
          {sidePanel(0)}
          <section className="panel rounded-2xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/60">Moves without a capture</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-wood-950/60">
              <div className={`h-full ${state.quiet > QUIET_LIMIT - 10 ? 'bg-amber-300' : 'bg-brass/60'}`} style={{ width: `${(state.quiet / QUIET_LIMIT) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-amber-100/60">
              {state.quiet} / {QUIET_LIMIT} – at {QUIET_LIMIT}, whoever has more pieces wins.
            </p>
          </section>
        </div>
      </div>

      <DashExplainer capture={g.lastCapture} name={name} />

      <div className="flex justify-center">
        <div className="w-56">
          <Segmented value={settings.speed} options={['slow', 'normal', 'fast'] as const} onChange={(speed) => settings.set({ speed })} />
        </div>
      </div>

      <AnimatePresence>
        {state.winner !== null && (
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
                <div className="mx-auto h-14 w-14">
                  <Guti side={state.winner} />
                </div>
              )}
              <h3 className="font-display text-2xl text-amber-50">
                {state.winner === 'draw' ? 'The game is drawn' : you(state.winner) ? 'You win!' : vsAI ? 'The machine wins' : `${DASH_NAMES[state.winner]} wins`}
              </h3>
              <p className="text-sm text-amber-100/70">
                {state.reason === 'wipeout'
                  ? 'Every one of the other side’s pieces was captured.'
                  : state.reason === 'blocked'
                    ? 'The other side was left with no move at all.'
                    : `${QUIET_LIMIT} moves passed without a capture, so the pieces were counted: ${piecesOf(state.board, 0)} ivory, ${piecesOf(state.board, 1)} ebony.`}
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

/** Plain-language card for the latest capture or chain of captures. */
function DashExplainer({ capture, name }: { capture: DashCapture | null; name: (s: Side) => string }) {
  if (!capture) {
    return (
      <p className="flex min-h-[5.5rem] items-center justify-center px-4 text-center text-xs text-amber-100/40">
        Capture: jump an enemy piece next to you, along a line, into the empty point beyond. Captures are compulsory, and
        a piece that can jump again must keep jumping.
      </p>
    );
  }
  const who = name(capture.by);
  const youTook = who === 'You';
  const n = capture.jumps.length;
  return (
    <motion.section
      key={JSON.stringify(capture.jumps)}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-300/15 via-wood-900/90 to-wood-950/90 p-4 shadow-[0_0_30px_-6px_rgba(252,211,77,0.55)]"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Sparkles className="h-5 w-5 text-amber-300" aria-hidden />
        <h3 className="font-display text-2xl text-amber-200">{n > 1 ? `Chain of ${n}!` : 'Captured!'}</h3>
        <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-wood-950">
          {who} {youTook ? 'have' : 'has'} taken {capture.total}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {['An enemy piece stood right next to the jumping piece, on a line', 'The point straight beyond it, on the same line, was empty'].map((w) => (
          <li key={w} className="flex items-start gap-2 text-sm text-amber-50">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
            {w}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-semibold text-amber-200">
        → So the piece jumped over it and the enemy piece is off the board{n > 1 ? ` – and it could jump again, so it had to: ${n} in one turn` : ''}.
      </p>
      <p className="mt-1 text-xs text-amber-100/55">Captures are compulsory. Keep a friendly piece behind yours, and it can’t be jumped.</p>
    </motion.section>
  );
}
