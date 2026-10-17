// About / How to play content for Chowka Bara, and its animated lessons. As with the
// other games, each lesson is played by the real engine with fixed throws, and
// tests/chowka.test.ts checks it ends the way its text says.

import {
  applyChowkaMove,
  applyThrow,
  cellOf,
  type ChowkaMove,
  type ChowkaState,
  createChowkaState,
  HOME,
  legalChowkaMoves,
  OFF,
  type Seat,
} from '@/engine/chowka';
import type { GameGuide } from './guides';

export type ChowkaStep = { throw: number } | { move: number };

export interface ChowkaLesson {
  title: string;
  summary: string;
  /** Your pawns (seat 0) and the opponent's (seat 2), as path positions; OFF = waiting. */
  you: number[];
  them: number[];
  youCaptured?: boolean;
  steps: ChowkaStep[];
  /** Caption after each step (falls back to a generic one). */
  notes: string[];
  expect: { you: number[]; them: number[]; youCaptured: boolean };
}

export type ChowkaGuide = Omit<GameGuide, 'lessons'> & { lessons: ChowkaLesson[]; facts: { k: string; v: string }[] };

const W = OFF;

export const CHOWKA_GUIDE: ChowkaGuide = {
  tagline: 'The cowrie-shell race to the centre',
  facts: [
    { k: 'Board', v: '5 × 5 squares' },
    { k: 'Players', v: '2 to 4 · 4 pawns each' },
    { k: 'Dice', v: '4 cowrie shells' },
    { k: 'Throws', v: '1, 2, 3, 4 or 8' },
  ],
  about: [
    {
      heading: 'The game',
      body:
        'Chowka Bara – also called Ashta Chamma, Chowka Bhara and Pagade in different parts of India – is one of the ' +
        'oldest Indian race games, a cousin of Pachisi. A square of 5 × 5 is chalked or carved on the floor, and ' +
        'instead of dice the players throw four cowrie shells.',
    },
    {
      heading: 'What makes it special',
      body:
        'The shells decide everything: count how many land mouth-up. All four up is chamma (4); all four down is ' +
        'ashta (8) – both rare, both earn another throw, and only they can bring a new pawn onto the board. The ' +
        'race has a twist: no pawn may go into the inner ring until its owner has knocked an opponent back home.',
    },
    {
      heading: 'Goal',
      body:
        'Bring all four of your pawns round the outer ring, through the inner ring, and into the centre first. Rules ' +
        'vary from house to house; this app plays the Classic rules described here.',
    },
  ],
  keyRule: {
    title: 'How capturing works – and the gate',
    intro: 'Capturing sends an opponent back to start – and you must capture once before your pawns may go inside.',
    conditions: ['Your pawn ends its move on a square holding an opponent’s pawn', 'That square is a plain one, not a crossed safe square'],
    result: 'The opponent’s pawn goes back to start and must re-enter with a 4 or 8. You throw again – and your gate to the inner ring opens.',
    safe: [
      'Crossed squares – the four start squares and the centre – are safe: pawns share them, no capture.',
      'Passing over a pawn does nothing; only the square you stop on counts.',
      'Until you have captured once, none of your pawns may enter the inner ring.',
    ],
    lessonTitle: 'Capture',
    ruleLines: [5, 6],
  },
  rules: [
    'Each player has four pawns, waiting beside the board by their own crossed start square.',
    'Throw the four cowries and count the mouths facing up: 1, 2 or 3 move that many squares. All four up (chamma) is 4; all four down (ashta) is 8.',
    'A 4 or an 8 earns another throw – and only a 4 or 8 can bring a waiting pawn onto your start square.',
    'Pawns go anticlockwise round the outer ring, then clockwise round the inner ring, and finish in the centre.',
    'Use each throw to move one pawn. If no pawn can use it, the turn passes.',
    'Landing on an opponent’s pawn on a plain square captures it: it goes back to start, and you throw again. Crossed squares are safe.',
    'Your pawns may enter the inner ring only after you have captured at least once.',
    'A pawn must reach the centre with an exact throw. The first player with all four pawns home wins.',
  ],
  lessons: [
    {
      title: 'Coming on',
      summary: 'Waiting pawns come onto your start square only with a 4 or 8 – which also earns another throw.',
      you: [W, W, W, W],
      them: [W, W, W, W],
      steps: [{ throw: 4 }, { move: 0 }, { throw: 2 }, { move: 0 }],
      notes: [
        'All four mouths up: CHAMMA, worth 4 – the throw that lets a pawn come on',
        'A pawn enters on your crossed start square',
        'Chamma earned another throw: two mouths up, move 2',
        'Round the outer ring, anticlockwise',
      ],
      expect: { you: [2, W, W, W], them: [W, W, W, W], youCaptured: false },
    },
    {
      title: 'Capture',
      summary: 'Land on an opponent on a plain square and send them back to start.',
      you: [3, W, W, W],
      them: [14, W, W, W],
      steps: [{ throw: 3 }, { move: 0 }],
      notes: ['Three mouths up: move 3', 'CAPTURED! The opponent goes back to start – you throw again, and your gate opens'],
      expect: { you: [6, W, W, W], them: [W, W, W, W], youCaptured: true },
    },
    {
      title: 'Safe squares',
      summary: 'The crossed squares are safe: pawns of different players can share them.',
      you: [5, W, W, W],
      them: [0, W, W, W],
      steps: [{ throw: 3 }, { move: 0 }],
      notes: ['Move 3 – onto the opponent’s crossed start square', 'Crossed square: SAFE. Both pawns stay; no capture'],
      expect: { you: [8, W, W, W], them: [0, W, W, W], youCaptured: false },
    },
    {
      title: 'The gate',
      summary: 'No capture yet? Then no pawn of yours may go into the inner ring.',
      you: [14, 2, W, W],
      them: [W, W, W, W],
      steps: [{ throw: 3 }, { move: 1 }],
      notes: [
        'A 3 would take the front pawn inside – but you haven’t captured, so the GATE is shut',
        'So the only legal move is with the other pawn',
      ],
      expect: { you: [14, 5, W, W], them: [W, W, W, W], youCaptured: false },
    },
    {
      title: 'Inside',
      summary: 'With your gate open, pawns turn in after the outer ring and go round the inner ring clockwise.',
      you: [14, W, W, W],
      them: [W, W, W, W],
      youCaptured: true,
      steps: [{ throw: 4 }, { move: 0 }],
      notes: ['Chamma: 4 – and another throw to come', 'Through the gate and clockwise round the inner ring'],
      expect: { you: [18, W, W, W], them: [W, W, W, W], youCaptured: true },
    },
    {
      title: 'Home',
      summary: 'The centre needs an exact throw. Get all four pawns there first to win.',
      you: [21, 19, W, W],
      them: [W, W, W, W],
      youCaptured: true,
      steps: [{ throw: 3 }, { move: 0 }],
      notes: ['Exactly 3 squares from the centre – a 3 is just right', 'HOME. Bring all four in to win'],
      expect: { you: [HOME, 19, W, W], them: [W, W, W, W], youCaptured: true },
    },
  ],
};

