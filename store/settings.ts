import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Side } from '@/engine/hunt';
import type { AIDifficulty, PasuRule } from '@/engine/types';
import { type GameId, isGameId } from '@/lib/games';

export type SeedStyle = 'cowrie' | 'tamarind' | 'pebble';
export type AnimationSpeed = 'slow' | 'normal' | 'fast';
export type PlayMode = 'ai' | 'local';

interface SettingsState {
  // Match setup
  mode: PlayMode;
  /** Game picked on the setup screen (a mancala variant or Bagha Chheli). */
  variant: GameId;
  /** Side the human plays against the machine in Bagha Chheli. */
  huntSide: Side;
  /** Players in a Chowka Bara match. */
  chowkaPlayers: 2 | 3 | 4;
  /** Side the human plays against the machine in Dash-guti (0 = ivory, moves first). */
  dashSide: 0 | 1;
  seedsPerPit: number;
  pasu: PasuRule | 'variant';
  aiDifficulty: AIDifficulty;
  // Presentation
  seedStyle: SeedStyle;
  speed: AnimationSpeed;
  sound: boolean;
  haptics: boolean;
  showProjection: boolean;
  rotateForPlayer2: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      mode: 'ai',
      variant: 'kasadi',
      huntSide: 'goat',
      chowkaPlayers: 4,
      dashSide: 0,
      seedsPerPit: 5,
      pasu: 'variant',
      aiDifficulty: 'medium',
      seedStyle: 'cowrie',
      speed: 'normal',
      sound: true,
      haptics: true,
      showProjection: true,
      rotateForPlayer2: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'mancala-settings',
      storage: createJSONStorage(() => localStorage),
      // Rehydrated on mount (see app/page.tsx) so server and first client render match.
      skipHydration: true,
      // Saved settings may name a variant that has since been removed; fall back to the default.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        const variant = isGameId(saved.variant) ? saved.variant : current.variant;
        return { ...current, ...saved, variant };
      },
    },
  ),
);
