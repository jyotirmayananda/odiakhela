import { describe, expect, it } from 'vitest';
import { chooseMove } from '@/engine/ai';
import {
  applyEvent,
  createInitialState,
  getLegalMoves,
  simulateMove,
  startNextRound,
  totalCounters,
  viewOf,
} from '@/engine/rules';
import type { GameState, GameVariant } from '@/engine/types';
import { VARIANT_LIST } from '@/engine/variants';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withBoard(variant: GameVariant, pits: number[], patch: Partial<GameState> = {}): GameState {
  const s = createInitialState({ variant, isVsAI: false, aiDifficulty: 'easy', pasu: 'off' });
  return { ...s, pits, ...patch };
}

describe('Indian relay sowing', () => {
  it('captures the pit beyond an empty gap', () => {
    // P1 sows 2 from pit 0 into 1 and 2; pit 3 is empty, so pit 4 (7 counters) is captured.
    const pits = [2, 0, 0, 0, 7, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const r = simulateMove(withBoard('kasadi', pits), 0);
    expect(r.captured).toBe(7);
    expect(r.state.stores).toEqual([7, 0]);
    expect(r.state.pits[4]).toBe(0);
    expect(r.state.activePlayer).toBe(1);
  });

  it('relays from the following pit when it is occupied', () => {
    // Sow 1 from pit 0 into pit 1; pit 2 has 3 -> pick up and sow into 3,4,5; pit 6 empty, pit 7 captured.
    const pits = [1, 0, 3, 0, 0, 0, 0, 4, 1, 1, 1, 1, 1, 1];
    const r = simulateMove(withBoard('kasadi', pits), 0);
    const pickups = r.events.filter((e) => e.type === 'pickup');
    expect(pickups).toHaveLength(2);
    expect(pickups[1]).toMatchObject({ pit: 2, count: 3, relay: true });
    expect(r.state.pits.slice(0, 7)).toEqual([0, 1, 0, 1, 1, 1, 0]);
    expect(r.state.stores[0]).toBe(4);
  });

  it('ends with no capture on two empty pits (Kada)', () => {
    const pits = [1, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    const r = simulateMove(withBoard('kasadi', pits), 0);
    expect(r.captured).toBe(0);
    expect(r.events.at(-1)).toMatchObject({ type: 'halt', reason: 'kada' });
  });

  it('skips dead pits while sowing', () => {
    const dead = new Array(14).fill(false);
    dead[1] = true;
    const pits = [1, 0, 0, 0, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const r = simulateMove(withBoard('kasadi', pits, { deadPits: dead }), 0);
    expect(r.events[1]).toEqual({ type: 'drop', pit: 2 });
  });

  it('applies the Pasu rule to the pit owner', () => {
    // Sowing 1 from pit 0 makes pit 1 hold 4 -> claimed by its owner (P1).
    const base = withBoard('kasadi', [1, 3, 0, 0, 0, 0, 0, 9, 1, 1, 1, 1, 1, 1], { pasu: 'pit_owner' });
    const r = simulateMove(base, 0);
    expect(r.events).toContainEqual({ type: 'capture', pit: 1, count: 4, player: 0, reason: 'pasu' });
  });

  it('refills pits from the store and marks unfillable pits dead', () => {
    const s = withBoard('kasadi', new Array(14).fill(0), {
      stores: [52, 18],
      turnPhase: 'ROUND_OVER',
    });
    const next = startNextRound(s);
    expect(next.pits.slice(0, 7)).toEqual([5, 5, 5, 5, 5, 5, 5]);
    expect(next.stores).toEqual([17, 3]);
    expect(next.deadPits.slice(7)).toEqual([false, false, false, true, true, true, true]);
    expect(next.activePlayer).toBe(1);
  });
});

describe('Lamlameta', () => {
  it('sweeps every opponent pair when landing in an own empty pit opposite a pair', () => {
    const pits = new Array(24).fill(0);
    pits[0] = 1; // sow into pit 1 (empty) – opposite pit is 22
    pits[22] = 2;
    pits[15] = 2;
    pits[18] = 3;
    pits[20] = 2;
    const r = simulateMove(withBoard('lamlameta', pits), 0);
    expect(r.captured).toBe(6);
    expect(r.state.pits[18]).toBe(3);
    expect(r.events.filter((e) => e.type === 'capture' && e.reason === 'sweep')).toHaveLength(3);
  });

  it('relays from an occupied landing pit', () => {
    const pits = new Array(24).fill(0);
    pits[0] = 1;
    pits[1] = 2; // landing makes 3 -> pick up, sow into 2,3,4
    pits[12] = 1;
    const r = simulateMove(withBoard('lamlameta', pits), 0);
    expect(r.state.pits.slice(0, 5)).toEqual([0, 0, 1, 1, 1]);
  });

  it('does not capture when the opposite pit is not exactly two', () => {
    const pits = new Array(24).fill(0);
    pits[0] = 1;
    pits[22] = 3;
    pits[15] = 2;
    const r = simulateMove(withBoard('lamlameta', pits), 0);
    expect(r.captured).toBe(0);
  });
});

describe('invariants over random games', () => {
  for (const v of VARIANT_LIST) {
    it(`${v.id}: conserves counters and replays events exactly`, () => {
      const rng = mulberry32(42);
      for (let game = 0; game < 25; game++) {
        let s = createInitialState({ variant: v.id, isVsAI: false, aiDifficulty: 'easy' });
        const total = totalCounters(s);
        for (let ply = 0; ply < 3000 && s.turnPhase !== 'MATCH_OVER'; ply++) {
          if (s.turnPhase === 'ROUND_OVER') {
            s = startNextRound(s);
            continue;
          }
          const moves = getLegalMoves(s);
          expect(moves.length).toBeGreaterThan(0);
          const pit = moves[Math.floor(rng() * moves.length)];
          const r = simulateMove(s, pit);
          const replay = r.events.reduce(applyEvent, viewOf(s));
          expect(replay.pits).toEqual(r.state.pits);
          expect(replay.stores).toEqual(r.state.stores);
          expect(totalCounters(r.state)).toBe(total);
          expect(r.state.pits.every((c, i) => c >= 0 && (!r.state.deadPits[i] || c === 0))).toBe(true);
          s = r.state;
        }
      }
    });
  }
});

describe('AI', () => {
  it('always returns a legal move at every difficulty', () => {
    for (const variant of ['kasadi', 'lamlameta'] as const) {
      const s = createInitialState({ variant, isVsAI: true, aiDifficulty: 'hard' });
      for (const d of ['easy', 'medium', 'hard'] as const) {
        expect(getLegalMoves(s)).toContain(chooseMove(s, d, { timeBudgetMs: 200 }));
      }
    }
  });

  it('hard AI takes an obvious capture', () => {
    // Pit 0 (1 counter) captures 12; pit 6 does nothing useful.
    const pits = [1, 0, 0, 12, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1];
    const s = withBoard('kasadi', pits);
    expect(chooseMove(s, 'medium')).toBe(0);
    expect(chooseMove(s, 'hard', { timeBudgetMs: 300 })).toBe(0);
  });

  it('beats a random player most of the time', () => {
    const rng = mulberry32(7);
    let wins = 0;
    const games = 6;
    for (let g = 0; g < games; g++) {
      let s = createInitialState({ variant: 'kasadi', isVsAI: true, aiDifficulty: 'hard', aiPlayer: 1 });
      for (let ply = 0; ply < 2000 && s.turnPhase !== 'MATCH_OVER'; ply++) {
        if (s.turnPhase === 'ROUND_OVER') {
          s = startNextRound(s);
          continue;
        }
        const moves = getLegalMoves(s);
        const pit = s.activePlayer === 1 ? chooseMove(s, 'hard', { timeBudgetMs: 40, maxDepth: 3 }) : moves[Math.floor(rng() * moves.length)];
        s = simulateMove(s, pit, { fast: true }).state;
      }
      if (s.winner === 1 || (s.turnPhase !== 'MATCH_OVER' && s.stores[1] > s.stores[0])) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(4);
  }, 60_000);
});

describe('capture explanations (reveal events)', () => {
  it('Kasadi: reveal names the last pit, the empty gap and the pit taken, right before the capture', () => {
    const pits = [2, 0, 0, 0, 7, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const { events } = simulateMove(withBoard('kasadi', pits), 0);
    const i = events.findIndex((e) => e.type === 'reveal');
    expect(events[i]).toEqual({ type: 'reveal', rule: 'gap', last: 2, gap: 3, target: 4, count: 7 });
    expect(events[i + 1]).toMatchObject({ type: 'capture', pit: 4, count: 7, reason: 'empty_gap' });
  });

  it('Lamlameta: reveal lists exactly the pairs that are swept, opposite first', () => {
    const pits = new Array(24).fill(0);
    pits[0] = 1;
    pits[22] = 2;
    pits[15] = 2;
    pits[18] = 3;
    pits[20] = 2;
    const { events } = simulateMove(withBoard('lamlameta', pits), 0);
    const reveal = events.find((e) => e.type === 'reveal');
    expect(reveal).toEqual({ type: 'reveal', rule: 'sweep', landing: 1, opposite: 22, pairs: [22, 15, 20], count: 6 });
    const swept = events.filter((e) => e.type === 'capture' && e.reason === 'sweep').map((e) => (e as { pit: number }).pit);
    expect(swept).toEqual([22, 15, 20]);
  });

  it('every capture over random games is preceded by a matching reveal', () => {
    const rng = mulberry32(3);
    for (const variant of ['kasadi', 'lamlameta', 'kalah'] as const) {
      for (let g = 0; g < 20; g++) {
        let s = createInitialState({ variant, isVsAI: false, aiDifficulty: 'easy', pasu: 'off' });
        for (let ply = 0; ply < 400 && s.turnPhase === 'SELECT_PIT'; ply++) {
          const moves = getLegalMoves(s);
          const { events, state } = simulateMove(s, moves[Math.floor(rng() * moves.length)]);
          const caps = events.filter((e) => e.type === 'capture' && e.reason !== 'round_end');
          // Free-turn announcements are reveals too, but never come with a capture.
          const reveal = events.find((e) => e.type === 'reveal' && e.rule !== 'extra_turn');
          if (caps.length === 0) expect(reveal).toBeUndefined();
          else if (reveal?.type === 'reveal') {
            const taken = caps.map((e) => (e as { pit: number }).pit);
            const expected =
              reveal.rule === 'sweep'
                ? reveal.pairs
                : reveal.rule === 'opposite'
                  ? [reveal.opposite, reveal.landing]
                  : [reveal.target];
            expect(taken).toEqual(expected);
            expect(caps.reduce((a, e) => a + (e as { count: number }).count, 0)).toBe(reveal.count);
          } else throw new Error('capture without reveal');
          s = state;
        }
      }
    }
  });
});

describe('Kalah', () => {
  const kalah = (pits: number[], patch: Partial<GameState> = {}) => withBoard('kalah', pits, patch);

  it('sows into your own store and skips the opponent’s', () => {
    // P1 sows 9 from pit 5: store, 6..11, (P2 store skipped), 0, 1.
    const pits = [1, 1, 1, 1, 1, 9, 1, 1, 1, 1, 1, 1];
    const { events, state } = simulateMove(kalah(pits), 5);
    expect(events.filter((e) => e.type === 'store_drop')).toEqual([{ type: 'store_drop', player: 0 }]);
    expect(state.stores).toEqual([1, 0]);
    expect(state.pits).toEqual([2, 2, 1, 1, 1, 0, 2, 2, 2, 2, 2, 2]);
  });

  it('the top player sows into their own store, skipping yours', () => {
    const pits = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3];
    const { state } = simulateMove(kalah(pits, { activePlayer: 1 }), 11);
    expect(state.stores).toEqual([0, 1]);
    expect(state.pits.slice(0, 2)).toEqual([2, 2]);
  });

  it('a last seed in your own store gives a free turn', () => {
    const { events, state } = simulateMove(createInitialState({ variant: 'kalah', isVsAI: false, aiDifficulty: 'easy' }), 2);
    expect(events).toContainEqual({ type: 'reveal', rule: 'extra_turn', player: 0 });
    expect(events.at(-1)).toMatchObject({ type: 'halt', reason: 'extra_turn' });
    expect(state.activePlayer).toBe(0);
  });

  it('a last seed in your own empty pit captures it and the opposite pit', () => {
    const pits = [1, 0, 3, 2, 0, 2, 3, 2, 1, 4, 5, 2];
    const { events, state, captured } = simulateMove(kalah(pits), 0);
    expect(events).toContainEqual({ type: 'reveal', rule: 'opposite', landing: 1, opposite: 10, count: 6 });
    expect(captured).toBe(6);
    expect(state.pits[1]).toBe(0);
    expect(state.pits[10]).toBe(0);
    expect(state.stores[0]).toBe(6);
    expect(state.activePlayer).toBe(1);
  });

  it('no capture when the opposite pit is empty, or when landing on the opponent’s side', () => {
    const emptyOpp = simulateMove(kalah([1, 0, 3, 2, 0, 2, 3, 2, 1, 4, 0, 2]), 0);
    expect(emptyOpp.captured).toBe(0);
    expect(emptyOpp.state.pits[1]).toBe(1);
    // Your spare seed in pit 0 keeps the game going, so no end-of-game sweep muddies this.
    const theirSide = simulateMove(kalah([1, 0, 0, 0, 0, 2, 0, 3, 1, 1, 1, 1]), 5);
    expect(theirSide.state.turnPhase).toBe('SELECT_PIT');
    expect(theirSide.events.some((e) => e.type === 'capture')).toBe(false);
  });

  it('ends when a row empties; each side keeps its own remaining seeds', () => {
    // P1 plays their only seed into the store: their row is now empty, so the game ends.
    const pits = [0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 1];
    const { state } = simulateMove(kalah(pits, { stores: [10, 7] }), 5);
    expect(state.turnPhase).toBe('MATCH_OVER');
    expect(state.stores).toEqual([11, 13]);
    expect(state.winner).toBe(1);
    expect(state.pits.every((c) => c === 0)).toBe(true);
  });

  it('hard AI prefers a capture worth 6 over a single store drop', () => {
    const pits = [1, 0, 3, 2, 0, 2, 3, 2, 1, 4, 5, 2];
    const s = kalah(pits);
    expect(chooseMove(s, 'medium')).toBe(0);
  });
});
