// About / How to play content for Bagha Chheli, plus its animated lessons. Like the
// mancala lessons, every step is played by the real engine (applyHuntMove), and
// tests/hunt.test.ts checks each lesson ends the way its text says.

import { applyHuntMove, type HuntMove, type HuntState, legalHuntMoves, type Piece, type Side, trappedTigers } from '@/engine/hunt';
import { type HuntPiece, movePieces, piecesOf } from '@/hooks/useHuntGame';
import type { GameGuide } from './guides';

export interface HuntLesson {
  title: string;
  summary: string;
  /** Five rows of T (tiger), G (goat) and . (empty). */
  board: string;
  turn: Side;
  goatsInHand: number;
  captured?: number;
  moves: HuntMove[];
  /** Caption shown after each move (falls back to a generic one). */
  notes?: string[];
  expect: { captured: number; winner?: Side | null; trapped?: number[] };
}

export type HuntGuide = Omit<GameGuide, 'lessons'> & { lessons: HuntLesson[]; facts: { k: string; v: string }[] };

export const HUNT_GUIDE: HuntGuide = {
  tagline: 'Four tigers against twenty goats',
  facts: [
    { k: 'Board', v: '25 points' },
    { k: 'Pieces', v: '4 tigers · 20 goats' },
    { k: 'Tigers win', v: 'Capture 5 goats' },
    { k: 'Goats win', v: 'Trap all 4 tigers' },
  ],
  about: [
    {
      heading: 'The game',
      body:
        'Bagha Chheli – “tiger and goat” in Odia – is a hunt game played across rural Odisha, a close relative of ' +
        'Bagh-Chal in Nepal and Bagh Bandi in Bengal. The board is a grid of 25 points joined by straight and diagonal ' +
        'lines, often simply scratched onto the ground and played with stones, seeds or shells.',
    },
    {
      heading: 'What makes it special',
      body:
        'The two sides are unequal. Four tigers can capture; twenty goats cannot. The tigers try to break the herd ' +
        'apart and pick off stragglers. The goats must move as a group, covering every gap until the tigers have ' +
        'nowhere left to go.',
    },
    {
      heading: 'Goal',
      body:
        'Tigers: capture five goats. Goats: trap all four tigers. Played well by both sides the game tends to a draw, ' +
        'which this app calls after 200 moves. Rules vary from place to place; this app plays the common four-tiger ' +
        'version described here.',
    },
  ],
  keyRule: {
    title: 'How capturing works – the tiger’s jump',
    intro: 'Only tigers capture, and only by jumping. Goats cannot capture at all – they win by trapping.',
    conditions: ['A goat is right next to the tiger, joined to it by a line', 'The next point straight on, along that same line, is empty'],
    result: 'The tiger jumps over the goat into that empty point, and the goat is taken off the board. One goat per move.',
    safe: [
      'A goat with another piece right behind it – or the edge of the board – cannot be jumped.',
      'Jumps follow the drawn lines only: no diagonal jump where no diagonal is drawn.',
      'Goats win by leaving all four tigers with no move and no jump.',
    ],
    lessonTitle: 'Tiger jump',
    ruleLines: [4, 6],
  },
  rules: [
    'The board is 25 points joined by lines. Pieces move only along the lines, one point at a time.',
    'The four tigers start on the corners. The twenty goats start off the board, and the goats move first.',
    'Goats: while any are still in hand, each turn places one goat on any empty point. Once all 20 are down, each turn moves one goat to a neighbouring empty point.',
    'Tigers: each turn moves one tiger to a neighbouring empty point – or makes a jump.',
    'A tiger captures by jumping over a goat next to it, along a line, into the empty point straight beyond. The goat is removed. Only one jump per move.',
    'Goats never capture.',
    'The tigers win by capturing 5 goats. The goats win by trapping all four tigers, so that none can move or jump.',
    'If neither side has won within 200 moves, the game is drawn.',
  ],
  lessons: [
    {
      title: 'Placing goats',
      summary: 'Goats come onto the board one at a time, anywhere empty. Tigers move between placements.',
      board: `
        T...T
        .....
        .....
        .....
        T...T`,
      turn: 'goat',
      goatsInHand: 20,
      moves: [
        { kind: 'place', to: 12 },
        { kind: 'move', from: 0, to: 6 },
        { kind: 'place', to: 18 },
        { kind: 'move', from: 4, to: 3 },
        { kind: 'place', to: 17 },
      ],
      notes: [
        'A goat placed in the centre',
        'A tiger steps one point along a line, towards the goat',
        'Another goat right behind the first, on the diagonal: now the tiger can’t jump it',
        'Tigers move one point per turn',
        'Goats keep coming until all 20 are on the board – only then can they move',
      ],
      expect: { captured: 0 },
    },
    {
      title: 'Tiger jump',
      summary: 'A goat next to a tiger, with an empty point straight behind it, can be jumped and captured.',
      board: `
        ....T
        .....
        .TG..
        ..G..
        T...T`,
      turn: 'tiger',
      goatsInHand: 12,
      moves: [{ kind: 'jump', from: 11, over: 12, to: 13 }],
      notes: ['JUMP! Over the goat into the empty point – that goat is captured'],
      expect: { captured: 1 },
    },
    {
      title: 'Block the jump',
      summary: 'Goats protect each other by filling the point behind a threatened goat.',
      board: `
        ....T
        .....
        .TG..
        ..G..
        T...T`,
      turn: 'goat',
      goatsInHand: 12,
      moves: [
        { kind: 'place', to: 13 },
        { kind: 'move', from: 11, to: 10 },
      ],
      notes: [
        'A goat fills the point behind the threatened goat – the jump is blocked',
        'No jump anywhere, so the tiger can only step away',
      ],
      expect: { captured: 0 },
    },
    {
      title: 'Trap a tiger',
      summary: 'A tiger with every neighbour filled – and every jump blocked – is trapped.',
      board: `
        TGG..
        G.G..
        G.G..
        .....
        ....T`,
      turn: 'goat',
      goatsInHand: 0,
      moves: [{ kind: 'move', from: 7, to: 6 }],
      notes: ['TRAPPED: the corner tiger has no move and no jump. Trap all four and the goats win'],
      expect: { captured: 0, trapped: [0] },
    },
    {
      title: 'Five and the tigers win',
      summary: 'Every capture counts. The fifth goat taken ends the game in the tigers’ favour.',
      board: `
        ....T
        .....
        .TG..
        ..G..
        T...T`,
      turn: 'tiger',
      goatsInHand: 0,
      captured: 4,
      moves: [{ kind: 'jump', from: 11, over: 12, to: 13 }],
      notes: ['That is the fifth goat captured – the tigers win'],
      expect: { captured: 5, winner: 'tiger' },
    },
  ],
};

