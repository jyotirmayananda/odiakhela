// About / How to play content for Dash-guti, and its animated lessons. Each lesson is
// played by the real engine (applyDashMove); tests/dash.test.ts checks every one.

import { applyDashMove, type DashMove, type DashState, type Piece, POINTS, type Side } from '@/engine/dash';
import { type DashPiece, dashPiecesOf, moveDashPieces } from '@/hooks/useDashGame';
import type { GameGuide } from './guides';

/*
 * Point numbers used below:
 *            16  17  18          ← Ebony's back rank
 *              13 14 15
 *               10 11 12
 *       19 ─────── 0 ─────── 20  ← side arms through the centre
 *                1  2  3
 *              4   5   6
 *            7   8   9           ← Ivory's back rank
 */
export interface DashLesson {
  title: string;
  summary: string;
  ivory: number[];
  ebony: number[];
  turn: Side;
  moves: DashMove[];
  notes: string[];
  expect: { captured: [number, number]; winner?: Side | 'draw' | null };
}

export type DashGuide = Omit<GameGuide, 'lessons'> & { lessons: DashLesson[]; facts: { k: string; v: string }[] };

const IVORY_START = [1, 2, 3, 4, 5, 6, 7, 8, 9, 19];
const EBONY_START = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20];

export const DASH_GUIDE: DashGuide = {
  tagline: 'Ten pieces a side, and every capture is compulsory',
  facts: [
    { k: 'Board', v: '21 points' },
    { k: 'Pieces', v: '10 each' },
    { k: 'Captures', v: 'Compulsory jumps' },
    { k: 'Family', v: 'Alquerque' },
  ],
  about: [
    {
      heading: 'The game',
      body:
        'Dash-guti – “ten pieces” – is a two-player capture game from India, a relative of the old Arab game ' +
        'alquerque and a cousin of draughts. It is played on a Lau kata kati board, two triangles meeting at a ' +
        'centre point, with a short arm out to each side. It has been recorded in central and northern India, and ' +
        'is known in Bengal as Dosh guti.',
    },
    {
      heading: 'What makes it special',
      body:
        'Every piece starts on the board with only the centre empty, so the very first move walks into the centre ' +
        'and is captured at once. Captures are compulsory and chain together: a piece that can jump again must ' +
        'keep jumping. The game is about luring your opponent into a jump that leaves a bigger chain for you.',
    },
    {
      heading: 'Goal',
      body:
        'Capture all of your opponent’s pieces, or leave them with no move. If captures dry up, the side with ' +
        'more pieces wins – this app counts after 40 moves without a capture. Rules vary; this app follows the ' +
        'version recorded by H. J. R. Murray.',
    },
  ],
  keyRule: {
    title: 'How capturing works – compulsory jumps',
    intro: 'You capture by jumping, exactly as in draughts – but along the board’s lines, and you are never allowed to refuse.',
    conditions: ['An enemy piece is right next to yours, joined by a line', 'The point straight beyond it, on the same line, is empty'],
    result:
      'Jump over it into that point and remove it. If the same piece can jump again, it must – a chain can take several pieces in one turn.',
    safe: [
      'A piece with a friendly piece (or the end of a line) right behind it cannot be jumped.',
      'If any capture is possible, you must capture – no ordinary move is allowed.',
      'Pieces move one step at a time along the lines, in any direction.',
    ],
    lessonTitle: 'Compulsory capture',
    ruleLines: [3, 4],
  },
  rules: [
    'Each side has ten pieces: nine fill its triangle and one sits on a side arm. Only the centre point is empty.',
    'Ivory moves first. Players take turns moving one piece.',
    'A move is one step along a line to a neighbouring empty point, in any direction.',
    'Capture by jumping: an enemy piece next to yours, along a line, with the point straight beyond it empty, can be jumped and removed.',
    'Captures are compulsory. A piece that has just jumped and can jump again must keep going.',
    'Capture every enemy piece, or leave your opponent with no move, to win.',
    'If 40 moves pass with no capture, whoever has more pieces wins; equal numbers is a draw.',
  ],
  lessons: [
    {
      title: 'The opening',
      summary: 'Only the centre is empty, so the first move goes there – and is captured straight away.',
      ivory: IVORY_START,
      ebony: EBONY_START,
      turn: 0,
      moves: [
        { kind: 'step', from: 2, to: 0 },
        { kind: 'jump', from: 11, over: 0, to: 2 },
        { kind: 'jump', from: 5, over: 2, to: 0 },
      ],
      notes: [
        'Ivory steps into the empty centre',
        'Ebony MUST capture: it jumps the centre piece into the gap Ivory left',
        'And Ivory must capture back. One each.',
      ],
      expect: { captured: [1, 1] },
    },
    {
      title: 'Compulsory capture',
      summary: 'If you can capture, you must. No other move is allowed.',
      ivory: [4, 19],
      ebony: [5, 17],
      turn: 0,
      moves: [{ kind: 'jump', from: 4, over: 5, to: 6 }],
      notes: ['A capture is available, so it has to be taken – the arm piece may not just step'],
      expect: { captured: [1, 0] },
    },
    {
      title: 'Chain jump',
      summary: 'After a capture, if the same piece can jump again, it must – taking several in one turn.',
      ivory: [7],
      ebony: [4, 0, 16],
      turn: 0,
      moves: [
        { kind: 'jump', from: 7, over: 4, to: 1 },
        { kind: 'jump', from: 1, over: 0, to: 12 },
      ],
      notes: ['First jump… and another enemy piece is lined up with an empty point behind it', 'So it jumps again: two in one turn'],
      expect: { captured: [2, 0] },
    },
    {
      title: 'Cover the gap',
      summary: 'A piece is safe if the point behind it is filled. Step in to block the jump.',
      ivory: [10, 3],
      ebony: [13, 16],
      turn: 0,
      moves: [
        { kind: 'step', from: 3, to: 0 },
        { kind: 'step', from: 13, to: 14 },
      ],
      notes: ['Ebony threatened to jump into the centre. Ivory fills it first', 'The jump is blocked, so Ebony can only step away'],
      expect: { captured: [0, 0] },
    },
    {
      title: 'Blocked out',
      summary: 'A side with no move at all – no step and no jump – loses.',
      ivory: [17, 18, 10, 14],
      ebony: [16],
      turn: 0,
      moves: [{ kind: 'step', from: 14, to: 13 }],
      notes: ['Ebony’s last piece has no empty neighbour and no jump: Ivory wins'],
      expect: { captured: [0, 0], winner: 0 },
    },
  ],
};

