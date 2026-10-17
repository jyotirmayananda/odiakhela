import { describe, expect, it } from 'vitest';
import {
  applyHuntMove,
  createHuntState,
  GOATS,
  type HuntMove,
  type HuntState,
  JUMPS,
  legalHuntMoves,
  LINES,
  MAX_PLIES,
  NEIGHBORS,
  type Piece,
  trappedTigers,
} from '@/engine/hunt';
import { chooseHuntMove } from '@/engine/huntAi';
import { buildHuntDemo, HUNT_GUIDE, lessonStart } from '@/lib/huntGuide';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Board from a 5-line picture: T tiger, G goat, . empty. */
function boardOf(rows: string): Piece[] {
  return rows
    .trim()
    .split('\n')
    .flatMap((r) => r.trim().split(''))
    .map((ch) => (ch === 'T' ? 'T' : ch === 'G' ? 'G' : null));
}

function stateOf(rows: string, patch: Partial<HuntState> = {}): HuntState {
  return { board: boardOf(rows), turn: 'tiger', goatsInHand: 0, captured: 0, plies: 0, winner: null, ...patch };
}

describe('Bagha Chheli board', () => {
  it('has the alquerque lines: 40 straight + 16 diagonal', () => {
    expect(LINES).toHaveLength(56);
    expect(NEIGHBORS[0].sort((a, b) => a - b)).toEqual([1, 5, 6]); // corner: has a diagonal
    expect(NEIGHBORS[1].sort((a, b) => a - b)).toEqual([0, 2, 6]); // odd point: no diagonals
    expect(NEIGHBORS[12]).toHaveLength(8); // centre
  });

  it('starts with tigers on the corners and the goats placing first', () => {
    const s = createHuntState();
    expect(s.turn).toBe('goat');
    expect(legalHuntMoves(s)).toHaveLength(21);
    expect(legalHuntMoves(s).every((m) => m.kind === 'place')).toBe(true);
  });
});

describe('moves and captures', () => {
  it('a tiger captures by jumping a goat into the empty point beyond', () => {
    const s = stateOf(`
      .....
      .....
      ..TG.
      .....
      .....`);
    const jump = legalHuntMoves(s).find((m) => m.kind === 'jump')!;
    expect(jump).toEqual({ kind: 'jump', from: 12, over: 13, to: 14 });
    const next = applyHuntMove(s, jump);
    expect(next.board[13]).toBeNull();
    expect(next.board[14]).toBe('T');
    expect(next.captured).toBe(1);
  });

  it('no jump when the point beyond is occupied or off the board', () => {
    const blocked = stateOf(`
      .....
      .....
      ..TGG
      .....
      .....`);
    expect(legalHuntMoves(blocked).some((m) => m.kind === 'jump')).toBe(false);
    const edge = stateOf(`
      .....
      .....
      ...TG
      .....
      .....`);
    expect(legalHuntMoves(edge).some((m) => m.kind === 'jump')).toBe(false);
  });

  it('diagonal moves and jumps only exist along drawn diagonals', () => {
    // Point 7 (row 2, col 3) has no diagonals: no diagonal step or jump from it.
    const s = stateOf(`
      .....
      ..T..
      ...G.
      .....
      .....`);
    expect(legalHuntMoves(s).some((m) => m.kind === 'jump')).toBe(false);
    expect(JUMPS[6].some((j) => j.over === 12 && j.to === 18)).toBe(true); // point 6 does have one
  });

  it('goats must place while any remain in hand, then move one step', () => {
    const placing = { ...createHuntState(), goatsInHand: 1 };
    expect(legalHuntMoves(placing).every((m) => m.kind === 'place')).toBe(true);
    const moving = stateOf(
      `
      T...T
      .....
      ..G..
      .....
      T...T`,
      { turn: 'goat' },
    );
    expect(legalHuntMoves(moving)).toHaveLength(8);
    expect(legalHuntMoves(moving).every((m) => m.kind === 'move')).toBe(true);
  });

  it('rejects illegal moves', () => {
    expect(() => applyHuntMove(createHuntState(), { kind: 'place', to: 0 })).toThrow();
    expect(() => applyHuntMove(createHuntState(), { kind: 'move', from: 0, to: 1 })).toThrow();
  });
});

describe('winning', () => {
  it('goats win by trapping every tiger', () => {
    // Corner tiger: its neighbours are 1, 5, 6 and its jumps land on 2, 10, 12.
    // Everything is covered except 6 – the goat on 7 steps into it.
    const s = stateOf(
      `
      TGG..
      G.G..
      G.G..
      .....
      .....`,
      { turn: 'goat' },
    );
    expect(trappedTigers(s.board)).toEqual([]);
    const trap: HuntMove = { kind: 'move', from: 7, to: 6 };
    const next = applyHuntMove(s, trap);
    expect(trappedTigers(next.board)).toEqual([0]);
    expect(next.winner).toBe('goat');
  });

  it('tigers win on their fifth capture', () => {
    const s = stateOf(
      `
      .....
      .....
      ..TG.
      .....
      .....`,
      { captured: 4 },
    );
    expect(applyHuntMove(s, { kind: 'jump', from: 12, over: 13, to: 14 }).winner).toBe('tiger');
  });

  it(`is a draw after ${MAX_PLIES} moves`, () => {
    const s = stateOf(
      `
      T...T
      .....
      ..G..
      .....
      T...T`,
      { turn: 'goat', plies: MAX_PLIES - 1 },
    );
    expect(applyHuntMove(s, legalHuntMoves(s)[0]).winner).toBe('draw');
  });
});

