import { describe, expect, it } from 'vitest';
import {
  applyChowkaMove,
  applyThrow,
  blockedByGate,
  cellOf,
  type ChowkaState,
  createChowkaState,
  HOME,
  isDeadlocked,
  legalChowkaMoves,
  OFF,
  PATHS,
  SAFE_CELLS,
  scoreShells,
  THROW_ODDS,
  throwShells,
} from '@/engine/chowka';
import { chooseChowkaMove } from '@/engine/chowkaAi';
import { buildChowkaDemo, CHOWKA_GUIDE } from '@/lib/chowkaGuide';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = OFF;
/** Two-player position (seats 0 and 2), seat 0 to move after the given throw. */
function at(you: number[], them: number[], throwValue: number, youCaptured = false): ChowkaState {
  const s = createChowkaState(2);
  const pawns = s.pawns.map((p) => p.slice());
  pawns[0] = you;
  pawns[2] = them;
  const hasCaptured = s.hasCaptured.slice();
  hasCaptured[0] = youCaptured;
  return { ...s, pawns, hasCaptured, phase: 'move', throwValue };
}

describe('board and shells', () => {
  it('each path visits every square once and ends in the centre', () => {
    for (const path of PATHS) {
      expect(new Set(path).size).toBe(25);
      expect(path[HOME]).toBe(12);
    }
    // seat 0 starts bottom-middle and moves right (anticlockwise); the inner ring turns clockwise
    expect(PATHS[0].slice(0, 3)).toEqual([22, 23, 24]);
    expect(PATHS[0].slice(15, 18)).toEqual([21, 16, 11]);
  });

  it('safe squares are the four starts and the centre', () => {
    expect([...SAFE_CELLS].sort((a, b) => a - b)).toEqual([2, 10, 12, 14, 22]);
  });

  it('scores the cowries: ups count, all up is 4, none up is 8', () => {
    expect(scoreShells([true, false, false, false])).toBe(1);
    expect(scoreShells([true, true, true, false])).toBe(3);
    expect(scoreShells([true, true, true, true])).toBe(4);
    expect(scoreShells([false, false, false, false])).toBe(8);
    expect(Object.values(THROW_ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const rng = mulberry32(1);
    for (let i = 0; i < 200; i++) expect([1, 2, 3, 4, 8]).toContain(throwShells(rng).value);
  });
});

describe('rules', () => {
  it('pawns enter only on a 4 or 8, and those throws earn another throw', () => {
    const s0 = createChowkaState(2);
    const afterTwo = applyThrow(s0, 2);
    expect(afterTwo.turn).toBe(2); // nothing could move: turn passed
    const afterFour = applyThrow(s0, 4);
    expect(legalChowkaMoves(afterFour)).toEqual([{ pawn: 0, from: OFF, to: 0, enter: true, captures: [] }]);
    const moved = applyChowkaMove(afterFour, legalChowkaMoves(afterFour)[0]);
    expect(moved.turn).toBe(0);
    expect(moved.phase).toBe('throw');
  });

  it('landing on a rival on a plain square captures it and earns a throw', () => {
    const s = at([3, W, W, W], [14, W, W, W], 3);
    const [m] = legalChowkaMoves(s);
    expect(m.captures).toEqual([{ seat: 2, pawn: 0 }]);
    const next = applyChowkaMove(s, m);
    expect(next.pawns[2][0]).toBe(OFF);
    expect(next.hasCaptured[0]).toBe(true);
    expect(next.turn).toBe(0);
  });

  it('crossed squares are safe', () => {
    const s = at([5, W, W, W], [0, W, W, W], 3);
    const [m] = legalChowkaMoves(s);
    expect(SAFE_CELLS.has(cellOf(0, m.to))).toBe(true);
    expect(m.captures).toEqual([]);
    const next = applyChowkaMove(s, m);
    expect(next.pawns[2][0]).toBe(0);
    expect(next.turn).toBe(2);
  });

  it('the gate: no entering the inner ring before a capture', () => {
    const shut = at([14, 2, W, W], [W, W, W, W], 3);
    expect(legalChowkaMoves(shut).map((m) => m.from)).toEqual([2]);
    expect(blockedByGate(shut)).toEqual([0]);
    const open = at([14, 2, W, W], [W, W, W, W], 3, true);
    expect(legalChowkaMoves(open).map((m) => m.from).sort()).toEqual([14, 2].sort());
  });

  it('the centre needs an exact throw, and four pawns home wins', () => {
    expect(legalChowkaMoves(at([22, HOME, HOME, HOME], [W, W, W, W], 3, true))).toEqual([]);
    const s = at([21, HOME, HOME, HOME], [W, W, W, W], 3, true);
    expect(applyChowkaMove(s, legalChowkaMoves(s)[0]).winner).toBe(0);
  });

  it('a deadlock (every pawn parked at a shut gate) is a draw', () => {
    const s = createChowkaState(2);
    const pawns = s.pawns.map((p) => p.slice());
    pawns[0] = [15, 15, 15, 15];
    pawns[2] = [15, 15, 15, 15];
    expect(isDeadlocked({ ...s, pawns })).toBe(true);
    pawns[0] = [15, 15, 15, 12];
    expect(isDeadlocked({ ...s, pawns })).toBe(false);
  });

  it('turns go round the seats in order and skip empty seats', () => {
    let s = createChowkaState(3);
    const order: number[] = [];
    for (let i = 0; i < 6; i++) {
      order.push(s.turn);
      s = applyThrow(s, 1); // nobody can move a 1 at the start
    }
    expect(order).toEqual([0, 1, 2, 0, 1, 2]);
  });
});

describe('random games', () => {
  for (const players of [2, 3, 4] as const) {
    it(`${players} players: games end and pawns stay on the board`, () => {
      const rng = mulberry32(players * 7);
      for (let g = 0; g < 150; g++) {
        let s = createChowkaState(players);
        while (s.winner === null) {
          if (s.phase === 'throw') s = applyThrow(s, throwShells(rng).value);
          else s = applyChowkaMove(s, chooseChowkaMove(s, 'easy', rng));
          for (const seat of s.seats) expect(s.pawns[seat].every((p) => p >= OFF && p <= HOME)).toBe(true);
        }
        expect(s.throws).toBeLessThan(1500);
      }
    });
  }
});

describe('AI', () => {
  it('takes a capture when it can', () => {
    // pawn A can capture with a 3; pawn B would just advance
    const s = at([3, 0, W, W], [14, W, W, W], 3);
    expect(chooseChowkaMove(s, 'medium').from).toBe(3);
    expect(chooseChowkaMove(s, 'hard').from).toBe(3);
  });

  it('hard beats medium over many 2-player games', () => {
    const rng = mulberry32(42);
    let wins = 0;
    const N = 120;
    for (let g = 0; g < N; g++) {
      let s = createChowkaState(2);
      if (g % 2) s = { ...s, turn: 2 };
      while (s.winner === null) {
        if (s.phase === 'throw') s = applyThrow(s, throwShells(rng).value);
        else s = applyChowkaMove(s, chooseChowkaMove(s, s.turn === 0 ? 'hard' : 'medium', rng));
      }
      if (s.winner === 0) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.6);
  }, 60_000);
});

describe('How-to-play lessons', () => {
  for (const lesson of CHOWKA_GUIDE.lessons) {
    it(`"${lesson.title}" plays out as described`, () => {
      const { final } = buildChowkaDemo(lesson);
      expect(final.pawns[0]).toEqual(lesson.expect.you);
      expect(final.pawns[2]).toEqual(lesson.expect.them);
      expect(final.hasCaptured[0]).toBe(lesson.expect.youCaptured);
    });
  }
});