export function dashLessonStart(l: DashLesson): DashState {
  const board: Piece[] = new Array(POINTS.length).fill(null);
  for (const p of l.ivory) board[p] = 0;
  for (const p of l.ebony) board[p] = 1;
  return { board, turn: l.turn, chainFrom: null, captured: [0, 0], plies: 0, quiet: 0, winner: null, reason: null };
}

export interface DashFrame {
  pieces: DashPiece[];
  caption: string;
  selected: number | null;
  target: DashMove | null;
  jumping: Extract<DashMove, { kind: 'jump' }> | null;
  lastMove: DashMove | null;
  emphasis: boolean;
}

export function buildDashDemo(l: DashLesson): { frames: DashFrame[]; final: DashState } {
  let s = dashLessonStart(l);
  let pieces = dashPiecesOf(s.board);
  const frames: DashFrame[] = [{ pieces, caption: l.summary, selected: null, target: null, jumping: null, lastMove: null, emphasis: false }];
  l.moves.forEach((m, i) => {
    frames.push({
      pieces,
      caption: m.kind === 'jump' ? 'An enemy piece next to it, and the point beyond is empty…' : 'Tap a piece, then a glowing point',
      selected: m.from,
      target: m,
      jumping: null,
      lastMove: null,
      emphasis: false,
    });
    s = applyDashMove(s, m);
    pieces = moveDashPieces(pieces, m);
    frames.push({
      pieces,
      caption: l.notes[i] ?? '',
      selected: null,
      target: null,
      jumping: m.kind === 'jump' ? m : null,
      lastMove: m,
      emphasis: m.kind === 'jump' || s.winner !== null,
    });
  });
  return { frames, final: s };
}