export function chowkaLessonStart(l: ChowkaLesson): ChowkaState {
  const s = createChowkaState(2);
  const pawns = s.pawns.map((p) => p.slice());
  pawns[0] = l.you.slice();
  pawns[2] = l.them.slice();
  const hasCaptured = s.hasCaptured.slice();
  hasCaptured[0] = !!l.youCaptured;
  return { ...s, pawns, hasCaptured, turn: 0 };
}

/** Shell faces that score a given throw (for drawing). */
export function facesFor(value: number): boolean[] {
  if (value === 8) return [false, false, false, false];
  return [0, 1, 2, 3].map((k) => k < value);
}

export interface ChowkaFrame {
  pawns: number[][];
  caption: string;
  shells: boolean[] | null;
  value: number | null;
  /** Move about to be made (its pawn glows). */
  moves: ChowkaMove[];
  reveal: { cell: number; captured: { seat: Seat; pawn: number }[] } | null;
  labels: Record<number, string>;
  emphasis: boolean;
  hasCaptured: boolean;
}

/** Frames: a throw frame, then for a move a prompt frame, one frame per square walked, and a result frame. */
export function buildChowkaDemo(l: ChowkaLesson): { frames: ChowkaFrame[]; final: ChowkaState } {
  let s = chowkaLessonStart(l);
  const frames: ChowkaFrame[] = [];
  let shells: boolean[] | null = null;
  let value: number | null = null;
  const base = () => ({ pawns: s.pawns.map((p) => p.slice()), shells, value, moves: [], reveal: null, labels: {}, emphasis: false, hasCaptured: s.hasCaptured[0] });
  frames.push({ ...base(), caption: l.summary });
  l.steps.forEach((step, k) => {
    const note = l.notes[k] ?? '';
    if ('throw' in step) {
      value = step.throw;
      shells = facesFor(step.throw);
      s = applyThrow(s, step.throw);
      frames.push({ ...base(), caption: note, emphasis: step.throw === 4 || step.throw === 8 });
      return;
    }
    const pos = s.pawns[0][step.move];
    const m = legalChowkaMoves(s).find((x) => x.from === pos);
    if (!m) throw new Error(`Lesson "${l.title}": pawn ${step.move} cannot move at step ${k}`);
    const target = cellOf(0, Math.min(m.to, HOME - 1));
    frames.push({ ...base(), caption: 'Tap the glowing pawn to move it', moves: [{ ...m, pawn: step.move }], labels: m.to === HOME ? {} : { [target]: m.captures.length ? 'capture' : 'here' } });
    const walk = s.pawns.map((p) => p.slice());
    for (let p = m.enter ? 0 : m.from + 1; p <= m.to; p++) {
      walk[0][step.move] = p;
      frames.push({ ...base(), pawns: walk.map((r) => r.slice()), caption: note && p === m.to && !m.captures.length ? note : 'Step…' });
    }
    if (m.captures.length) {
      frames.push({ ...base(), pawns: walk.map((r) => r.slice()), caption: note, reveal: { cell: cellOf(0, m.to), captured: m.captures }, emphasis: true });
    }
    s = applyChowkaMove(s, { ...m, pawn: step.move });
    frames.push({ ...base(), caption: note, emphasis: m.captures.length > 0 || m.to === HOME });
  });
  return { frames, final: s };
}
