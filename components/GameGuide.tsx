'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, ScrollText, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameVariant } from '@/engine/types';
import { VARIANTS } from '@/engine/variants';
import { type GameId, gameInfo } from '@/lib/games';
import { buildDemo, DEMO_NAMES, GUIDES, type Lesson } from '@/lib/guides';
import { buildChowkaDemo, CHOWKA_GUIDE, type ChowkaLesson } from '@/lib/chowkaGuide';
import { buildDashDemo, DASH_GUIDE, type DashLesson } from '@/lib/dashGuide';
import { buildHuntDemo, HUNT_GUIDE, type HuntLesson } from '@/lib/huntGuide';
import { useSettings } from '@/store/settings';
import { Board } from './Board';
import { ChowkaBoard, SEAT_COLOURS, Shells } from './ChowkaBoard';
import { DashBoard, Guti } from './DashBoard';
import { HuntBoard, Token } from './HuntBoard';

type Tab = 'about' | 'play';

/** Full-screen guide for one game: an About tab and an animated How to play tab. */
export function GameGuide({ game, initialTab = 'about', onClose }: { game: GameId; initialTab?: Tab; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const cfg = gameInfo(game);
  const guide = guideFor(game);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${cfg.name}: about and how to play`}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel mx-auto my-4 w-[calc(100%-2rem)] max-w-5xl rounded-3xl p-5 sm:my-10 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brass">{cfg.region}</p>
            <h2 className="mt-1 font-display text-3xl text-amber-50 sm:text-4xl">{cfg.name}</h2>
            <p className="text-sm text-amber-100/60">{guide.tagline}</p>
          </div>
          <button type="button" onClick={onClose} className="ghost-btn" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex gap-2 border-b border-brass/20" role="tablist">
          {(
            [
              { id: 'about', label: 'About', icon: ScrollText },
              { id: 'play', label: 'How to play', icon: BookOpen },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-2 px-3 pb-2.5 text-sm font-semibold transition-colors ${
                tab === id ? 'text-amber-50' : 'text-amber-100/50 hover:text-amber-100/80'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
              {tab === id && <motion.span layoutId={`guide-tab-${game}`} className="absolute inset-x-0 -bottom-px h-0.5 bg-brass" />}
            </button>
          ))}
        </div>

        <div className="pt-6">
          {tab === 'about' ? <About game={game} /> : <HowToPlay game={game} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Guide content shared by both kinds of game (mancala and hunt). */
function guideFor(game: GameId) {
  return game === 'bagha_chheli' ? HUNT_GUIDE : game === 'chowka_bara' ? CHOWKA_GUIDE : game === 'dash_guti' ? DASH_GUIDE : GUIDES[game];
}

function factsFor(game: GameId) {
  if (game === 'bagha_chheli') return HUNT_GUIDE.facts;
  if (game === 'chowka_bara') return CHOWKA_GUIDE.facts;
  if (game === 'dash_guti') return DASH_GUIDE.facts;
  const cfg = VARIANTS[game];
  return [
    { k: 'Board', v: `2 × ${cfg.pitsPerSide} pits` },
    { k: 'Counters', v: `${options(cfg.seedsPerPitOptions)} per pit` },
    { k: 'Total', v: `${options(cfg.seedsPerPitOptions.map((s) => s * cfg.pitsPerSide * 2))} counters` },
    { k: 'Match', v: cfg.multiRound ? 'Several rounds' : 'One round' },
  ];
}

function About({ game }: { game: GameId }) {
  const guide = guideFor(game);
  const facts = factsFor(game);
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_15rem]">
      <div className="space-y-5">
        {guide.about.map((s) => (
          <section key={s.heading}>
            <h3 className="font-display text-xl text-amber-50">{s.heading}</h3>
            <p className="mt-1.5 leading-relaxed text-amber-100/75">{s.body}</p>
          </section>
        ))}
      </div>
      <dl className="grid h-max grid-cols-2 gap-3 md:grid-cols-1">
        {facts.map((f) => (
          <div key={f.k} className="rounded-2xl border border-brass/25 bg-wood-950/50 px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/60">{f.k}</dt>
            <dd className="mt-0.5 font-display text-lg text-amber-50">{f.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HowToPlay({ game }: { game: GameId }) {
  const guide = guideFor(game);
  const [index, setIndex] = useState(0);
  const last = guide.lessons.length - 1;
  const keyLesson = guide.lessons.findIndex((l) => l.title === guide.keyRule.lessonTitle);
  const lessonsRef = useRef<HTMLElement>(null);

  return (
    <div className="space-y-8">
      <KeyRule
        game={game}
        onWatch={() => {
          setIndex(keyLesson);
          lessonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      <section ref={lessonsRef} className="scroll-mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {guide.lessons.map((l, i) => (
              <button
                key={l.title}
                type="button"
                onClick={() => setIndex(i)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  i === index
                    ? 'bg-brass text-wood-950'
                    : i === keyLesson
                      ? 'border border-amber-300/70 text-amber-200 hover:text-amber-50'
                      : 'border border-brass/30 text-amber-100/70 hover:text-amber-50'
                }`}
              >
                {i === keyLesson && <Sparkles className="h-3 w-3" aria-label="Key rule" />}
                {i + 1}. {l.title}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button type="button" className="ghost-btn" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Previous lesson">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className="ghost-btn" disabled={index === last} onClick={() => setIndex(index + 1)} aria-label="Next lesson">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {game === 'bagha_chheli' ? (
          <HuntLessonPlayer key={index} lesson={HUNT_GUIDE.lessons[index]} />
        ) : game === 'chowka_bara' ? (
          <ChowkaLessonPlayer key={index} lesson={CHOWKA_GUIDE.lessons[index]} />
        ) : game === 'dash_guti' ? (
          <DashLessonPlayer key={index} lesson={DASH_GUIDE.lessons[index]} />
        ) : (
          <LessonPlayer key={`${game}-${index}`} variant={game} lesson={GUIDES[game].lessons[index]} />
        )}
      </section>

      <section>
        <h3 className="font-display text-xl text-amber-50">The rules</h3>
        <ol className="mt-3 space-y-2.5">
          {guide.rules.map((r, i) => {
            // The capture rule gets the same highlight as the key-rule panel above.
            const key = guide.keyRule.ruleLines.includes(i);
            return (
              <li
                key={r}
                className={`flex gap-3 leading-relaxed ${
                  key ? '-mx-3 rounded-xl border border-amber-300/50 bg-amber-300/10 px-3 py-2 font-medium text-amber-50' : 'text-amber-100/75'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    key ? 'bg-amber-300 text-wood-950' : 'border border-brass/50 text-brass'
                  }`}
                >
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** Pauses (ms) between animation frames. */
const DELAY = { start: 1500, drop: 420, store_drop: 650, pickup: 1100, reveal: 3200, capture: 1500, halt: 1400, refill: 650, end: 3200 };

function LessonPlayer({ variant, lesson }: { variant: GameVariant; lesson: Lesson }) {
  const seedStyle = useSettings((s) => s.seedStyle);
  const demo = useMemo(() => buildDemo(variant, lesson), [variant, lesson]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const current = demo.frames[frame];
  const atEnd = frame === demo.frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    const e = current.event;
    const delay = atEnd
      ? DELAY.end
      : frame === 0
        ? DELAY.start
        : e
          ? DELAY[e.type === 'drop' ? 'drop' : e.type]
          : DELAY.refill;
    const t = setTimeout(() => setFrame(atEnd ? 0 : frame + 1), delay);
    return () => clearTimeout(t);
  }, [playing, frame, atEnd, current]);

  const game = useMemo(
    () => ({ ...demo.state, deadPits: current.deadPits ?? demo.state.deadPits }),
    [demo.state, current.deadPits],
  );
  const glow = frame === 0 && demo.playPit !== null ? [demo.playPit] : [];

  return (
    <div className="rounded-3xl border border-brass/20 bg-wood-950/40 p-3 sm:p-5">
      <h3 className="font-display text-xl text-amber-50">{lesson.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-amber-100/70">{lesson.summary}</p>

      <div className="mt-4">
        <Board
          game={game}
          view={current.view}
          activeEvent={current.event}
          legalMoves={glow}
          onSelect={() => {
            setFrame(1);
            setPlaying(true);
          }}
          previewPath={() => []}
          playerNames={DEMO_NAMES}
          seedStyle={seedStyle}
          showProjection={false}
          rotated={false}
          layoutGroupId={`guide-${variant}`}
          reveal={current.reveal ?? null}
          // Demos are watched, not tapped, so pits may get small enough to keep both stores in view.
          minPit="1.25rem"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <button type="button" className="ghost-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setFrame(0);
              setPlaying(true);
            }}
            aria-label="Replay"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-wood-700/60">
          <motion.div className="h-full bg-brass" animate={{ width: `${(frame / (demo.frames.length - 1)) * 100}%` }} transition={{ duration: 0.2 }} />
        </div>
      </div>

      <div className="mt-3 min-h-[2.5rem]" aria-live="polite">
        {/* Enter-only: captions change every few hundred ms, so exits would overlap. */}
        <motion.p
          key={current.caption}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center text-base ${current.event?.type === 'capture' || current.event?.type === 'reveal' ? 'font-semibold text-amber-300' : 'text-amber-50'}`}
        >
          {current.caption}
        </motion.p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key rule: each game's capture, called out with conditions and a diagram
// ---------------------------------------------------------------------------

function KeyRule({ game, onWatch }: { game: GameId; onWatch: () => void }) {
  const k = guideFor(game).keyRule;
  const all = k.conditions.length === 2 ? 'both' : `all ${k.conditions.length}`;
  return (
    <section className="rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-300/15 via-wood-900/80 to-wood-950/80 p-5 shadow-[0_0_40px_-10px_rgba(252,211,77,0.6)] sm:p-6">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">
        <Sparkles className="h-4 w-4" aria-hidden /> Key rule
      </p>
      <h3 className="mt-1 font-display text-2xl text-amber-100 sm:text-3xl">{k.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-amber-100/75">{k.intro}</p>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">When {all} of these are true</p>
          <ol className="mt-2 space-y-2">
            {k.conditions.map((c, i) => (
              <li key={c} className="flex items-center gap-3 text-amber-50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-300 text-xs font-bold text-wood-950">
                  {i + 1}
                </span>
                {c}
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold leading-relaxed text-wood-950">→ {k.result}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">Not a capture</p>
          <ul className="mt-2 space-y-1.5">
            {k.safe.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-amber-100/75">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </div>
        {game === 'lamlameta' ? <SweepDiagram /> : game === 'kalah' ? <OppositeDiagram /> : game === 'bagha_chheli' ? <JumpDiagram /> : game === 'chowka_bara' ? <RaceCaptureDiagram /> : game === 'dash_guti' ? <CompulsoryJumpDiagram /> : <GapDiagram />}
      </div>

      <button type="button" onClick={onWatch} className="brass-btn mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm">
        <Play className="h-4 w-4" /> Watch it happen
      </button>
    </section>
  );
}

type DiagramKind = 'plain' | 'landing' | 'last' | 'empty' | 'take' | 'safe';

const DIAGRAM_STYLE: Record<DiagramKind, { pit: string; tag?: string; tagClass?: string }> = {
  plain: { pit: '' },
  landing: { pit: 'ring-2 ring-sky-200', tag: 'lands', tagClass: 'bg-sky-200 text-wood-900' },
  last: { pit: 'ring-2 ring-amber-100/70', tag: 'last', tagClass: 'bg-amber-100 text-wood-900' },
  empty: { pit: 'outline-dashed outline-2 outline-offset-2 outline-sky-200/90', tag: 'empty', tagClass: 'bg-sky-200 text-wood-900' },
  take: { pit: 'ring-[3px] ring-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]', tag: 'taken', tagClass: 'bg-amber-300 text-wood-950' },
  safe: { pit: 'opacity-70', tag: 'safe', tagClass: 'bg-wood-700 text-amber-100/80' },
};

function DiagramPit({ n, kind = 'plain', tagBelow = true }: { n: number | string; kind?: DiagramKind; tagBelow?: boolean }) {
  const s = DIAGRAM_STYLE[kind];
  const tag = s.tag && (
    <span className={`whitespace-nowrap rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide ${s.tagClass}`}>{s.tag}</span>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      {!tagBelow && <span className="h-4">{tag}</span>}
      <span className={`pit flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-amber-100 ${s.pit}`}>{n}</span>
      {tagBelow && <span className="h-4">{tag}</span>}
    </div>
  );
}

/** Lamlameta: landing pit ↔ opposite pair, other pairs taken, singles/triples and own pairs safe. */
function SweepDiagram() {
  const top: [number, DiagramKind][] = [[2, 'take'], [1, 'safe'], [2, 'take'], [3, 'safe'], [2, 'take'], [1, 'safe']];
  const bottom: [number | string, DiagramKind][] = [[1, 'plain'], [0, 'plain'], ['•', 'landing'], [0, 'plain'], [2, 'plain'], [0, 'plain']];
  return (
    <figure className="board w-max max-w-full justify-self-center overflow-x-auto rounded-2xl p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/50">Opponent</p>
      <div className="relative">
        {/* link between the landing pit (third column) and the pair opposite it; columns are 3rem */}
        <span
          aria-hidden
          className="absolute z-0 w-1.5 rounded-full bg-gradient-to-t from-sky-200 to-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.8)]"
          style={{ left: 'calc(2 * (3rem + 0.5rem) + 1.5rem - 0.1875rem)', top: '1.25rem', bottom: '1.25rem' }}
        />
        <div className="relative grid grid-cols-[repeat(6,3rem)] gap-2">
          {top.map(([n, k], i) => (
            <DiagramPit key={i} n={n} kind={k} />
          ))}
        </div>
        <div className="relative mt-2 grid grid-cols-[repeat(6,3rem)] gap-2">
          {bottom.map(([n, k], i) => (
            <DiagramPit key={i} n={n} kind={k} tagBelow={false} />
          ))}
        </div>
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/50">You</p>
      <figcaption className="mt-2 max-w-[19rem] text-xs leading-relaxed text-amber-100/60">
        Your last seed lands in the empty pit (•). Opposite is a pair, so all three pairs go. The 1s and the 3 are safe, and so
        is your own pair.
      </figcaption>
    </figure>
  );
}

/** Kasadi: last counter → empty pit → the pit beyond is taken. */
function GapDiagram() {
  return (
    <figure className="board w-max max-w-full justify-self-center rounded-2xl p-3">
      <div className="flex items-start gap-1.5">
        <DiagramPit n={3} kind="last" />
        <ArrowRight className="mt-3 h-4 w-4 text-amber-100/50" aria-hidden />
        <DiagramPit n={0} kind="empty" />
        <ArrowRight className="mt-3 h-4 w-4 text-amber-100/50" aria-hidden />
        <DiagramPit n={6} kind="take" />
        <ArrowRight className="mt-3 h-4 w-4 text-amber-300" aria-hidden />
        <span className="mt-1 rounded-lg border border-amber-300/60 bg-wood-950/60 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
          Your
          <br />
          store
        </span>
      </div>
      <figcaption className="mt-2 max-w-[19rem] text-xs leading-relaxed text-amber-100/60">
        Sowing direction →. Your hand runs out in the first pit; the next is empty, so the 6 beyond it are yours.
      </figcaption>
    </figure>
  );
}

/** "5", "5 or 6", or "3–6" for a run of three or more choices. */
function options(values: number[]): string {
  if (values.length === 1) return String(values[0]);
  if (values.length === 2) return values.join(' or ');
  return `${values[0]}–${values[values.length - 1]}`;
}

/** Kalah: last seed in your own empty pit takes the pit opposite; landing in your store is a free turn. */
function OppositeDiagram() {
  const top: [number, DiagramKind][] = [[2, 'plain'], [5, 'take'], [1, 'plain']];
  const bottom: [number | string, DiagramKind][] = [[3, 'plain'], ['•', 'landing'], [0, 'plain']];
  return (
    <figure className="board w-max max-w-full justify-self-center rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/50">Opponent</p>
          <div className="relative">
            {/* link between the landing pit (middle column) and the pit opposite; columns are 3rem */}
            <span
              aria-hidden
              className="absolute z-0 w-1.5 rounded-full bg-gradient-to-t from-sky-200 to-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.8)]"
              style={{ left: 'calc(1 * (3rem + 0.5rem) + 1.5rem - 0.1875rem)', top: '1.25rem', bottom: '1.25rem' }}
            />
            <div className="relative grid grid-cols-[repeat(3,3rem)] gap-2">
              {top.map(([n, k], i) => (
                <DiagramPit key={i} n={n} kind={k} />
              ))}
            </div>
            <div className="relative mt-2 grid grid-cols-[repeat(3,3rem)] gap-2">
              {bottom.map(([n, k], i) => (
                <DiagramPit key={i} n={n} kind={k} tagBelow={false} />
              ))}
            </div>
          </div>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/50">You →</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="rounded-full bg-sky-200 px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide text-wood-900">
            free turn
          </span>
          <span className="pit flex h-24 w-11 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wide text-amber-200 ring-2 ring-sky-200">
            store
          </span>
        </div>
      </div>
      <figcaption className="mt-2 max-w-[19rem] text-xs leading-relaxed text-amber-100/60">
        Your last seed lands in your empty pit (•): the 5 opposite and that seed – 6 in all – go to your store. Ending in
        your store instead earns a free turn.
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Bagha Chheli: lesson player and key-rule diagram
// ---------------------------------------------------------------------------

const HUNT_DELAY = { prompt: 1700, move: 1500, emphasis: 3200, end: 3400 };

function HuntLessonPlayer({ lesson }: { lesson: HuntLesson }) {
  const demo = useMemo(() => buildHuntDemo(lesson), [lesson]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const current = demo.frames[frame];
  const atEnd = frame === demo.frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    const delay = atEnd ? HUNT_DELAY.end : current.emphasis ? HUNT_DELAY.emphasis : current.target ? HUNT_DELAY.prompt : HUNT_DELAY.move;
    const t = setTimeout(() => setFrame(atEnd ? 0 : frame + 1), delay);
    return () => clearTimeout(t);
  }, [playing, frame, atEnd, current]);

  const targets = useMemo(() => new Map(current.target ? [[current.target.to, current.target]] : []), [current.target]);

  return (
    <div className="rounded-3xl border border-brass/20 bg-wood-950/40 p-3 sm:p-5">
      <h3 className="font-display text-xl text-amber-50">{lesson.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-amber-100/70">{lesson.summary}</p>
      <div className="mx-auto mt-4 max-w-[26rem]">
        <HuntBoard
          pieces={current.pieces}
          targets={targets}
          selected={current.selected}
          capture={current.capture}
          lastMove={current.lastMove}
          trapped={current.trapped}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <button type="button" className="ghost-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setFrame(0);
              setPlaying(true);
            }}
            aria-label="Replay"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-wood-700/60">
          <motion.div className="h-full bg-brass" animate={{ width: `${(frame / (demo.frames.length - 1)) * 100}%` }} transition={{ duration: 0.2 }} />
        </div>
      </div>
      <div className="mt-3 min-h-[2.5rem]" aria-live="polite">
        <motion.p
          key={current.caption + frame}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center text-base ${current.emphasis && !current.target ? 'font-semibold text-amber-300' : 'text-amber-50'}`}
        >
          {current.caption}
        </motion.p>
      </div>
    </div>
  );
}

/** Tiger → goat → empty point: taken. And the same line with the point behind filled: safe. */
function JumpDiagram() {
  const Cell = ({ side, tag, tagClass, ring = '' }: { side?: 'tiger' | 'goat'; tag?: string; tagClass?: string; ring?: string }) => (
    <div className="flex w-14 flex-col items-center gap-1">
      <span className={`pit relative flex h-11 w-11 items-center justify-center rounded-full ${ring}`}>
        {side && (
          <span className="h-9 w-9">
            <Token side={side} />
          </span>
        )}
      </span>
      <span className="h-4">
        {tag && <span className={`whitespace-nowrap rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide ${tagClass}`}>{tag}</span>}
      </span>
    </div>
  );
  const Line = ({ glow = false }: { glow?: boolean }) => (
    <span className={`mt-5 h-1 w-5 rounded-full ${glow ? 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]' : 'bg-wood-950'}`} />
  );
  return (
    <figure className="board w-max max-w-full justify-self-center space-y-3 rounded-2xl p-4">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Capture</p>
        <div className="flex items-start">
          <Cell side="tiger" tag="tiger" tagClass="bg-amber-100 text-wood-900" />
          <Line glow />
          <Cell side="goat" tag="taken" tagClass="bg-rose-300 text-wood-950" ring="ring-[3px] ring-rose-300" />
          <Line glow />
          <Cell tag="lands" tagClass="bg-sky-200 text-wood-900" ring="ring-2 ring-sky-200" />
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/60">Blocked</p>
        <div className="flex items-start">
          <Cell side="tiger" />
          <Line />
          <Cell side="goat" tag="safe" tagClass="bg-wood-700 text-amber-100/80" />
          <Line />
          <Cell side="goat" tag="cover" tagClass="bg-emerald-200 text-wood-900" />
        </div>
      </div>
      <figcaption className="max-w-[17rem] text-xs leading-relaxed text-amber-100/60">
        Along any line: tiger, goat, empty point → the goat is taken. Fill that point and the goat is safe.
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Chowka Bara: lesson player and key-rule diagram
// ---------------------------------------------------------------------------

const RACE_DELAY = { step: 380, beat: 1700, emphasis: 3000, end: 3400 };

function ChowkaLessonPlayer({ lesson }: { lesson: ChowkaLesson }) {
  const demo = useMemo(() => buildChowkaDemo(lesson), [lesson]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const current = demo.frames[frame];
  const atEnd = frame === demo.frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    const walking = current.caption === 'Step…';
    const delay = atEnd ? RACE_DELAY.end : current.emphasis ? RACE_DELAY.emphasis : walking ? RACE_DELAY.step : RACE_DELAY.beat;
    const t = setTimeout(() => setFrame(atEnd ? 0 : frame + 1), delay);
    return () => clearTimeout(t);
  }, [playing, frame, atEnd, current]);

  return (
    <div className="rounded-3xl border border-brass/20 bg-wood-950/40 p-3 sm:p-5">
      <h3 className="font-display text-xl text-amber-50">{lesson.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-amber-100/70">{lesson.summary}</p>
      <div className="mt-4 grid items-center gap-4 md:grid-cols-[1fr_12rem]">
        <div className="mx-auto w-full max-w-[24rem]">
          <ChowkaBoard seats={[0, 2]} pawns={current.pawns} moves={current.moves} turn={0} reveal={current.reveal} labels={current.labels} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Shells shells={current.shells} rolling={false} value={current.value} />
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              current.hasCaptured ? 'bg-emerald-200 text-wood-900' : 'bg-sky-200/20 text-sky-100'
            }`}
          >
            your gate {current.hasCaptured ? 'open' : 'shut'}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <button type="button" className="ghost-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setFrame(0);
              setPlaying(true);
            }}
            aria-label="Replay"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-wood-700/60">
          <motion.div className="h-full bg-brass" animate={{ width: `${(frame / (demo.frames.length - 1)) * 100}%` }} transition={{ duration: 0.2 }} />
        </div>
      </div>
      <div className="mt-3 min-h-[2.5rem]" aria-live="polite">
        <motion.p
          key={current.caption + frame}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center text-base ${current.emphasis ? 'font-semibold text-amber-300' : 'text-amber-50'}`}
        >
          {current.caption}
        </motion.p>
      </div>
    </div>
  );
}

/** Landing on a rival: plain square → captured; crossed square → safe. Plus the gate. */
function RaceCaptureDiagram() {
  const Square = ({ crossed = false, children, tag, tagClass, ring = '' }: { crossed?: boolean; children?: React.ReactNode; tag?: string; tagClass?: string; ring?: string }) => (
    <div className="flex w-14 flex-col items-center gap-1">
      <span className={`relative flex h-12 w-12 items-center justify-center rounded-md border border-wood-950/70 bg-wood-800/40 ${ring}`}>
        {crossed && (
          <svg viewBox="0 0 10 10" className="absolute inset-[12%] h-[76%] w-[76%]" aria-hidden>
            <line x1="0" y1="0" x2="10" y2="10" stroke="#c9a24f" strokeWidth="0.7" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="#c9a24f" strokeWidth="0.7" />
          </svg>
        )}
        <span className="relative flex gap-0.5">{children}</span>
      </span>
      <span className="h-4">{tag && <span className={`whitespace-nowrap rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide ${tagClass}`}>{tag}</span>}</span>
    </div>
  );
  const Pawn = ({ seat }: { seat: 0 | 2 }) => (
    <span
      className="block h-4 w-4 rounded-full"
      style={{ background: `radial-gradient(circle at 35% 30%, #fff8 0%, ${SEAT_COLOURS[seat].fill} 45%, ${SEAT_COLOURS[seat].rim} 100%)` }}
    />
  );
  const Arrow = () => <ArrowRight className="mt-4 h-4 w-4 text-amber-100/50" aria-hidden />;
  return (
    <figure className="board w-max max-w-full justify-self-center space-y-3 rounded-2xl p-4">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Plain square</p>
        <div className="flex items-start gap-1">
          <Square>
            <Pawn seat={0} />
          </Square>
          <Arrow />
          <Square tag="captured" tagClass="bg-rose-300 text-wood-950" ring="ring-[3px] ring-rose-300">
            <Pawn seat={0} />
            <Pawn seat={2} />
          </Square>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/60">Crossed square</p>
        <div className="flex items-start gap-1">
          <Square>
            <Pawn seat={0} />
          </Square>
          <Arrow />
          <Square crossed tag="safe" tagClass="bg-emerald-200 text-wood-900">
            <Pawn seat={0} />
            <Pawn seat={2} />
          </Square>
        </div>
      </div>
      <figcaption className="max-w-[16rem] text-xs leading-relaxed text-amber-100/60">
        Stop on a rival on a plain square and it goes back to start. Your first capture also unlocks the inner ring.
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Dash-guti: lesson player and key-rule diagram
// ---------------------------------------------------------------------------

function DashLessonPlayer({ lesson }: { lesson: DashLesson }) {
  const demo = useMemo(() => buildDashDemo(lesson), [lesson]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const current = demo.frames[frame];
  const atEnd = frame === demo.frames.length - 1;

  useEffect(() => {
    if (!playing) return;
    const delay = atEnd ? HUNT_DELAY.end : current.emphasis ? HUNT_DELAY.emphasis : current.target ? HUNT_DELAY.prompt : HUNT_DELAY.move;
    const t = setTimeout(() => setFrame(atEnd ? 0 : frame + 1), delay);
    return () => clearTimeout(t);
  }, [playing, frame, atEnd, current]);

  const targets = useMemo(() => new Map(current.target ? [[current.target.to, current.target]] : []), [current.target]);

  return (
    <div className="rounded-3xl border border-brass/20 bg-wood-950/40 p-3 sm:p-5">
      <h3 className="font-display text-xl text-amber-50">{lesson.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-amber-100/70">{lesson.summary}</p>
      <div className="mx-auto mt-4 max-w-[26rem]">
        <DashBoard pieces={current.pieces} targets={targets} selected={current.selected} jumping={current.jumping} lastMove={current.lastMove} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <button type="button" className="ghost-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setFrame(0);
              setPlaying(true);
            }}
            aria-label="Replay"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-wood-700/60">
          <motion.div className="h-full bg-brass" animate={{ width: `${(frame / (demo.frames.length - 1)) * 100}%` }} transition={{ duration: 0.2 }} />
        </div>
      </div>
      <div className="mt-3 min-h-[2.5rem]" aria-live="polite">
        <motion.p
          key={current.caption + frame}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center text-base ${current.emphasis ? 'font-semibold text-amber-300' : 'text-amber-50'}`}
        >
          {current.caption}
        </motion.p>
      </div>
    </div>
  );
}

/** Piece → enemy → empty point: must jump. A chain: jump, and jump again. Covered: safe. */
function CompulsoryJumpDiagram() {
  const Cell = ({ side, tag, tagClass, ring = '' }: { side?: 0 | 1; tag?: string; tagClass?: string; ring?: string }) => (
    <div className="flex w-12 flex-col items-center gap-1">
      <span className={`pit relative flex h-10 w-10 items-center justify-center rounded-full ${ring}`}>
        {side !== undefined && (
          <span className="h-8 w-8">
            <Guti side={side} />
          </span>
        )}
      </span>
      <span className="h-4">{tag && <span className={`whitespace-nowrap rounded-full px-1.5 text-[9px] font-extrabold uppercase leading-4 tracking-wide ${tagClass}`}>{tag}</span>}</span>
    </div>
  );
  const Line = ({ glow = false }: { glow?: boolean }) => (
    <span className={`mt-[1.125rem] h-1 w-3 rounded-full ${glow ? 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]' : 'bg-wood-950'}`} />
  );
  return (
    <figure className="board w-max max-w-full justify-self-center space-y-3 rounded-2xl p-4">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Chain: must jump, then jump again</p>
        <div className="flex items-start">
          <Cell side={0} tag="you" tagClass="bg-amber-100 text-wood-900" />
          <Line glow />
          <Cell side={1} tag="taken" tagClass="bg-rose-300 text-wood-950" ring="ring-[3px] ring-rose-300" />
          <Line glow />
          <Cell tag="lands" tagClass="bg-sky-200 text-wood-900" ring="ring-2 ring-sky-200" />
          <Line glow />
          <Cell side={1} tag="taken" tagClass="bg-rose-300 text-wood-950" ring="ring-[3px] ring-rose-300" />
          <Line glow />
          <Cell tag="lands" tagClass="bg-sky-200 text-wood-900" ring="ring-2 ring-sky-200" />
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100/60">Covered</p>
        <div className="flex items-start">
          <Cell side={0} />
          <Line />
          <Cell side={1} tag="safe" tagClass="bg-wood-700 text-amber-100/80" />
          <Line />
          <Cell side={1} tag="cover" tagClass="bg-emerald-200 text-wood-900" />
        </div>
      </div>
      <figcaption className="max-w-[18rem] text-xs leading-relaxed text-amber-100/60">
        Along any line: your piece, an enemy, an empty point → you must jump. Fill the point behind a piece and it can’t be taken.
      </figcaption>
    </figure>
  );
}
