import { describe, expect, it } from 'vitest';
import { simulateMove, totalCounters } from '@/engine/rules';
import type { GameVariant } from '@/engine/types';
import { buildDemo, GUIDES } from '@/lib/guides';

describe('How-to-play lessons', () => {
  for (const variant of Object.keys(GUIDES) as GameVariant[]) {
    for (const lesson of GUIDES[variant].lessons) {
      it(`${variant}: "${lesson.title}" plays out as described`, () => {
        const demo = buildDemo(variant, lesson);
        const first = demo.frames[0].view;
        const last = demo.frames.at(-1)!.view;
        // Nothing appears or vanishes during the animation.
        expect(last.pits.reduce((a, b) => a + b, 0) + last.stores[0] + last.stores[1]).toBe(
          totalCounters({ pits: first.pits, stores: first.stores }),
        );

        if (lesson.kind === 'move') {
          const r = simulateMove(demo.state, lesson.play);
          expect(r.captured).toBe(lesson.expect.captured);
          expect(r.events.at(-1)).toMatchObject({ type: 'halt', reason: lesson.expect.halt });
          // The lesson must not accidentally end the round.
          expect(r.state.turnPhase).toBe('SELECT_PIT');
          expect(last.pits).toEqual(r.state.pits);
        } else {
          expect(demo.frames.at(-1)!.deadPits?.some(Boolean)).toBe(true);
        }
      });
    }
  }

  it('the Kasadi relay lesson actually relays', () => {
    const relay = GUIDES.kasadi.lessons.find((l) => l.title === 'Relay')!;
    const demo = buildDemo('kasadi', relay);
    expect(demo.frames.some((f) => f.event?.type === 'pickup' && f.event.relay)).toBe(true);
  });

  it('the Lamlameta sweep lesson captures more than the opposite pit', () => {
    const sweep = GUIDES.lamlameta.lessons.find((l) => l.title === 'The sweep')!;
    const demo = buildDemo('lamlameta', sweep);
    expect(demo.frames.filter((f) => f.event?.type === 'capture').length).toBeGreaterThan(1);
  });
});
