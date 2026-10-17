'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyEvent,
  createInitialState,
  getLegalMoves,
  isLegalMove,
  projectPath,
  simulateMove,
  startNextRound,
  viewOf,
} from '@/engine/rules';
import type { BoardView, GameOptions, GameState, MoveResult, Player, RevealEvent, SowEvent } from '@/engine/types';
import { requestAIMove } from '@/lib/aiClient';
import type { AnimationSpeed } from '@/store/settings';

/** Base delay per sowing step, in ms. */
const SPEED_MS: Record<AnimationSpeed, number> = { slow: 320, normal: 170, fast: 70 };
/** Moves longer than this many events are sped up so a turn never drags on. */
const LONG_MOVE_EVENTS = 90;
const MIN_STEP_MS = 14;
/** How long the board holds on a capture explanation. Never sped up, so it stays readable. */
const REVEAL_MS: Record<AnimationSpeed, number> = { slow: 2800, normal: 2200, fast: 1500 };
/** Minimum time the machine appears to "think", so its moves are readable. */
const AI_MIN_THINK_MS = 650;

function stepDelay(e: SowEvent, base: number): number {
  switch (e.type) {
    case 'pickup':
      return base * 2.2;
    case 'capture':
      return base * (e.reason === 'round_end' ? 1.2 : 3);
    case 'halt':
      return base * 1.5;
    default:
      return base;
  }
}

export interface UseMancalaGameOptions {
  speed?: AnimationSpeed;
  /** Fired for every animated step – hook sounds and haptics here. */
  onEvent?: (event: SowEvent, view: BoardView) => void;
}

/**
 * State machine for a local match (vs. AI or pass-and-play).
 *
 *   SELECT_PIT ──selectPit──▶ SOWING_ANIMATION ──(events replayed)──▶ SELECT_PIT
 *                                                                  ├─▶ ROUND_OVER ──nextRound──▶ SELECT_PIT
 *                                                                  └─▶ MATCH_OVER ──newGame
 *
 * The whole move is resolved by the pure engine up front; the hook only replays its
 * events onto `view` with delays, so the final state can never drift from the rules.
 */
export function useMancalaGame(initial: GameOptions, { speed = 'normal', onEvent }: UseMancalaGameOptions = {}) {
  const [game, setGame] = useState<GameState>(() => createInitialState(initial));
  const [view, setView] = useState<BoardView>(() => viewOf(game));
  const [activeEvent, setActiveEvent] = useState<SowEvent | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  /** The latest capture and who made it; kept until the next move so it can be read. */
  const [explanation, setExplanation] = useState<{ reveal: RevealEvent; mover: Player } | null>(null);

  const gameRef = useRef(game);
  const pendingRef = useRef<MoveResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRef = useRef(speed);
  const onEventRef = useRef(onEvent);
  speedRef.current = speed;
  onEventRef.current = onEvent;

  const commit = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const finish = useCallback(
    (final: GameState) => {
      clearTimer();
      pendingRef.current = null;
      commit(final);
      setView(viewOf(final));
      setActiveEvent(null);
    },
    [commit],
  );

  /** Starts a move for whoever is active. Returns false if the move is illegal right now. */
  const playMove = useCallback(
    (pit: number): boolean => {
      const g = gameRef.current;
      if (pendingRef.current || !isLegalMove(g, pit)) return false;
      const result = simulateMove(g, pit);
      pendingRef.current = result;
      commit({ ...g, turnPhase: 'SOWING_ANIMATION' });
      setExplanation(null);

      const { events } = result;
      const scale = Math.min(1, LONG_MOVE_EVENTS / events.length);
      let v = viewOf(g);
      let i = 0;
      const step = () => {
        if (pendingRef.current !== result) return; // cancelled or skipped
        if (i >= events.length) {
          finish(result.state);
          return;
        }
        const e = events[i++];
        v = applyEvent(v, e);
        setView(v);
        setActiveEvent(e);
        onEventRef.current?.(e, v);
        if (e.type === 'reveal') {
          setExplanation({ reveal: e, mover: g.activePlayer });
          // Free turns are frequent in Kalah, so they get a shorter hold than captures.
          const hold = REVEAL_MS[speedRef.current] * (e.rule === 'extra_turn' ? 0.55 : 1);
          timerRef.current = setTimeout(step, hold);
          return;
        }
        timerRef.current = setTimeout(step, Math.max(MIN_STEP_MS, stepDelay(e, SPEED_MS[speedRef.current]) * scale));
      };
      timerRef.current = setTimeout(step, 60);
      return true;
    },
    [commit, finish],
  );

  const isHumanTurn = !(game.isVsAI && game.activePlayer === game.aiPlayer);

  /** Human input. Ignored during the machine's turn or while sowing. */
  const selectPit = useCallback(
    (pit: number) => {
      const g = gameRef.current;
      if (g.isVsAI && g.activePlayer === g.aiPlayer) return false;
      return playMove(pit);
    },
    [playMove],
  );

  // Machine turn: ask the worker, wait a beat, then play.
  useEffect(() => {
    if (!game.isVsAI || game.turnPhase !== 'SELECT_PIT' || game.activePlayer !== game.aiPlayer) return;
    let cancelled = false;
    const started = Date.now();
    setAiThinking(true);
    requestAIMove(game, game.aiDifficulty).then((pit) => {
      const wait = Math.max(0, AI_MIN_THINK_MS - (Date.now() - started));
      setTimeout(() => {
        if (cancelled) return;
        setAiThinking(false);
        playMove(pit);
      }, wait);
    });
    return () => {
      cancelled = true;
      setAiThinking(false);
    };
  }, [game, playMove]);

  useEffect(() => clearTimer, []);

  const skipAnimation = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    // Skipping must not hide what was captured and why.
    const reveal = pending.events.find((e): e is RevealEvent => e.type === 'reveal');
    if (reveal) setExplanation({ reveal, mover: gameRef.current.activePlayer });
    finish(pending.state);
  }, [finish]);

  const nextRound = useCallback(() => {
    const g = gameRef.current;
    if (g.turnPhase !== 'ROUND_OVER') return;
    const next = startNextRound(g);
    commit(next);
    setView(viewOf(next));
    setExplanation(null);
  }, [commit]);

  const newGame = useCallback(
    (opts: GameOptions) => {
      clearTimer();
      pendingRef.current = null;
      const next = createInitialState(opts);
      commit(next);
      setView(viewOf(next));
      setActiveEvent(null);
      setExplanation(null);
    },
    [commit],
  );

  const legalMoves = useMemo(() => (isHumanTurn ? getLegalMoves(game) : []), [game, isHumanTurn]);

  const previewPath = useCallback(
    (pit: number | null) => (pit !== null && isLegalMove(gameRef.current, pit) ? projectPath(gameRef.current, pit) : []),
    [],
  );

  const isAnimating = game.turnPhase === 'SOWING_ANIMATION';

  return {
    game,
    view,
    activeEvent,
    aiThinking,
    isHumanTurn,
    isAnimating,
    /** Latest capture explanation (who and why); stays until the next move starts. */
    explanation,
    /** Capture to mark on the board – only while that move is still animating. */
    boardReveal: isAnimating ? (explanation?.reveal ?? null) : null,
    legalMoves,
    selectPit,
    previewPath,
    skipAnimation,
    nextRound,
    newGame,
  };
}

export type MancalaGame = ReturnType<typeof useMancalaGame>;
