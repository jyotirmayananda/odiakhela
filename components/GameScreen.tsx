'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, FastForward, HelpCircle, Loader2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardView, GameOptions, SowEvent } from '@/engine/types';
import { VARIANTS } from '@/engine/variants';
import { useMancalaGame } from '@/hooks/useMancalaGame';
import { sounds, vibrate } from '@/lib/feedback';
import { type SeedStyle, useSettings } from '@/store/settings';
import { Board } from './Board';
import { CaptureExplainer } from './CaptureExplainer';
import { GameGuide } from './GameGuide';
import { Segmented } from './SetupPanel';

const CAPTURE_TEXT = { empty_gap: 'Capture!', pasu: 'Pasu!', sweep: 'Sweep!', opposite: 'Capture!', round_end: '' } as const;

export function GameScreen({ options, onExit }: { options: GameOptions; onExit: () => void }) {
  const settings = useSettings();
  const [guideOpen, setGuideOpen] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onEvent = useCallback((e: SowEvent, _v: BoardView) => {
    const { sound, haptics } = settingsRef.current;
    if ((e.type === 'drop' || e.type === 'store_drop') && sound) sounds.drop();
    if (e.type === 'pickup' && sound) sounds.scoop(e.count);
    if (e.type === 'capture' && e.reason !== 'round_end') {
      if (sound) sounds.capture(e.count);
      if (haptics) vibrate([30, 40, 60]);
    }
  }, []);

  const g = useMancalaGame(options, { speed: settings.speed, onEvent });
  const { game } = g;
  const cfg = VARIANTS[game.variant];
  const names: [string, string] = game.isVsAI ? ['You', 'Machine'] : ['Player 1', 'Player 2'];

  // Turn-change and match-end feedback.
  useEffect(() => {
    if (game.turnPhase !== 'SELECT_PIT') return;
    if (settingsRef.current.haptics) vibrate(15);
    if (settingsRef.current.sound) sounds.turn();
  }, [game.activePlayer, game.turnPhase]);

  useEffect(() => {
    if (game.turnPhase !== 'MATCH_OVER') return;
    const humanWon = game.isVsAI ? game.winner === 0 : game.winner !== 'draw';
    if (!humanWon) return;
    if (settingsRef.current.sound) sounds.win();
    void import('canvas-confetti').then(({ default: confetti }) =>
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, colors: ['#d4a24c', '#f5e6c8', '#8b4513', '#e8c27a'] }),
    );
  }, [game.turnPhase, game.winner, game.isVsAI]);

  const lastEvent = g.activeEvent;
  const banner =
    lastEvent?.type === 'reveal'
      ? lastEvent.rule === 'sweep'
        ? `Sweep! ${lastEvent.pairs.length} pair${lastEvent.pairs.length === 1 ? '' : 's'} to ${names[game.activePlayer]}`
        : lastEvent.rule === 'extra_turn'
          ? `Free turn! ${names[lastEvent.player]} ${names[lastEvent.player] === 'You' ? 'go' : 'goes'} again`
          : `Capture! ${lastEvent.count} to ${names[game.activePlayer]}`
      : lastEvent?.type === 'capture' && lastEvent.reason !== 'round_end'
      ? `${CAPTURE_TEXT[lastEvent.reason]} +${lastEvent.count} to ${names[lastEvent.player]}`
      : lastEvent?.type === 'halt' && lastEvent.reason === 'kada'
        ? 'Kada – two empty pits, no capture'
        : null;

  const status =
    game.turnPhase === 'SOWING_ANIMATION'
      ? game.isVsAI && game.activePlayer === 0
        ? 'Sowing…'
        : `${names[game.activePlayer]} sowing…`
      : g.aiThinking
        ? 'Machine is thinking…'
        : game.turnPhase === 'SELECT_PIT'
          ? game.isVsAI
            ? 'Your move – pick a glowing pit'
            : `${names[game.activePlayer]} to move`
          : '';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="ghost-btn flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Games
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl text-amber-50">{cfg.name}</h2>
          <p className="text-xs text-amber-200/60">
            {cfg.region}
            {cfg.multiRound && ` · Round ${game.roundNumber}`}
            {game.pasu !== 'off' && ' · Pasu on'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setGuideOpen(true)} className="ghost-btn" aria-label="About and how to play">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => settings.set({ sound: !settings.sound })}
            className="ghost-btn"
            aria-label={settings.sound ? 'Mute' : 'Unmute'}
          >
            {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {guideOpen && <GameGuide game={game.variant} initialTab="play" onClose={() => setGuideOpen(false)} />}
      </AnimatePresence>

      <div className="flex h-8 items-center justify-center gap-2 text-sm text-amber-100/80" aria-live="polite">
        {g.aiThinking && <Loader2 className="h-4 w-4 animate-spin" />}
        {/* No exit animation: during sowing the text can change every step, and waiting
            for exits would leave the line blank. */}
        <motion.span
          key={banner ?? status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={banner ? 'rounded-full bg-amber-300 px-3 py-0.5 font-semibold text-wood-950' : ''}
        >
          {banner ?? status}
        </motion.span>
      </div>

      <Board
        game={game}
        view={g.view}
        activeEvent={g.activeEvent}
        legalMoves={g.legalMoves}
        onSelect={g.selectPit}
        previewPath={g.previewPath}
        playerNames={names}
        seedStyle={settings.seedStyle}
        showProjection={settings.showProjection}
        rotated={!game.isVsAI && settings.rotateForPlayer2 && game.activePlayer === 1}
        reveal={g.boardReveal}
      />

      <CaptureExplainer
        explanation={g.explanation}
        names={names}
        rule={cfg.family === 'lamlameta' ? 'sweep' : cfg.family === 'kalah' ? 'opposite' : 'gap'}
      />

      <div className="flex flex-wrap items-end justify-center gap-4">
        <div className="w-64">
          <Segmented
            value={settings.seedStyle}
            options={['cowrie', 'tamarind', 'pebble'] as SeedStyle[]}
            onChange={(seedStyle) => settings.set({ seedStyle })}
          />
        </div>
        <div className="w-56">
          <Segmented value={settings.speed} options={['slow', 'normal', 'fast'] as const} onChange={(speed) => settings.set({ speed })} />
        </div>
        <Toggle label="Path hints" on={settings.showProjection} onChange={(showProjection) => settings.set({ showProjection })} />
        {!game.isVsAI && (
          <Toggle label="Rotate for P2" on={settings.rotateForPlayer2} onChange={(rotateForPlayer2) => settings.set({ rotateForPlayer2 })} />
        )}
        <Toggle label="Haptics" on={settings.haptics} onChange={(haptics) => settings.set({ haptics })} />
        <button type="button" onClick={g.skipAnimation} disabled={!g.isAnimating} className="ghost-btn flex items-center gap-1 disabled:opacity-30">
          <FastForward className="h-4 w-4" /> Skip
        </button>
      </div>

      <AnimatePresence>
        {(game.turnPhase === 'ROUND_OVER' || game.turnPhase === 'MATCH_OVER') && (
          <ResultDialog
            title={
              game.turnPhase === 'MATCH_OVER'
                ? game.winner === 'draw'
                  ? 'The match is drawn'
                  : `${names[game.winner ?? 0]} ${game.isVsAI && game.winner === 0 ? 'win' : 'wins'} the match`
                : `Round ${game.roundNumber} complete`
            }
            game={game}
            names={names}
            primary={
              game.turnPhase === 'ROUND_OVER'
                ? { label: 'Refill & start next round', onClick: g.nextRound }
                : { label: 'Play again', onClick: () => g.newGame(options) }
            }
            onExit={onExit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-2 text-sm text-amber-100/80">
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-brass' : 'bg-wood-700'}`}>
        <motion.span layout className={`absolute top-0.5 h-4 w-4 rounded-full bg-amber-50 shadow ${on ? 'right-0.5' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  );
}

function ResultDialog({
  title,
  game,
  names,
  primary,
  onExit,
}: {
  title: string;
  game: ReturnType<typeof useMancalaGame>['game'];
  names: [string, string];
  primary: { label: string; onClick: () => void };
  onExit: () => void;
}) {
  const nextDead = game.turnPhase === 'ROUND_OVER'
    ? ([0, 1] as const).map((p) => Math.max(0, game.pitsPerSide - Math.floor(game.stores[p] / game.seedsPerPit)))
    : null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} className="panel w-full max-w-sm space-y-4 rounded-3xl p-6 text-center">
        <h3 className="font-display text-2xl text-amber-50">{title}</h3>
        <div className="grid grid-cols-2 gap-3">
          {names.map((n, p) => (
            <div key={n} className="rounded-2xl border border-brass/30 bg-wood-950/50 p-3">
              <div className="text-xs uppercase tracking-widest text-amber-200/60">{n}</div>
              <div className="text-3xl font-bold tabular-nums text-amber-100">{game.stores[p]}</div>
              {nextDead && (
                <div className="mt-1 text-[11px] text-amber-100/60">
                  {nextDead[p] === 0 ? 'All pits refilled' : `${nextDead[p]} dead pit${nextDead[p] > 1 ? 's' : ''} next round`}
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={primary.onClick} className="brass-btn flex w-full items-center justify-center gap-2 py-2.5">
          <RotateCcw className="h-4 w-4" /> {primary.label}
        </button>
        <button type="button" onClick={onExit} className="text-sm text-amber-100/60 underline-offset-4 hover:underline">
          Choose another game
        </button>
      </motion.div>
    </motion.div>
  );
}
