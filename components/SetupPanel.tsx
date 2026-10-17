'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Bot, Check, Play, Users, Wifi, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { seatsFor } from '@/engine/chowka';
import type { Side } from '@/engine/hunt';
import type { AIDifficulty, GameVariant, PasuRule } from '@/engine/types';
import { VARIANTS } from '@/engine/variants';
import { GAME_LIST, gameInfo, type GameId, type GameInfo, type MatchStart, SECTIONS } from '@/lib/games';
import { type PlayMode, useSettings } from '@/store/settings';
import { GameGuide } from './GameGuide';

const PASU_LABEL: Record<PasuRule, string> = { off: 'Off', pit_owner: 'Pit owner', sower: 'Sower' };
const SIDE_LABEL: Record<Side, string> = { goat: 'Goats', tiger: 'Tigers' };

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export function SetupPanel({ onStart }: { onStart: (start: MatchStart) => void }) {
  const s = useSettings();
  const [guide, setGuide] = useState<GameId | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const pick = (id: GameId) => {
    s.set(
      id === 'bagha_chheli' || id === 'chowka_bara' || id === 'dash_guti'
        ? { variant: id }
        : { variant: id, pasu: 'variant', seedsPerPit: VARIANTS[id].seedsPerPit },
    );
    setSetupOpen(true);
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.55 }}
        className="panel mx-auto w-full space-y-8 rounded-3xl p-5 sm:p-8"
      >
        {SECTIONS.map((section, sectionIndex) => (
          <section key={section.id} aria-labelledby={`section-${section.id}`} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + sectionIndex * 0.1 }}
              className="flex flex-wrap items-baseline gap-x-3 border-b border-brass/25 pb-2"
            >
              <h2 id={`section-${section.id}`} className="font-display text-2xl text-amber-50 sm:text-3xl">
                {section.title}
              </h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/60">
                {section.subtitle}
              </span>
            </motion.div>

            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className={
                section.id === 'odia'
                  ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
                  : 'mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:max-w-xl sm:grid-cols-2 lg:max-w-2xl'
              }
            >
              {GAME_LIST.filter((g) => g.section === section.id).map((v) => (
                <GameCard
                  key={v.id}
                  game={v}
                  selected={setupOpen && s.variant === v.id}
                  onSelect={() => pick(v.id)}
                  onGuide={() => setGuide(v.id)}
                />
              ))}
            </motion.div>
          </section>
        ))}
      </motion.section>

      {/* Outside the animated section: a transformed ancestor would trap position: fixed. */}
      <AnimatePresence>
        {setupOpen && (
          <MatchSetupModal
            game={gameInfo(s.variant)}
            onClose={() => setSetupOpen(false)}
            onGuide={() => setGuide(s.variant)}
            onStart={(start) => {
              setSetupOpen(false);
              onStart(start);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{guide && <GameGuide game={guide} onClose={() => setGuide(null)} />}</AnimatePresence>
    </>
  );
}

function MatchSetupModal({
  game,
  onClose,
  onGuide,
  onStart,
}: {
  game: GameInfo;
  onClose: () => void;
  onGuide: () => void;
  onStart: (start: MatchStart) => void;
}) {
  const s = useSettings();
  const isHunt = game.id === 'bagha_chheli';
  const isRace = game.id === 'chowka_bara';
  const isDash = game.id === 'dash_guti';
  const mancalaId = isHunt || isRace || isDash ? null : (game.id as GameVariant);
  const cfg = mancalaId ? VARIANTS[mancalaId] : null;
  const seeds = cfg && (cfg.seedsPerPitOptions.includes(s.seedsPerPit) ? s.seedsPerPit : cfg.seedsPerPit);
  const pasu: PasuRule | null = cfg && (s.pasu === 'variant' ? cfg.pasu : s.pasu);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const start = () => {
    if (game.id === 'bagha_chheli') {
      onStart({ kind: 'hunt', options: { humanSide: s.mode === 'ai' ? s.huntSide : null, aiDifficulty: s.aiDifficulty } });
      return;
    }
    if (game.id === 'dash_guti') {
      onStart({ kind: 'capture', options: { humanSide: s.mode === 'ai' ? s.dashSide : null, aiDifficulty: s.aiDifficulty } });
      return;
    }
    if (game.id === 'chowka_bara') {
      const seats = seatsFor(s.chowkaPlayers);
      onStart({
        kind: 'race',
        options: { players: s.chowkaPlayers, humanSeats: s.mode === 'ai' ? [0] : seats, aiDifficulty: s.aiDifficulty },
      });
      return;
    }
    if (!mancalaId) return;
    onStart({
      kind: 'mancala',
      options: {
        variant: mancalaId,
        seedsPerPit: seeds ?? undefined,
        pasu: pasu ?? undefined,
        isVsAI: s.mode === 'ai',
        aiDifficulty: s.aiDifficulty,
        aiPlayer: 1,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-transparent p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-setup-title"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="panel my-auto w-full max-w-lg overflow-hidden rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-36 w-full sm:h-44">
          <Image src={game.image} alt="" fill sizes="512px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-wood-950 via-wood-950/55 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-brass/40 bg-wood-950/70 text-amber-50 backdrop-blur hover:border-brass"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass">{game.region}</p>
            <h2 id="match-setup-title" className="font-display text-3xl text-amber-50">
              {game.name}
            </h2>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <button type="button" onClick={onGuide} className="about-btn w-full justify-center">
            <BookOpen className="h-3.5 w-3.5" /> About &amp; how to play
          </button>

          <Field label="Opponent">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'ai', label: 'Machine', icon: Bot },
                  { id: 'local', label: 'Pass & play', icon: Users },
                ] as { id: PlayMode; label: string; icon: typeof Bot }[]
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => s.set({ mode: id })}
                  className={`choice flex items-center justify-center gap-2 ${s.mode === id ? 'choice-on' : ''}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
              <button
                type="button"
                disabled
                className="choice flex items-center justify-center gap-2 opacity-40"
                title="Needs the realtime server – not built yet"
              >
                <Wifi className="h-4 w-4" /> Online
              </button>
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            {s.mode === 'ai' && (
              <Field label="Difficulty">
                <Segmented
                  value={s.aiDifficulty}
                  options={['easy', 'medium', 'hard'] as AIDifficulty[]}
                  onChange={(aiDifficulty) => s.set({ aiDifficulty })}
                />
              </Field>
            )}
            {isDash && s.mode === 'ai' && (
              <Field label="You play">
                <Segmented
                  value={s.dashSide}
                  options={[0, 1] as const}
                  format={(v) => (v === 0 ? 'Ivory (first)' : 'Ebony')}
                  onChange={(dashSide) => s.set({ dashSide })}
                />
              </Field>
            )}
            {isRace && (
              <Field label="Players">
                <Segmented
                  value={s.chowkaPlayers}
                  options={[2, 3, 4] as const}
                  onChange={(chowkaPlayers) => s.set({ chowkaPlayers })}
                />
              </Field>
            )}
            {isHunt && s.mode === 'ai' && (
              <Field label="You play">
                <Segmented
                  value={s.huntSide}
                  options={['goat', 'tiger'] as Side[]}
                  format={(v) => SIDE_LABEL[v]}
                  onChange={(huntSide) => s.set({ huntSide })}
                />
              </Field>
            )}
            {cfg && seeds !== null && cfg.seedsPerPitOptions.length > 1 && (
              <Field label="Counters per pit">
                <Segmented value={seeds} options={cfg.seedsPerPitOptions} onChange={(seedsPerPit) => s.set({ seedsPerPit })} />
              </Field>
            )}
            {cfg?.family === 'indian' && pasu && (
              <Field label="Pasu (four) rule">
                <Segmented
                  value={pasu}
                  options={['off', 'pit_owner', 'sower'] as PasuRule[]}
                  format={(p) => PASU_LABEL[p]}
                  onChange={(p) => s.set({ pasu: p })}
                />
              </Field>
            )}
          </div>

          <motion.button
            type="button"
            onClick={start}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="brass-btn flex w-full items-center justify-center gap-2 py-3.5 text-lg"
          >
            <Play className="h-5 w-5" /> Begin match
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GameCard({
  game,
  selected,
  onSelect,
  onGuide,
}: {
  game: GameInfo;
  selected: boolean;
  onSelect: () => void;
  onGuide: () => void;
}) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-2xl border transition-shadow duration-300 ${
        selected
          ? 'border-brass shadow-[0_0_0_1px_rgba(201,162,79,0.55),0_16px_40px_-12px_rgba(201,162,79,0.4)]'
          : 'border-brass/20 hover:border-brass/50'
      }`}
    >
      <button type="button" onClick={onSelect} aria-pressed={selected} className="block w-full text-left">
        <div className="game-cover aspect-[16/10] w-full bg-wood-950 sm:aspect-[4/3] lg:aspect-square">
          <Image
            src={game.image}
            alt={`${game.name} board`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 220px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority={game.id === 'kasadi'}
          />
          <AnimatePresence>
            {selected && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brass text-wood-950 shadow-lg"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="relative space-y-0.5 bg-gradient-to-b from-wood-900/95 to-wood-950/95 px-3 pb-1.5 pt-2.5">
          <span className="block font-display text-lg leading-tight text-amber-50 sm:text-xl">{game.name}</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-brass/80 line-clamp-1">
            {game.region}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-amber-100/60 line-clamp-2 sm:text-xs">
            {game.description}
          </span>
        </div>
      </button>

      <div className="relative px-3 pb-3 pt-1">
        <button type="button" onClick={onGuide} className="about-btn w-full justify-center">
          <BookOpen className="h-3 w-3" /> About &amp; how to play
        </button>
      </div>
    </motion.div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">{label}</h3>
      {children}
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  format = (v) => String(v),
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="flex rounded-xl border border-brass/30 bg-wood-950/60 p-1">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          onClick={() => onChange(o)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-sm capitalize transition-colors ${
            o === value ? 'bg-brass text-wood-950 shadow' : 'text-amber-100/70 hover:text-amber-50'
          }`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}
