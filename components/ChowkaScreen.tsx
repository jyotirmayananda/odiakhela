'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Dices, HelpCircle, Loader2, Lock, RotateCcw, Sparkles, Unlock, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HOME, OFF, PAWNS, type Seat, SEAT_NAMES } from '@/engine/chowka';
import { type ChowkaNews, type ChowkaOptions, useChowkaGame } from '@/hooks/useChowkaGame';
import { sounds, vibrate } from '@/lib/feedback';
import { useSettings } from '@/store/settings';
import { ChowkaBoard, SEAT_COLOURS, Shells } from './ChowkaBoard';
import { GameGuide } from './GameGuide';
import { Segmented } from './SetupPanel';

export function ChowkaScreen({ options, onExit }: { options: ChowkaOptions; onExit: () => void }) {
  const settings = useSettings();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [guideOpen, setGuideOpen] = useState(false);

  const onEvent = useCallback((kind: 'step' | 'throw' | 'capture' | 'home') => {
    const { sound, haptics } = settingsRef.current;
    if (!sound && !haptics) return;
    if (kind === 'step' && sound) sounds.drop();
    if (kind === 'throw' && sound) sounds.scoop(4);
    if (kind === 'home' && sound) sounds.turn();
    if (kind === 'capture') {
      if (sound) sounds.capture(4);
      if (haptics) vibrate([30, 40, 60]);
    }
  }, []);

  const g = useChowkaGame(options, { speed: settings.speed, onEvent });
  const { state } = g;
  const soloVsMachine = options.humanSeats.length === 1;
  const name = (seat: Seat) => (soloVsMachine ? (g.isHuman(seat) ? 'You' : `${SEAT_NAMES[seat]} (machine)`) : SEAT_NAMES[seat]);

  useEffect(() => {
    if (state.winner === null || state.winner === 'draw') return;
    if (soloVsMachine && !g.isHuman(state.winner)) return;
    if (settingsRef.current.sound) sounds.win();
    void import('canvas-confetti').then(({ default: confetti }) =>
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, colors: [SEAT_COLOURS[state.winner as Seat].fill, '#f5e6c8', '#d4a24c'] }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.winner]);

  const you = (seat: Seat) => soloVsMachine && g.isHuman(seat);
  const status =
    state.winner !== null
      ? ''
      : g.rolling
        ? `${name(state.turn)} ${you(state.turn) ? 'throw' : 'throws'} the shells…`
        : g.humanTurn
          ? state.phase === 'throw'
            ? `${soloVsMachine ? 'Your' : `${name(state.turn)}’s`} turn – throw the shells`
            : `Move ${state.throwValue}: tap a glowing pawn`
          : g.busy
            ? `${name(state.turn)} moving…`
            : `${name(state.turn)} to play`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onExit} className="ghost-btn flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Games
        </button>
        <div className="text-center">
          <h2 className="font-display text-2xl text-amber-50">Chowka Bara</h2>
          <p className="text-xs text-amber-200/60">Cowrie-shell race · {options.players} players</p>
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

      <AnimatePresence>{guideOpen && <GameGuide game="chowka_bara" initialTab="play" onClose={() => setGuideOpen(false)} />}</AnimatePresence>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_19rem]">
        <ChowkaBoard
          seats={state.seats}
          pawns={g.shown}
          moves={g.moves}
          turn={state.turn}
          gateBlocked={g.gateBlocked}
          reveal={g.reveal}
          onPawn={(pawn) => {
            const m = g.moveForPawn(pawn);
            if (m) g.move(m);
          }}
        />

        <div className="flex flex-col gap-4">
          <section className="panel flex flex-col items-center gap-3 rounded-2xl p-4" aria-live="polite">
            <p className="flex min-h-10 items-center gap-2 text-center text-sm text-amber-100/85">
              {!g.humanTurn && g.busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {status}
            </p>
            <Shells shells={g.shells} rolling={g.rolling} value={g.rolling ? null : state.phase === 'move' ? state.throwValue : g.news?.kind === 'no_move' ? g.news.value : null} />
            <div className="min-h-[2.5rem] text-center text-xs leading-snug text-amber-100/75">
              {g.news && g.news.kind !== 'capture' && !g.rolling && <NewsLine news={g.news} name={name} />}
            </div>
            <button
              type="button"
              disabled={!g.canThrow}
              onClick={g.throwShells}
              className="brass-btn flex w-full items-center justify-center gap-2 py-2.5 disabled:opacity-40"
            >
              <Dices className="h-5 w-5" /> Throw shells
            </button>
          </section>

          <section className="panel space-y-2 rounded-2xl p-4">
            {state.seats.map((seat) => {
              const home = state.pawns[seat].filter((p) => p === HOME).length;
              const waiting = state.pawns[seat].filter((p) => p === OFF).length;
              const turn = state.turn === seat && state.winner === null;
              return (
                <div key={seat} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${turn ? 'bg-amber-200/10 ring-1 ring-amber-200/50' : ''}`}>
                  <span className="h-5 w-5 shrink-0 rounded-full" style={{ background: SEAT_COLOURS[seat].fill, boxShadow: `inset 0 -2px 3px ${SEAT_COLOURS[seat].rim}` }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-amber-50">{name(seat)}</p>
                    <p className="text-[11px] text-amber-100/60">
                      {home}/{PAWNS} home · {waiting} waiting
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      state.hasCaptured[seat] ? 'bg-emerald-200 text-wood-900' : 'bg-sky-200/20 text-sky-100'
                    }`}
                    title={state.hasCaptured[seat] ? 'Has captured: may enter the inner ring' : 'Must capture before entering the inner ring'}
                  >
                    {state.hasCaptured[seat] ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {state.hasCaptured[seat] ? 'gate open' : 'gate shut'}
                  </span>
                </div>
              );
            })}
          </section>

          <div className="w-full">
            <Segmented value={settings.speed} options={['slow', 'normal', 'fast'] as const} onChange={(speed) => settings.set({ speed })} />
          </div>
        </div>
      </div>

      <ChowkaExplainer news={g.lastCapture} name={name} />

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
                <span className="mx-auto block h-12 w-12 rounded-full" style={{ background: SEAT_COLOURS[state.winner].fill, boxShadow: `inset 0 -4px 6px ${SEAT_COLOURS[state.winner].rim}` }} />
              )}
              <h3 className="font-display text-2xl text-amber-50">
                {state.winner === 'draw' ? 'The game is drawn' : you(state.winner) ? 'You win!' : `${name(state.winner)} wins`}
              </h3>
              <p className="text-sm text-amber-100/70">
                {state.winner === 'draw'
                  ? 'Every pawn left is parked at a gate that can’t open, so no one can move again.'
                  : 'All four pawns reached the centre first.'}
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

