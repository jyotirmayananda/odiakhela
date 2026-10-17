// "About" and "How to play" content for each game, plus the animated lessons.
// Every lesson is played by the real rules engine from a preset board, so what the
// animation shows is exactly what the game does (tests/guides.test.ts checks that each
// lesson ends the way its text says).

import { applyEvent, createInitialState, simulateMove, startNextRound, viewOf } from '@/engine/rules';
import type { BoardView, GameState, GameVariant, HaltReason, PasuRule, RevealEvent, SowEvent } from '@/engine/types';

export interface GameGuide {
  tagline: string;
  about: { heading: string; body: string }[];
  rules: string[];
  lessons: Lesson[];
  /** The game's capture rule, called out on its own in the guide. */
  keyRule: {
    title: string;
    intro: string;
    conditions: string[];
    result: string;
    safe: string[];
    /** Lesson that animates it. */
    lessonTitle: string;
    /** Indexes into `rules` to highlight as this rule. */
    ruleLines: number[];
  };
}

interface MoveLesson {
  kind: 'move';
  title: string;
  summary: string;
  /** Counters per pit, index 0 = your leftmost pit, counterclockwise. */
  pits: number[];
  /** The pit you play (always on your side, the bottom row). */
  play: number;
  pasu?: PasuRule;
  /** What the move must do – asserted by tests so the text never drifts from the rules. */
  expect: { captured: number; halt: HaltReason };
}

interface RefillLesson {
  kind: 'refill';
  title: string;
  summary: string;
  stores: [number, number];
}

export type Lesson = MoveLesson | RefillLesson;

export interface DemoFrame {
  view: BoardView;
  event: SowEvent | null;
  caption: string;
  deadPits?: boolean[];
  /** Capture being explained in this frame (from its reveal step to the end of the move). */
  reveal?: RevealEvent;
}