describe('random games', () => {
  it('always end, and every goat is placed, on the board or captured', () => {
    const rng = mulberry32(11);
    const results = { tiger: 0, goat: 0, draw: 0 };
    for (let g = 0; g < 300; g++) {
      let s = createHuntState();
      while (!s.winner) {
        const moves = legalHuntMoves(s);
        s = applyHuntMove(s, moves[Math.floor(rng() * moves.length)]);
        const goats = s.board.filter((p) => p === 'G').length;
        expect(goats + s.goatsInHand + s.captured).toBe(GOATS);
        expect(s.board.filter((p) => p === 'T')).toHaveLength(4);
      }
      results[s.winner]++;
    }
    expect(results.tiger + results.goat + results.draw).toBe(300);
  });
});

describe('AI', () => {
  it('returns legal moves for both sides at every level', () => {
    const goatTurn = createHuntState();
    const tigerTurn = applyHuntMove(goatTurn, { kind: 'place', to: 12 });
    for (const s of [goatTurn, tigerTurn]) {
      for (const d of ['easy', 'medium', 'hard'] as const) {
        const m = chooseHuntMove(s, d, { timeBudgetMs: 150 });
        expect(legalHuntMoves(s).some((l) => JSON.stringify(l) === JSON.stringify(m))).toBe(true);
      }
    }
  });

  it('tigers take a free capture', () => {
    const s = stateOf(`
      T...T
      .....
      ..TG.
      .....
      T...T`);
    expect(chooseHuntMove(s, 'medium').kind).toBe('jump');
    expect(chooseHuntMove(s, 'hard', { timeBudgetMs: 300 }).kind).toBe('jump');
  });

  it('hard beats random from both seats', () => {
    const rng = mulberry32(5);
    const play = (aiSide: 'tiger' | 'goat') => {
      let s = createHuntState();
      while (!s.winner) {
        const moves = legalHuntMoves(s);
        const m = s.turn === aiSide ? chooseHuntMove(s, 'hard', { timeBudgetMs: 25, maxDepth: 3, rng }) : moves[Math.floor(rng() * moves.length)];
        s = applyHuntMove(s, m);
      }
      return s.winner;
    };
    let tigerWins = 0;
    let goatWins = 0;
    for (let g = 0; g < 6; g++) {
      if (play('tiger') === 'tiger') tigerWins++;
      if (play('goat') !== 'tiger') goatWins++; // goats aim not to lose
    }
    expect(tigerWins).toBeGreaterThanOrEqual(5);
    expect(goatWins).toBeGreaterThanOrEqual(5);
  }, 120_000);
});

describe('How-to-play lessons', () => {
  for (const lesson of HUNT_GUIDE.lessons) {
    it(`"${lesson.title}" plays legally and ends as described`, () => {
      const { frames, final } = buildHuntDemo(lesson);
      expect(frames).toHaveLength(lesson.moves.length * 2);
      expect(final.captured).toBe(lesson.expect.captured);
      if (lesson.expect.winner !== undefined) expect(final.winner).toBe(lesson.expect.winner);
      else expect(final.winner).toBeNull();
      if (lesson.expect.trapped) expect(trappedTigers(final.board)).toEqual(lesson.expect.trapped);
      // the pieces shown in the last frame match the engine's board
      const shown = frames.at(-1)!.pieces.map((p) => `${p.side}@${p.at}`).sort();
      const real = final.board.flatMap((p, i) => (p ? [`${p === 'T' ? 'tiger' : 'goat'}@${i}`] : [])).sort();
      expect(shown).toEqual(real);
    });
  }

  it('the block lesson really leaves no jump after the goat fills the gap', () => {
    const block = HUNT_GUIDE.lessons.find((l) => l.title === 'Block the jump')!;
    const afterPlace = applyHuntMove(lessonStart(block), block.moves[0]);
    expect(legalHuntMoves(afterPlace).some((m) => m.kind === 'jump')).toBe(false);
  });

  it('the placing lesson covers the goat the tiger walked up to', () => {
    const placing = HUNT_GUIDE.lessons[0];
    let s = lessonStart(placing);
    s = applyHuntMove(s, placing.moves[0]);
    s = applyHuntMove(s, placing.moves[1]);
    // The tiger now threatens to jump the centre goat…
    expect(legalHuntMoves({ ...s, turn: 'tiger' }).some((m) => m.kind === 'jump')).toBe(true);
    // …until the next goat covers the point behind it.
    s = applyHuntMove(s, placing.moves[2]);
    expect(legalHuntMoves(s).some((m) => m.kind === 'jump')).toBe(false);
  });
});