/** Wording for every kind of news, shared by the card and the one-line note. */
function describe(news: ChowkaNews, name: (s: Seat) => string) {
  const mover = name(news.mover);
  const you = mover === 'You';
  if (news.kind === 'capture') {
    const n = news.captured.length;
    return {
      title: 'Captured!',
      stat: `${n} pawn${n > 1 ? 's' : ''} sent back`,
      why: [
        `${you ? 'Your' : `${mover}’s`} pawn landed on a square holding ${news.captured.map((c) => name(c.seat)).join(' & ')}’s pawn`,
        'It is a plain square, not a crossed safe one',
      ],
      result: `So the pawn${n > 1 ? 's go' : ' goes'} back to start and must re-enter with a 4 or 8 – and ${you ? 'you throw' : `${mover} throws`} again.`,
      note: news.gateOpened
        ? `That was ${you ? 'your' : 'their'} first capture: the gate to the inner ring is now OPEN.`
        : 'Crossed squares (the four starts and the centre) are safe – no capturing there.',
    };
  }
  if (news.kind === 'bonus') {
    return {
      title: news.value === 8 ? 'Ashta!' : 'Chamma!',
      stat: `${news.value} – throw again`,
      why: [news.value === 8 ? 'All four shells landed mouth-down' : 'All four shells landed mouth-up'],
      result: `${you ? 'You get' : `${mover} gets`} another throw.`,
      note: 'A 4 or an 8 is also the only throw that can bring a new pawn onto the board.',
    };
  }
  const bonus = news.value === 4 || news.value === 8;
  return {
    title: 'No move',
    stat: `threw ${news.value}`,
    why: news.gate
      ? ['The only pawns that could move would cross into the inner ring', `${you ? 'You haven’t' : `${mover} hasn’t`} captured yet, so the gate is shut`]
      : [bonus ? 'No pawn could use it' : 'Waiting pawns need a 4 or 8 to enter, and no pawn on the board could move that far'],
    result: `${you ? 'You' : mover} threw ${news.value} but nothing could move.${bonus ? ' The bonus throw still stands.' : ''}`,
    note: 'The centre needs an exact throw, too.',
  };
}

/** One-line note under the shells for bonus throws and lost turns. */
function NewsLine({ news, name }: { news: ChowkaNews; name: (s: Seat) => string }) {
  const d = describe(news, name);
  return (
    <motion.p key={JSON.stringify(news)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <span className="font-bold text-amber-200">{d.title}</span> {d.result}
      {news.kind === 'no_move' && news.gate && <span className="block text-sky-100/80">The gate is shut until a capture.</span>}
    </motion.p>
  );
}

/** Plain-language card for the latest capture (stays until the next one). */
function ChowkaExplainer({ news, name }: { news: ChowkaNews | null; name: (s: Seat) => string }) {
  if (!news) {
    return (
      <p className="flex min-h-[5.5rem] items-center justify-center px-4 text-center text-xs text-amber-100/40">
        Capture: land on an opponent’s pawn on a plain square and it goes back to start. The crossed squares are safe.
        You must capture once before your pawns may go into the inner ring.
      </p>
    );
  }
  const { title, stat, why, result, note } = describe(news, name);
  return (
    <motion.section
      key={JSON.stringify(news)}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-300/15 via-wood-900/90 to-wood-950/90 p-4 shadow-[0_0_30px_-6px_rgba(252,211,77,0.55)]"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Sparkles className="h-5 w-5 text-amber-300" aria-hidden />
        <h3 className="font-display text-2xl text-amber-200">{title}</h3>
        <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-wood-950">{stat}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {why.map((w) => (
          <li key={w} className="flex items-start gap-2 text-sm text-amber-50">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
            {w}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-semibold text-amber-200">→ {result}</p>
      <p className="mt-1 text-xs text-amber-100/55">{note}</p>
    </motion.section>
  );
}
