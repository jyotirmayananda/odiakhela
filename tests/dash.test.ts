import { describe, expect, it } from 'vitest';
import {
  applyDashMove,
  CENTRE,
  createDashState,
  type DashState,
  JUMPS,
  LEFT_ARM,
  legalDashMoves,
  NEIGHBORS,
  piecesOf,
  POINTS,
  QUIET_LIMIT,
  RIGHT_ARM,
  SEGMENTS,
} from '@/engine/dash';
import { chooseDashMove } from '@/engine/dashAi';
import { buildDashDemo, DASH_GUIDE, dashLessonStart } from '@/lib/dashGuide';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const position = (ivory: number[], ebony: number[], turn: 0 | 1 = 0, quiet = 0): DashState => ({
  ...dashLessonStart({ title: '', summary: '', ivory, ebony, turn, moves: [], notes: [], expect: { captured: [0, 0] } }),
  quiet,
});

describe('board', () => {
  it('has 21 points: two 9-point triangles, the centre and two arms', () => {
    expect(POINTS).toHaveLength(21);
    expect(SEGMENTS).toHaveLength(32);
    expect(NEIGHBORS[CENTRE].sort((a, b) => a - b)).toEqual([1, 2, 3, 10, 11, 12, LEFT_ARM, RIGHT_ARM].sort((a, b) => a - b));
    expect(NEIGHBORS[LEFT_ARM]).toEqual([CENTRE]);
  });

  it('jumps run straight through the centre between the triangles and along the arms', () => {
    expect(JUMPS[11]).toContainEqual({ over: CENTRE, to: 2 }); // vertical
    expect(JUMPS[10]).toContainEqual({ over: CENTRE, to: 3 }); // diagonal
    expect(JUMPS[LEFT_ARM]).toEqual([{ over: CENTRE, to: RIGHT_ARM }]);
  });

  it('starts full except the centre, and the only opening moves step into it', () => {
    const s = createDashState();
    expect(piecesOf(s.board, 0)).toBe(10);
    expect(piecesOf(s.board, 1)).toBe(10);
    expect(s.board[CENTRE]).toBeNull();
    expect(legalDashMoves(s).every((m) => m.kind === 'step' && m.to === CENTRE)).toBe(true);
  });
});

describe('rules', () => {
  it('captures are compulsory: only jumps are offered when one exists', () => {
    const moves = legalDashMoves(position([4, LEFT_ARM], [5, 17]));
    expect(moves).toEqual([{ kind: 'jump', from: 4, over: 5, to: 6 }]);
  });

  it('a piece that can jump again keeps the turn and must continue', () => {
    let s = position([7], [4, CENTRE, 16]);
    s = applyDashMove(s, { kind: 'jump', from: 7, over: 4, to: 1 });
    expect(s.turn).toBe(0);
    expect(s.chainFrom).toBe(1);
    expect(legalDashMoves(s)).toEqual([{ kind: 'jump', from: 1, over: CENTRE, to: 12 }]);
    s = applyDashMove(s, legalDashMoves(s)[0]);
    expect(s.turn).toBe(1);
    expect(s.captured).toEqual([2, 0]);
  });

  it('capturing every piece wins', () => {
    const s = applyDashMove(position([4], [5]), { kind: 'jump', from: 4, over: 5, to: 6 });
    expect(s.winner).toBe(0);
    expect(s.reason).toBe('wipeout');
  });

  it('a side left with no move loses', () => {
    const s = applyDashMove(position([17, 18, 10, 14], [16]), { kind: 'step', from: 14, to: 13 });
    expect(s.winner).toBe(0);
    expect(s.reason).toBe('blocked');
  });

  it(`after ${QUIET_LIMIT} moves without a capture, more pieces wins`, () => {
    const s = position([7, 8, 9], [16, 17], 0, QUIET_LIMIT - 1);
    const next = applyDashMove(s, legalDashMoves(s)[0]);
    expect(next.winner).toBe(0);
    expect(next.reason).toBe('quiet');
  });

  it('a capture resets the quiet-move count', () => {
    const s = applyDashMove(position([4, 19], [5, 17], 0, 30), { kind: 'jump', from: 4, over: 5, to: 6 });
    expect(s.quiet).toBe(0);
  });
});

describe('random games', () => {
  it('always end, and no piece appears from nowhere', () => {
    const rng = mulberry32(8);
    for (let g = 0; g < 400; g++) {
      let s = createDashState();
      while (s.winner === null) {
        const moves = legalDashMoves(s);
        s = applyDashMove(s, moves[Math.floor(rng() * moves.length)]);
        expect(piecesOf(s.board, 0) + s.captured[1]).toBe(10);
        expect(piecesOf(s.board, 1) + s.captured[0]).toBe(10);
      }
      expect(s.plies).toBeLessThan(400);
    }
  });
});

describe('AI', () => {
  it('returns legal moves, including mid-chain', () => {
    const chain = applyDashMove(position([7], [4, CENTRE, 16]), { kind: 'jump', from: 7, over: 4, to: 1 });
    for (const s of [createDashState(), chain]) {
      for (const d of ['easy', 'medium', 'hard'] as const) {
        const m = chooseDashMove(s, d, { timeBudgetMs: 150 });
        expect(legalDashMoves(s).some((l) => JSON.stringify(l) === JSON.stringify(m))).toBe(true);
      }
    }
  });

  it('hard and medium both beat a random player', () => {
    const rng = mulberry32(3);
    for (const d of ['medium', 'hard'] as const) {
      let wins = 0;
      for (let g = 0; g < 8; g++) {
        let s = createDashState();
        const ai = (g % 2) as 0 | 1;
        while (s.winner === null) {
          const moves = legalDashMoves(s);
          s = applyDashMove(s, s.turn === ai ? chooseDashMove(s, d, { timeBudgetMs: 40, rng }) : moves[Math.floor(rng() * moves.length)]);
        }
        if (s.winner === ai) wins++;
      }
      expect(wins).toBeGreaterThanOrEqual(7);
    }
  }, 60_000);
});

describe('How-to-play lessons', () => {
  for (const lesson of DASH_GUIDE.lessons) {
    it(`"${lesson.title}" plays legally and ends as described`, () => {
      const { frames, final } = buildDashDemo(lesson);
      expect(frames).toHaveLength(1 + lesson.moves.length * 2);
      expect(final.captured).toEqual(lesson.expect.captured);
      expect(final.winner).toBe(lesson.expect.winner ?? null);
    });
  }
});