export interface Demo {
  state: GameState;
  frames: DemoFrame[];
  /** Pit to highlight before the move starts. */
  playPit: number | null;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const NO_FLOOR = 'Rules vary from village to village; this app plays the version described here.';

export const GUIDES: Record<GameVariant, GameGuide> = {
  kasadi: {
    tagline: 'Relay-sowing mancala from Odisha',
    about: [
      {
        heading: 'The game',
        body:
          'Kasadi – also called Kasa Kaudi or Sita-Khela – is Odisha’s member of the South Asian family of two-row ' +
          'mancala games, a cousin of Pallanguzhi in Tamil Nadu and Ali Guli Mane in Karnataka. It is played on a ' +
          'wooden board of two rows of seven pits, with cowrie shells (kaudi) or tamarind seeds as counters.',
      },
      {
        heading: 'What makes it special',
        body:
          'Relay sowing: when your hand runs out, you lift the next pit and keep going, so one turn can chain around ' +
          'the board several times. And the match is fought over many rounds – a player who ends a round short of ' +
          'counters loses pits, until one side cannot fill a single pit.',
      },
      {
        heading: 'Goal',
        body:
          'Capture more counters than your opponent each round, and win the match by leaving them unable to refill ' +
          `even one pit. ${NO_FLOOR}`,
      },
    ],
    keyRule: {
      title: 'How capturing works',
      intro:
        'Kasadi has no sweep. Its one capture comes at the end of sowing, when your hand runs out just before an empty pit.',
      conditions: ['Your last counter drops into a pit', 'The very next pit is empty'],
      result:
        'Take everything in the pit just beyond that empty one – on either side of the board – into your store. Your turn ends.',
      safe: [
        'Next pit has counters → no capture yet: lift them and keep sowing (relay).',
        'Next two pits both empty → Kada: the turn ends with nothing taken.',
      ],
      lessonTitle: 'Capture',
      ruleLines: [3],
    },
    rules: [
      'Each player owns the row nearest them – seven pits, five counters each (six if you choose).',
      'On your turn, lift every counter from one of your pits and sow them one by one into the following pits, counterclockwise.',
      'When your hand empties, look at the next pit. If it has counters, lift them and keep sowing – this is the relay.',
      'If the next pit is empty, capture everything in the pit just beyond it. Your turn ends.',
      'If two pits in a row are empty, your turn ends with no capture (Kada).',
      'Optional Pasu rule: any pit that reaches exactly four during sowing is claimed straight away.',
      'When the player to move has no counters, the round ends and the counters left on each row go to that row’s owner.',
      'Each player refills their pits from their winnings. Pits they can’t fill are dead (Andha Ghara) for the next round and are skipped while sowing.',
      'A player who can’t fill even one pit loses the match.',
    ],
    lessons: [
      {
        kind: 'move',
        title: 'Sowing',
        summary: 'Lift every counter from one of your pits and drop one into each following pit, counterclockwise.',
        pits: [0, 3, 0, 0, 0, 0, 0, 2, 1, 3, 1, 2, 1, 2],
        play: 1,
        expect: { captured: 0, halt: 'kada' },
      },
      {
        kind: 'move',
        title: 'Relay',
        summary: 'When your hand empties and the next pit has counters, lift them too and keep sowing.',
        pits: [2, 0, 0, 4, 0, 0, 0, 2, 0, 0, 1, 2, 1, 2],
        play: 0,
        expect: { captured: 0, halt: 'kada' },
      },
      {
        kind: 'move',
        title: 'Capture',
        summary: 'Hand empties before an empty pit? Take everything in the pit just beyond it – even on your opponent’s side.',
        pits: [0, 0, 0, 0, 2, 0, 0, 0, 6, 1, 2, 1, 3, 2],
        play: 4,
        expect: { captured: 6, halt: 'capture' },
      },
      {
        kind: 'move',
        title: 'Pasu (optional)',
        summary: 'With the Pasu rule on, a pit that reaches exactly four is claimed at once by the owner of that row.',
        pits: [0, 2, 3, 0, 0, 0, 0, 2, 1, 3, 1, 2, 1, 2],
        play: 1,
        pasu: 'pit_owner',
        expect: { captured: 4, halt: 'kada' },
      },
      {
        kind: 'refill',
        title: 'New round',
        summary:
          'Both players refill their pits from their winnings, five to a pit. A pit that can’t be filled is dead for the round.',
        stores: [38, 27],
      },
    ],
  },
  lamlameta: {
    tagline: 'The sweeping game from Ethiopia',
    about: [
      {
        heading: 'The game',
        body:
          'Lamlameta is a mancala game from Ethiopia, where games of this kind are broadly known as gebeta. It uses a ' +
          'long board of two rows of twelve pits but only two seeds in each – 48 in all – so the board is sparse and ' +
          'every pair counts.',
      },
      {
        heading: 'What makes it special',
        body:
          'The sweep. End your turn in an empty pit on your own side, opposite a pit holding exactly two, and you take ' +
          'that pair and every other pair on your opponent’s side in one stroke. Leaving pairs exposed is dangerous.',
      },
      {
        heading: 'Goal',
        body: `Hold more seeds than your opponent when one player can no longer move. ${NO_FLOOR}`,
      },
    ],
    keyRule: {
      title: 'How the sweep works',
      intro: 'The sweep is Lamlameta’s only capture – and it can strip your opponent’s row in a single move.',
      conditions: [
        'Your last seed lands in an empty pit',
        'That pit is on your own side',
        'The pit directly opposite holds exactly 2 seeds',
      ],
      result:
        'Take that opposite pair – and every other pit on your opponent’s side holding exactly 2. All of them, in one stroke.',
      safe: [
        'Pits holding 1 seed, or 3 or more, are never swept.',
        'Only your opponent’s pairs are taken – but your own pairs are exposed on their turn.',
        'Landing in an empty pit on your opponent’s side just ends your turn.',
      ],
      lessonTitle: 'The sweep',
      ruleLines: [4],
    },
    rules: [
      'Each player owns the row nearest them – twelve pits, two seeds each.',
      'On your turn, lift every seed from one of your pits and sow them one by one, counterclockwise.',
      'If your last seed lands in a pit that already had seeds, lift them all and keep sowing.',
      'If your last seed lands in an empty pit, your turn ends.',
      'The sweep: if that empty pit is on your side and the opposite pit holds exactly two seeds, capture it – and every other pit on your opponent’s side that holds exactly two.',
      'When the player to move has no seeds, the game ends: the seeds left on each row go to that row’s owner, and the higher total wins.',
    ],
    lessons: [
      {
        kind: 'move',
        title: 'Sowing and relay',
        summary: 'Sow one seed per pit. Landing in a pit that already had seeds? Lift them all and keep going.',
        pits: [2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        play: 0,
        expect: { captured: 0, halt: 'empty_landing' },
      },
      {
        kind: 'move',
        title: 'The sweep',
        summary:
          'Last seed in your own empty pit, opposite a pair? Take that pair – and every other pair on your opponent’s side.',
        pits: [2, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 1, 1],
        play: 5,
        expect: { captured: 6, halt: 'capture' },
      },
      {
        kind: 'move',
        title: 'No pair, no sweep',
        summary: 'If the opposite pit doesn’t hold exactly two, landing in an empty pit simply ends your turn.',
        pits: [2, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 2, 1, 3, 1, 3, 1, 1, 2, 1, 1, 1],
        play: 5,
        expect: { captured: 0, halt: 'empty_landing' },
      },
    ],
  },
  kalah: {
    tagline: 'The classic mancala with stores and free turns',
    about: [
      {
        heading: 'The game',
        body:
          'Kalah is the mancala most people outside Africa and Asia meet first. It was popularised in the United States ' +
          'in the mid-20th century by William Julius Champion Jr., drawing on the traditional sowing games of Africa. ' +
          'The board has six pits a side and a large store – the kalah – at each end.',
      },
      {
        heading: 'What makes it special',
        body:
          'You sow into your own store as you go round, so every seed you pass home is banked. Finish in your store ' +
          'and you move again – chaining free turns is the heart of the game. Finish in an empty pit of your own and ' +
          'you raid the pit facing it.',
      },
      {
        heading: 'Goal',
        body:
          'Have the most seeds in your store when one side of the board runs out. House rules vary (for example, ' +
          'whether landing opposite an empty pit still captures); this app plays the standard version described here.',
      },
    ],
    keyRule: {
      title: 'How capturing works – and free turns',
      intro:
        'Kalah has two landings to aim for: your own store, which earns a free turn, and an empty pit on your own side, which captures.',
      conditions: [
        'Your last seed lands in an empty pit',
        'That pit is on your own side',
        'The pit directly opposite has seeds in it',
      ],
      result: 'Take everything in the opposite pit plus your last seed, and put them all in your store. Your turn ends.',
      safe: [
        'Last seed in your own store → no capture, but a FREE TURN: move again straight away.',
        'Opposite pit empty → no capture; your seed simply stays where it landed.',
        'Last seed on your opponent’s side → nothing happens; your turn ends.',
      ],
      lessonTitle: 'Capture',
      ruleLines: [3, 4],
    },
    rules: [
      'Each player owns the six pits nearest them and the store on their right. Four seeds go in each pit (3–6 if you choose).',
      'On your turn, lift every seed from one of your pits and sow them one by one, counterclockwise.',
      'Sow into your own store as you pass it, but skip your opponent’s store.',
      'Free turn: if your last seed lands in your own store, move again.',
      'Capture: if your last seed lands in an empty pit on your side and the pit opposite has seeds, take them and your last seed into your store.',
      'The game ends as soon as either row is empty. Each player puts the seeds left on their own row into their store; the bigger store wins.',
    ],
    lessons: [
      {
        kind: 'move',
        title: 'Sowing past your store',
        summary: 'Sow one seed per pit, counterclockwise – and drop one into your own store as you pass it.',
        pits: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        play: 3,
        expect: { captured: 1, halt: 'sown' },
      },
      {
        kind: 'move',
        title: 'Free turn',
        summary: 'Count your seeds: if the last one lands in your own store, you move again.',
        pits: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        play: 2,
        expect: { captured: 1, halt: 'extra_turn' },
      },
      {
        kind: 'move',
        title: 'Capture',
        summary: 'Last seed in your own empty pit? Take it and everything in the pit opposite.',
        pits: [1, 0, 3, 2, 0, 2, 3, 2, 1, 4, 5, 2],
        play: 0,
        expect: { captured: 6, halt: 'capture' },
      },
      {
        kind: 'move',
        title: 'Empty opposite',
        summary: 'If the pit opposite is empty there is nothing to capture – your seed just stays put.',
        pits: [1, 0, 3, 2, 0, 2, 3, 2, 1, 4, 0, 2],
        play: 0,
        expect: { captured: 0, halt: 'sown' },
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Demo builder
// ---------------------------------------------------------------------------

export const DEMO_NAMES: [string, string] = ['You', 'Opponent'];

interface CaptionContext {
  variant: GameVariant;
  /** How many sweep / opposite captures came before this event in the move. */
  sweepsSoFar: number;
  capturedSoFar: number;
}

function captionFor(e: SowEvent, view: BoardView, ctx: CaptionContext): string {
  const unit = ctx.variant === 'kasadi' ? 'counter' : 'seed';
  switch (e.type) {
    case 'pickup':
      if (!e.relay) return e.count === 1 ? `Lift the single ${unit} from your pit` : `Lift all ${e.count} ${unit}s from your pit`;
      return ctx.variant === 'lamlameta'
        ? `Landed on an occupied pit – lift all ${e.count} and keep sowing`
        : `Relay – the next pit has ${e.count}: lift them and keep sowing`;
    case 'drop':
      return view.hand > 0 ? `Sow one ${unit}… ${view.hand} left in hand` : `Sow the last ${unit}`;
    case 'store_drop':
      return view.hand > 0 ? `One into your store as you pass it… ${view.hand} left` : 'The last seed drops into your store';
    case 'reveal':
      if (e.rule === 'sweep') {
        return e.pairs.length === 1
          ? 'Landed in your own empty pit, and the pit opposite holds exactly 2 → SWEEP that pair'
          : `Landed in your own empty pit, opposite a pair → SWEEP: all ${e.pairs.length} pairs on their side are yours`;
      }
      if (e.rule === 'opposite') {
        return `Last seed in your own empty pit, and the pit opposite has ${e.count - 1} → CAPTURE all ${e.count}`;
      }
      if (e.rule === 'extra_turn') return 'Last seed landed in your store → FREE TURN: you move again';
      return `Hand empty and the next pit is empty → CAPTURE the ${e.count} just beyond it`;
    case 'capture':
      if (e.reason === 'pasu') return `Pasu! This pit reached four – ${DEMO_NAMES[e.player]} claim${e.player === 0 ? '' : 's'} it`;
      if (e.reason === 'sweep') {
        return ctx.sweepsSoFar === 0
          ? 'Sweep! Take the pair in the opposite pit…'
          : `…and the pair here too (${ctx.sweepsSoFar + 1} pairs so far)`;
      }
      if (e.reason === 'empty_gap') return `Empty pit ahead – capture the ${e.count} beyond it`;
      if (e.reason === 'opposite') {
        return ctx.sweepsSoFar === 0 ? `Take the ${e.count} from the opposite pit…` : '…and your last seed goes into the store with them';
      }
      return `Round over – ${e.count} go to their row’s owner`;
    case 'halt':
      if (e.reason === 'kada') return 'Two empty pits ahead – Kada: the turn ends, no capture';
      if (e.reason === 'empty_landing') return 'Last seed fell into an empty pit with no pair opposite – the turn ends';
      if (e.reason === 'capture') return `Turn over – ${ctx.capturedSoFar} ${unit}s captured`;
      if (e.reason === 'extra_turn') return 'Your turn again – choose another pit';
      if (e.reason === 'sown') return 'Last seed on an ordinary pit – the turn ends, nothing captured';
      return 'Turn over';
  }
}

export function buildDemo(variant: GameVariant, lesson: Lesson): Demo {
  const base = createInitialState({
    variant,
    isVsAI: false,
    aiDifficulty: 'easy',
    pasu: lesson.kind === 'move' ? (lesson.pasu ?? 'off') : 'off',
  });

  if (lesson.kind === 'move') {
    const state: GameState = { ...base, pits: lesson.pits.slice() };
    const { events } = simulateMove(state, lesson.play);
    const frames: DemoFrame[] = [{ view: viewOf(state), event: null, caption: 'Choose one of your pits' }];
    let view = viewOf(state);
    const ctx: CaptionContext = { variant, sweepsSoFar: 0, capturedSoFar: 0 };
    let reveal: RevealEvent | undefined;
    for (const e of events) {
      view = applyEvent(view, e);
      if (e.type === 'reveal') reveal = e;
      if (e.type === 'capture' && e.player === 0) ctx.capturedSoFar += e.count;
      frames.push({ view, event: e, caption: captionFor(e, view, ctx), reveal });
      if (e.type === 'capture' && (e.reason === 'sweep' || e.reason === 'opposite')) ctx.sweepsSoFar++;
    }
    return { state, frames, playPit: lesson.play };
  }

  // Refill: animate each pit filling from its owner's store, then reveal dead pits.
  const n = base.pitsPerSide;
  const state: GameState = {
    ...base,
    pits: new Array(base.boardSize).fill(0),
    stores: lesson.stores,
    turnPhase: 'ROUND_OVER',
  };
  const next = startNextRound(state);
  let view = viewOf(state);
  const frames: DemoFrame[] = [
    { view, event: null, caption: `Round over: ${DEMO_NAMES[0]} won ${lesson.stores[0]}, ${DEMO_NAMES[1]} ${lesson.stores[1]}` },
  ];
  for (const player of [0, 1] as const) {
    for (let k = 0; k < n; k++) {
      const pit = player * n + k;
      if (next.pits[pit] === 0) continue;
      const pits = view.pits.slice();
      const stores: [number, number] = [view.stores[0], view.stores[1]];
      pits[pit] = next.pits[pit];
      stores[player] -= next.pits[pit];
      view = { ...view, pits, stores };
      frames.push({ view, event: null, caption: `${player === 0 ? 'You refill' : 'Opponent refills'} pit ${k + 1}` });
    }
  }
  const dead = next.deadPits.filter(Boolean).length;
  frames.push({
    view,
    event: null,
    deadPits: next.deadPits,
    caption: `${DEMO_NAMES[1]} can’t fill ${dead} pit${dead === 1 ? '' : 's'} – dead for this round, skipped when sowing`,
  });
  return { state, frames, playPit: null };
}