function boardFrom(rows: string): Piece[] {
  return rows
    .trim()
    .split('\n')
    .flatMap((r) => r.trim().split(''))
    .map((ch) => (ch === 'T' ? 'T' : ch === 'G' ? 'G' : null));
}

export function lessonStart(l: HuntLesson): HuntState {
  return { board: boardFrom(l.board), turn: l.turn, goatsInHand: l.goatsInHand, captured: l.captured ?? 0, plies: 0, winner: null };
}

export interface HuntFrame {
  pieces: HuntPiece[];
  caption: string;
  /** Point to ring before the move: the piece about to move. */
  selected: number | null;
  /** Shown as a tappable-looking target before the move. */
  target: HuntMove | null;
  capture: Extract<HuntMove, { kind: 'jump' }> | null;
  lastMove: HuntMove | null;
  trapped: number[];
  emphasis: boolean;
}

function prompt(s: HuntState, m: HuntMove): string {
  if (m.kind === 'place') return `Goats: place one on any empty point (${s.goatsInHand} in hand)`;
  if (m.kind === 'jump') return 'A goat sits next to the tiger, and the point straight beyond it is empty…';
  return s.turn === 'goat' ? 'Goats: move one goat a single step along a line' : 'Tigers: move one tiger a single step along a line';
}

/** Frames for the animated lesson: a prompt before each move, then the move itself. */
export function buildHuntDemo(l: HuntLesson): { frames: HuntFrame[]; final: HuntState } {
  let s = lessonStart(l);
  let pieces = piecesOf(s.board);
  let id = 1000;
  const frames: HuntFrame[] = [];
  l.moves.forEach((m, i) => {
    if (!legalHuntMoves(s).length) throw new Error(`Lesson "${l.title}" has no legal move at step ${i}`);
    frames.push({
      pieces,
      caption: prompt(s, m),
      selected: m.kind === 'place' ? null : m.from,
      target: m,
      capture: null,
      lastMove: null,
      trapped: trappedTigers(s.board),
      emphasis: m.kind === 'jump',
    });
    s = applyHuntMove(s, m);
    pieces = movePieces(pieces, m, id++);
    frames.push({
      pieces,
      caption: l.notes?.[i] ?? 'Done',
      selected: null,
      target: null,
      capture: m.kind === 'jump' ? m : null,
      lastMove: m,
      trapped: trappedTigers(s.board),
      emphasis: m.kind === 'jump' || s.winner !== null || trappedTigers(s.board).length > 0,
    });
  });
  return { frames, final: s };
}
