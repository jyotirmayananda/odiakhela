// Every game on the menu. The mancala games share one engine (engine/rules.ts, keyed by
// GameVariant); Bagha Chheli (engine/hunt.ts), Chowka Bara (engine/chowka.ts) and Dash-guti
// (engine/dash.ts) have their own.

import type { GameOptions, GameVariant } from '@/engine/types';
import { VARIANT_LIST } from '@/engine/variants';
import type { ChowkaOptions } from '@/hooks/useChowkaGame';
import type { DashOptions } from '@/hooks/useDashGame';
import type { HuntOptions } from '@/hooks/useHuntGame';

export type GameId = GameVariant | 'bagha_chheli' | 'chowka_bara' | 'dash_guti';

export interface GameInfo {
  id: GameId;
  name: string;
  region: string;
  description: string;
  section: GameSection;
  /** Cover art under /public/games */
  image: string;
}

/** Menu groups: games of Odisha (Odia khela) and games from elsewhere (Videshi khela). */
export type GameSection = 'odia' | 'videshi';

export const SECTIONS: { id: GameSection; title: string; subtitle: string }[] = [
  { id: 'odia', title: 'Odia Khela', subtitle: 'Games of Odisha' },
  { id: 'videshi', title: 'Videshi Khela', subtitle: 'Games from beyond' },
];

const ODIA_MANCALA: GameVariant[] = ['kasadi'];

const COVER: Record<GameId, string> = {
  kasadi: '/games/kasadi.jpg',
  lamlameta: '/games/lamlameta.jpg',
  kalah: '/games/kalah.jpg',
  bagha_chheli: '/games/bagha-chheli.jpg',
  chowka_bara: '/games/chowka-bara.jpg',
  dash_guti: '/games/dash-guti.jpg',
};

export const GAME_LIST: GameInfo[] = [
  ...VARIANT_LIST.map(({ id, name, region, description }) => ({
    id,
    name,
    region,
    description,
    section: (ODIA_MANCALA.includes(id) ? 'odia' : 'videshi') as GameSection,
    image: COVER[id],
  })),
  {
    id: 'bagha_chheli',
    name: 'Bagha Chheli',
    region: 'Odisha · tigers & goats',
    description: 'A hunt game: 4 tigers jump to capture, 20 goats close in to trap them.',
    section: 'odia',
    image: COVER.bagha_chheli,
  },
  {
    id: 'chowka_bara',
    name: 'Chowka Bara',
    region: 'Odisha · Ashta Chamma',
    description: 'A race for 2–4 players: throw cowries, knock rivals home, reach the centre.',
    section: 'odia',
    image: COVER.chowka_bara,
  },
  {
    id: 'dash_guti',
    name: 'Dash-guti',
    region: 'Odisha · Dosh guti',
    description: 'Ten pieces a side on an hourglass board. Jump to capture – and you must.',
    section: 'odia',
    image: COVER.dash_guti,
  },
];

export const gameInfo = (id: GameId): GameInfo => GAME_LIST.find((g) => g.id === id)!;

export const isGameId = (v: unknown): v is GameId => GAME_LIST.some((g) => g.id === v);

export type MatchStart =
  | { kind: 'mancala'; options: GameOptions }
  | { kind: 'hunt'; options: HuntOptions }
  | { kind: 'race'; options: ChowkaOptions }
  | { kind: 'capture'; options: DashOptions };
