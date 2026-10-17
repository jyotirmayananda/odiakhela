'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import type { Player, RevealEvent } from '@/engine/types';

/** Plain-language "why" for each capture rule, phrased for the player who made the move. */
export function explainCapture(reveal: RevealEvent, mover: Player, names: [string, string]) {
  const name = names[mover];
  const other = names[mover === 0 ? 1 : 0];
  const you = name === 'You';
  const subject = you ? 'you' : name;
  const poss = you ? 'Your' : `${name}’s`;
  const takes = you ? 'take' : 'takes';
  const own = you ? 'your own' : 'their own';
  const otherPoss = other === 'You' ? 'your' : `${other}’s`;

  if (reveal.rule === 'sweep') {
    const pairs = reveal.pairs.length;
    return {
      title: 'Sweep!',
      stat: `${pairs} pair${pairs === 1 ? '' : 's'} · ${reveal.count} seeds`,
      why: [`${poss} last seed fell into an empty pit on ${own} side`, 'The pit directly opposite held exactly 2 seeds'],
      result:
        pairs === 1
          ? `So ${subject} ${takes} that pair. There were no other pairs on ${otherPoss} side.`
          : `So ${subject} ${takes} that pair – and every other pit on ${otherPoss} side holding exactly 2.`,
      note: 'Pits holding 1 or 3+ seeds are safe from a sweep.',
    };
  }
  if (reveal.rule === 'opposite') {
    return {
      title: 'Capture!',
      stat: `${reveal.count} seeds`,
      why: [`${poss} last seed fell into an empty pit on ${own} side`, 'The pit directly opposite had seeds in it'],
      result: `So ${subject} ${takes} the opposite pit’s ${reveal.count - 1} plus that last seed – ${reveal.count} into the store.`,
      note: 'If the opposite pit had been empty, nothing would be captured and the seed would stay put.',
    };
  }
  if (reveal.rule === 'extra_turn') {
    return {
      title: 'Free turn!',
      stat: you ? 'you go again' : `${name} goes again`,
      why: [`${poss} last seed dropped into ${you ? 'your' : 'their'} own store`],
      result: `So ${subject} ${you ? 'move' : 'moves'} again straight away.`,
      note: 'Count the seeds: a pit holding exactly as many seeds as steps to your store earns a free turn.',
    };
  }
  return {
    title: 'Capture!',
    stat: `${reveal.count} counter${reveal.count === 1 ? '' : 's'}`,
    why: [`${poss} hand ran out`, 'The next pit was empty'],
    result: `So ${subject} ${takes} everything in the pit just beyond the empty one.`,
    note: 'Had that pit been full, sowing would have relayed on; two empty pits would have ended the turn with nothing.',
  };
}

export function CaptureExplainer({
  explanation,
  names,
  rule,
}: {
  explanation: { reveal: RevealEvent; mover: Player } | null;
  names: [string, string];
  /** Which rule this game uses – for the idle hint. */
  rule: 'gap' | 'sweep' | 'opposite';
}) {
  if (!explanation) {
    return (
      <p className="flex min-h-[5.5rem] items-center justify-center px-4 text-center text-xs text-amber-100/40">
        {rule === 'sweep'
          ? 'Sweep: end in your own empty pit opposite a pair (exactly 2) to take every pair on the other side.'
          : rule === 'opposite'
            ? 'Last seed in your store → free turn. Last seed in your own empty pit → capture it and the pit opposite.'
            : 'Capture: when your hand runs out and the next pit is empty, take everything in the pit beyond it.'}
      </p>
    );
  }
  const x = explainCapture(explanation.reveal, explanation.mover, names);
  return (
    <motion.section
      key={`${explanation.reveal.rule}-${JSON.stringify(explanation.reveal)}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      aria-live="polite"
      className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-300/15 via-wood-900/90 to-wood-950/90 p-4 shadow-[0_0_30px_-6px_rgba(252,211,77,0.55)]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Sparkles className="h-5 w-5 text-amber-300" aria-hidden />
        <h3 className="font-display text-2xl text-amber-200">{x.title}</h3>
        <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-wood-950">{x.stat}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {x.why.map((w) => (
          <li key={w} className="flex items-start gap-2 text-sm text-amber-50">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
            {w}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-semibold text-amber-200">→ {x.result}</p>
      <p className="mt-1 text-xs text-amber-100/55">{x.note}</p>
    </motion.section>
  );
}
