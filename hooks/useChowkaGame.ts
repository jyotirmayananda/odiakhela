'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyChowkaMove,
  applyThrow,
  blockedByGate,
  cellOf,
  type ChowkaMove,
  type ChowkaState,
  createChowkaState,
  ENTRY_THROWS,
  legalChowkaMoves,
  type Seat,
  throwShells,
} from '@/engine/chowka';
import { chooseChowkaMove } from '@/engine/chowkaAi';
import type { AIDifficulty } from '@/engine/types';
import type { AnimationSpeed } from '@/store/settings';

export interface ChowkaOptions {
  players: 2 | 3 | 4;
  /** Seats played by people at this device; every other seat is the machine. */
  humanSeats: Seat[];
  aiDifficulty: AIDifficulty;
}

/** Something worth explaining after a move or throw. */
export type ChowkaNews =
  | { kind: 'capture'; mover: Seat; cell: number; captured: { seat: Seat; pawn: number }[]; gateOpened: boolean }
  | { kind: 'bonus'; mover: Seat; value: number }
  | { kind: 'no_move'; mover: Seat; value: number; gate: boolean };

const STEP_MS: Record<AnimationSpeed, number> = { slow: 320, normal: 200, fast: 110 };
const SHELL_ROLL_MS = 650;
const HOLD_MS: Record<AnimationSpeed, number> = { slow: 2400, normal: 1800, fast: 1100 };
const AI_PAUSE_MS = 450;

/**
 * State machine for a Chowka Bara match:
 *   throw (tap "Throw shells" or the machine throws) → move (tap a glowing pawn) → …
 * Pawns walk square by square; captures pause with an explanation; 4, 8 and captures
 * give another throw.
 */
export function useChowkaGame(options: ChowkaOptions, { speed = 'normal', onEvent }: { speed?: AnimationSpeed; onEvent?: (kind: 'step' | 'throw' | 'capture' | 'home') => void } = {}) {
  const [state, setState] = useState<ChowkaState>(() => createChowkaState(options.players));
  /** Pawn positions as drawn (they lag the engine while a pawn is walking). */
  const [shown, setShown] = useState<number[][]>(() => state.pawns.map((p) => p.slice()));
  const [shells, setShells] = useState<boolean[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [news, setNews] = useState<ChowkaNews | null>(null);
  /** The latest capture, kept on screen until the next one (bonus throws must not wipe it). */
  const [lastCapture, setLastCapture] = useState<Extract<ChowkaNews, { kind: 'capture' }> | null>(null);
  /** Capture being shown on the board right now. */
  const [reveal, setReveal] = useState<{ cell: number; captured: { seat: Seat; pawn: number }[] } | null>(null);

  const stateRef = useRef(state);
  const busyRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speedRef = useRef(speed);
  const onEventRef = useRef(onEvent);
  speedRef.current = speed;
  onEventRef.current = onEvent;

  const later = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
  const settle = (next: ChowkaState) => {
    stateRef.current = next;
    setState(next);
    setShown(next.pawns.map((p) => p.slice()));
    busyRef.current = false;
    setBusy(false);
  };

  const isHuman = (seat: Seat) => options.humanSeats.includes(seat);
  const humanTurn = state.winner === null && isHuman(state.turn);

  const doThrow = useCallback(() => {
    const s = stateRef.current;
    if (busyRef.current || s.phase !== 'throw' || s.winner !== null) return;
    busyRef.current = true;
    setBusy(true);
    setRolling(true);
    setNews(null);
    const { shells: faces, value: v } = throwShells();
    onEventRef.current?.('throw');
    later(SHELL_ROLL_MS, () => {
      setRolling(false);
      setShells(faces);
      const next = applyThrow(s, v);
      if (next.phase === 'move') {
        settle(next);
        return;
      }
      // No legal move: say why, then hand over (or throw again after a 4/8).
      const gate = blockedByGate({ ...s, phase: 'move', throwValue: v }).length > 0;
      setNews({ kind: 'no_move', mover: s.turn, value: v, gate });
      // Machines lose turns often early on (only 4 or 8 brings a pawn on): keep those quick.
      const hold = HOLD_MS[speedRef.current] * (options.humanSeats.includes(s.turn) ? 0.7 : 0.35);
      later(hold, () => settle(next));
    });
  }, []);

  const doMove = useCallback((m: ChowkaMove) => {
    const s = stateRef.current;
    if (busyRef.current || s.phase !== 'move') return;
    let next: ChowkaState;
    try {
      next = applyChowkaMove(s, m);
    } catch {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setNews(null);
    const seat = s.turn;
    const path: number[] = [];
    for (let p = m.enter ? 0 : m.from + 1; p <= m.to; p++) path.push(p);
    const step = STEP_MS[speedRef.current];
    path.forEach((p, k) =>
      later(k * step, () => {
        setShown((cur) => cur.map((row, rs) => (rs === seat ? row.map((pos, i) => (i === m.pawn ? p : pos)) : row)));
        onEventRef.current?.(p === 24 ? 'home' : 'step');
      }),
    );
    const walked = path.length * step;
    const bonus = ENTRY_THROWS.includes(s.throwValue ?? 0);
    if (m.captures.length) {
      later(walked, () => {
        setReveal({ cell: cellOf(seat, m.to), captured: m.captures });
        const capture = { kind: 'capture' as const, mover: seat, cell: cellOf(seat, m.to), captured: m.captures, gateOpened: !s.hasCaptured[seat] };
        setNews(capture);
        setLastCapture(capture);
        onEventRef.current?.('capture');
      });
      later(walked + HOLD_MS[speedRef.current], () => {
        setReveal(null);
        settle(next);
      });
    } else {
      later(walked + 120, () => {
        if (bonus && next.turn === seat && next.winner === null) setNews({ kind: 'bonus', mover: seat, value: s.throwValue! });
        settle(next);
      });
    }
  }, []);

  // Machine seats throw and move on their own.
  useEffect(() => {
    if (state.winner !== null || busy || isHuman(state.turn)) return;
    const t = setTimeout(() => {
      const s = stateRef.current;
      if (s.phase === 'throw') doThrow();
      else doMove(chooseChowkaMove(s, options.aiDifficulty));
    }, AI_PAUSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, busy]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const moves = useMemo(() => (humanTurn && !busy ? legalChowkaMoves(state) : []), [state, humanTurn, busy]);

  /** Move made by tapping pawn `pawn` of the current seat (any pawn sharing that spot works). */
  const moveForPawn = useCallback(
    (pawn: number) => moves.find((m) => m.from === stateRef.current.pawns[stateRef.current.turn][pawn]) ?? null,
    [moves],
  );

  const newGame = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const fresh = createChowkaState(options.players);
    setShells(null);
    setNews(null);
    setLastCapture(null);
    setReveal(null);
    setRolling(false);
    settle(fresh);
  }, [options.players]);

  return {
    state,
    shown,
    shells,
    rolling,
    busy,
    news,
    lastCapture,
    reveal,
    humanTurn,
    canThrow: humanTurn && !busy && state.phase === 'throw',
    moves,
    gateBlocked: humanTurn && !busy ? blockedByGate(state) : [],
    moveForPawn,
    throwShells: doThrow,
    move: doMove,
    newGame,
    isHuman,
  };
}

export type ChowkaGame = ReturnType<typeof useChowkaGame>;
