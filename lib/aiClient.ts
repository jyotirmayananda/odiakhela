import { chooseMove } from '@/engine/ai';
import type { AIRequest, AIResponse } from '@/engine/ai.worker';
import type { HuntMove, HuntState } from '@/engine/hunt';
import { chooseHuntMove } from '@/engine/huntAi';
import type { AIDifficulty, GameState } from '@/engine/types';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (res: AIResponse) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('../engine/ai.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<AIResponse>) => {
        const p = pending.get(e.data.id);
        if (!p) return;
        pending.delete(e.data.id);
        if (e.data.error === undefined) p.resolve(e.data);
        else p.reject(new Error(e.data.error));
      };
      worker.onerror = () => {
        // Fall back to the main thread for anything in flight; a new worker is made next time.
        for (const p of pending.values()) p.reject(new Error('AI worker crashed'));
        pending.clear();
        worker?.terminate();
        worker = null;
      };
    } catch {
      worker = null;
    }
  }
  return worker;
}

/** Sends a request to the worker; null if workers are unavailable. */
function ask(req: Omit<AIRequest, 'id'>): Promise<AIResponse> | null {
  const w = getWorker();
  if (!w) return null;
  const id = ++seq;
  return new Promise<AIResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ ...req, id } as AIRequest);
  });
}

const later = <T,>(f: () => T) => new Promise<T>((resolve) => setTimeout(() => resolve(f()), 0));

/** Asks the AI for a mancala move, in a Web Worker when available, otherwise on the main thread. */
export function requestAIMove(state: GameState, difficulty: AIDifficulty): Promise<number> {
  const fallback = () => chooseMove(state, difficulty);
  const req = ask({ kind: 'mancala', state, difficulty });
  if (!req) return later(fallback);
  return req.then((r) => (r.pit !== undefined ? r.pit : fallback())).catch(fallback);
}

/** Same for Bagha Chheli. */
export function requestHuntMove(state: HuntState, difficulty: AIDifficulty): Promise<HuntMove> {
  const fallback = () => chooseHuntMove(state, difficulty);
  const req = ask({ kind: 'hunt', state, difficulty });
  if (!req) return later(fallback);
  return req.then((r) => r.move ?? fallback()).catch(fallback);
}
