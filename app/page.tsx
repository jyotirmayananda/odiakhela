'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChowkaScreen } from '@/components/ChowkaScreen';
import { DashScreen } from '@/components/DashScreen';
import { GameScreen } from '@/components/GameScreen';
import { HuntScreen } from '@/components/HuntScreen';
import { SeedDefs } from '@/components/Seed';
import { SetupPanel } from '@/components/SetupPanel';
import type { MatchStart } from '@/lib/games';
import { useSettings } from '@/store/settings';

export default function Home() {
  const [match, setMatch] = useState<{ id: number; start: MatchStart } | null>(null);
  useEffect(() => {
    void useSettings.persist.rehydrate();
  }, []);

  const exit = () => setMatch(null);

  return (
    <main className="relative min-h-dvh overflow-x-hidden px-4 py-6 sm:py-10">
      <SeedDefs />
      {match ? (
        match.start.kind === 'hunt' ? (
          <HuntScreen key={match.id} options={match.start.options} onExit={exit} />
        ) : match.start.kind === 'race' ? (
          <ChowkaScreen key={match.id} options={match.start.options} onExit={exit} />
        ) : match.start.kind === 'capture' ? (
          <DashScreen key={match.id} options={match.start.options} onExit={exit} />
        ) : (
          <GameScreen key={match.id} options={match.start.options} onExit={exit} />
        )
      ) : (
        <div className="relative mx-auto max-w-6xl space-y-10">
          <div aria-hidden className="hero-glow pointer-events-none absolute inset-x-0 -top-10 h-72" />

          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="relative text-center"
          >
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: '0.35em' }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brass"
            >
              Heritage indoor games
            </motion.p>

            <h1 className="mt-3 font-display text-5xl leading-none text-amber-50 sm:text-6xl md:text-7xl">
              <span className="relative inline-block">
                Odia Khela
                <span
                  aria-hidden
                  className="brass-shimmer pointer-events-none absolute inset-x-0 bottom-1 h-px opacity-70"
                />
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.55 }}
              className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-amber-100/65 sm:text-base"
            >
              Step into Odisha&apos;s timeless gaming heritage. Master ancient cowrie strategies in Kasadi,
              outsmart predators in Baag-Chhel, capture paths in Dash Guti, and race in Chauka Bara—tradition
              reborn for online play.
            </motion.p>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mt-6 h-px w-24 origin-center bg-gradient-to-r from-transparent via-brass to-transparent"
            />
          </motion.header>

          <SetupPanel onStart={(start) => setMatch({ id: Date.now(), start })} />
        </div>
      )}
    </main>
  );
}
