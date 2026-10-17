# Heritage Indoor Games — Kasadi · Lamlameta · Kalah · Bagha Chheli · Chowka Bara · Dash-guti

Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion + Zustand.
Play the machine (Easy / Medium / Hard minimax in a Web Worker) or pass-and-play locally.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # rules engine + AI tests (vitest)
npm run typecheck
```

## Directory structure

```
app/
  layout.tsx            Root layout, viewport/theme colour, PWA manifest link
  page.tsx              Setup screen ⇄ game screen; rehydrates persisted settings
  globals.css           Wood-grain board, carved pits, brass hinges, jute background
components/
  Board.tsx             2×N board, stores on the flanks, row labels + direction arrows,
                        hover path projection, 180° rotation for pass-and-play
  Pit.tsx               One carved pit: seed pile, count badge, legal/flash rings,
                        projected "+n" overlay, the travelling sowing hand (layoutId)
  Store.tsx             Captured-counter store with pile and pulse on capture
  Seed.tsx              SVG cowrie / tamarind / pebble counters + shared gradients
  SetupPanel.tsx        Game (Kasadi / Lamlameta / Kalah), opponent, difficulty, counters per pit, Pasu rule
  GameScreen.tsx        Wires the hook to Board, sounds, haptics, banners, dialogs, confetti
  GameGuide.tsx         About + How to play modal with animated, engine-driven lessons
  HuntBoard.tsx         Bagha Chheli board: carved lines, sliding tiger/goat tokens, jump markers
  HuntScreen.tsx        Bagha Chheli game screen: side panels, capture card, result dialog
  ChowkaBoard.tsx       Chowka Bara board: crossed safe squares, yards, walking pawns, cowrie shells
  ChowkaScreen.tsx      Chowka Bara game screen: throw button, players and gates, capture card
  DashBoard.tsx         Dash-guti board: hourglass of lines, sliding pieces, jump markers
  DashScreen.tsx        Dash-guti game screen: compulsory-capture prompts, quiet-move meter, chain card
  CaptureExplainer.tsx  Plain-language card explaining each mancala capture / free turn
engine/                 Pure TypeScript – no React/DOM; shareable with a server
  types.ts              GameState, SowEvent, MoveResult, VariantConfig …
  variants.ts           Defaults for each game (pits, counters, Pasu)
  rules.ts              Setup, legal moves, relay sowing, captures, sweep, round attrition
  ai.ts                 Easy (random), Medium (greedy), Hard (iterative-deepening α-β)
  hunt.ts               Bagha Chheli rules: 25-point board graph, placing, moving, jumps, wins
  huntAi.ts             Bagha Chheli AI: random / one-ply / iterative-deepening negamax
  chowka.ts             Chowka Bara rules: paths, cowrie throws, entry, captures, gate, home
  chowkaAi.ts           Chowka Bara AI: random / greedy / risk-aware using the shell odds
  dash.ts               Dash-guti rules: 21-point board, compulsory and chained jumps, wins
  dashAi.ts             Dash-guti AI: random / shallow / deep minimax that follows capture chains
  ai.worker.ts          Web Worker wrapper around chooseMove
hooks/
  useMancalaGame.ts     Turn state machine + event-replay animation + AI turns
  useHuntGame.ts        Bagha Chheli: tap-to-select, sliding pieces, capture hold, AI turns
  useChowkaGame.ts      Chowka Bara: throws, step-by-step walking, capture hold, machine seats
  useDashGame.ts        Dash-guti: tap-to-select, forced chain jumps, capture hold, AI turns
lib/
  aiClient.ts           Promise API over the worker, main-thread fallback
  feedback.ts           Synthesised wood/shell clacks (Web Audio) + navigator.vibrate
  guides.ts             About text, rules and lesson positions for each game
  huntGuide.ts          Bagha Chheli guide content and lessons
  chowkaGuide.ts        Chowka Bara guide content and lessons
  dashGuide.ts          Dash-guti guide content and lessons
  games.ts              Menu of all games (mancala variants + Bagha Chheli)
store/
  settings.ts           Zustand (persisted): match setup + seed style, speed, sound…
tests/engine.test.ts    Scenario tests, random-game invariants, AI sanity
tests/guides.test.ts    Each lesson plays out exactly as its text says
tests/hunt.test.ts      Bagha Chheli rules, wins, random-game invariants, AI, lessons
tests/chowka.test.ts    Chowka Bara paths, throws, rules, random games, AI, lessons
tests/dash.test.ts      Dash-guti board, compulsory and chain jumps, wins, AI, lessons
```

## Architecture

**The engine resolves a whole move up front.** `simulateMove(state, pit)` returns the
final `GameState` *and* an ordered list of `SowEvent`s (`pickup`, `drop`, `capture`,
`halt`). The UI never computes rules: `useMancalaGame` replays those events onto a
`BoardView` with timed delays (`applyEvent`), so the animated board always ends exactly
on the engine's result (a test replays every move of 50 random games to check
this). Skipping an animation just jumps to the final state.

```
SELECT_PIT ──selectPit──▶ SOWING_ANIMATION ──events replayed──▶ SELECT_PIT
                                                             ├─▶ ROUND_OVER ──nextRound──▶ SELECT_PIT
                                                             └─▶ MATCH_OVER ──newGame
```

**Captures explain themselves.** Just before any capture the engine emits a `reveal` step naming the pits involved (Kasadi: last pit → empty pit → pit taken; Lamlameta: landing pit, the pair opposite, every other pair swept). The board labels and rings those pits and pauses on them, and `CaptureExplainer` spells out why in plain words.

**The same pure function is the server validator.** `simulateMove` throws on illegal
moves, is deterministic and has no side effects, so an online room server can run it
authoritatively and broadcast `{ move, events, state }`.

**AI off the main thread.** `ai.worker.ts` runs `chooseMove`; Hard uses iterative
deepening (up to depth 7 Kasadi / 6 Lamlameta / 9 Kalah) with alpha-beta pruning, move ordering
by immediate capture, and a 1.2 s budget. The evaluation weighs store differential,
counters on each row (they return to their owner at round end), mobility, live-pit
count and — for Lamlameta — exposed pairs that can be swept.

## Rules as implemented

Pits are indexed counterclockwise: `0…n-1` Player 1 (bottom, sowing right),
`n…2n-1` Player 2 (top, sowing left).

**Kasadi (2×7)**
1. Lift all counters from one of your live pits and sow one per pit counterclockwise,
   skipping dead pits.
2. When the hand empties, look at the next pit:
   - occupied → lift it and keep sowing (relay);
   - empty, and the pit after it is occupied → capture that pit; turn ends;
   - two empties in a row → *Kada*, turn ends with no capture.
3. Pasu (optional): a pit reaching exactly 4 mid-sowing is claimed at once by its row's
   owner (`pit_owner`) or by the sower (`sower`).
4. When the player to move has no counters, the round ends and every counter left on
   the board goes to its row's owner.
5. Next round each player refills their pits in order from their store; pits they can't
   fill completely are dead ("Andha Ghara" / "Kottai") for that round, and any remainder
   stays in the store. A player who can't fill one pit loses the match. The starting
   player alternates.

**Lamlameta (2×12, 2 per pit)** — sow counterclockwise; landing on an occupied pit lifts
it and continues. Landing in an empty pit stops the turn; if that pit is yours and the
opposite pit holds exactly 2, capture it and every other pair in the opponent's row.
When the player to move has no seeds, remaining seeds go to their owners and the
higher store wins.

**Kalah (2×6, 4 per pit; 3–6 configurable)** — sow counterclockwise into your own store as you
pass it, skipping your opponent's store. Last seed in your own store: a free turn. Last seed
in your own empty pit with seeds opposite: capture both into your store. The game ends as
soon as either row is empty; each player banks the seeds left on their own row, and the
bigger store wins.

Defaults (counters for Kasadi and Kalah, Pasu for Kasadi) live in `engine/variants.ts` and are configurable in
the setup screen. A relay chain is cut off after 400 lifts (`MAX_RELAY_PICKUPS`) in the
rare positions where it could otherwise cycle.

## Not built yet

- **Online multiplayer** (rooms, matchmaking, chat/emoji drawer, 60 s reconnect grace).
  The intended shape: a Socket.io (or Supabase Realtime) room server that keeps the
  authoritative `GameState`, validates each `move` with `simulateMove`, and broadcasts
  the events; clients play the events through the same animation path
  (`useMancalaGame` would take an injected "transport" instead of calling the engine
  locally). The setup screen shows the Online option disabled.
- Recorded audio: sounds are synthesised so no assets ship; to use samples, replace the
  functions in `lib/feedback.ts` with Howler.js sprites.
- PWA icons and a service worker (the manifest is in place).

## Bagha Chheli (tigers & goats)

A hunt game, not a mancala, so it has its own engine (`engine/hunt.ts`), AI, hook and board.
It plays the common four-tiger rule set (as in Nepal's Bagh-Chal):

- 25 points joined by straight lines, with diagonals through every point whose row + column
  is even. Pieces move one point along a line.
- 4 tigers start on the corners; 20 goats start off the board and move first. Goats must place
  one per turn while any are in hand, then move.
- A tiger captures by jumping a neighbouring goat, along a line, into the empty point straight
  beyond (one jump per move). Goats never capture.
- Tigers win at 5 captures; goats win when no tiger can move or jump. 200 moves without a
  result is a draw (with good play from both sides the game tends to a draw).

Against the machine you choose to play the goats or the tigers.

## Chowka Bara (Ashta Chamma) — Classic rules

A race game for 2–4 players with its own engine (`engine/chowka.ts`). Against the machine you
take the first seat and the machine plays the rest; in pass & play every seat is a person.

- 5 × 5 board; four pawns each wait beside their crossed start square.
- Four cowries: count mouths up – 1, 2, 3; all up (chamma) = 4; all down (ashta) = 8.
  A 4 or 8 earns another throw and is the only throw that brings a pawn on.
- Pawns go anticlockwise round the outer ring, clockwise round the inner ring, into the centre
  (exact throw needed). One pawn moves per throw; with no legal move the turn passes.
- Landing on a rival on a plain square sends it back to start and earns another throw.
  The crossed squares (the four starts and the centre) are safe.
- The gate: a player's pawns may enter the inner ring only after that player has captured.
- First to bring all four pawns home wins. If every pawn left is parked at a gate that can't
  open, nobody can ever move again and the game is a draw (this happens in roughly 1–2% of
  random two-player games; a 1500-throw limit is a further safety net).

## Dash-guti — after Murray (1952), via Wikipedia

An alquerque-family capture game with its own engine (`engine/dash.ts`).

- Board: a Lau kata kati board (two triangles meeting at the centre) plus an arm out to each
  side – 21 points. Lines: the vertical, the two long diagonals through the centre, the three
  ranks of each triangle, and the arms.
- Each side has 10 pieces: its triangle's 9 points plus one arm. Only the centre is empty, so
  the first move steps into it and is captured. Ivory moves first.
- Move one step along a line in any direction. Capture by jumping an adjacent enemy into the
  empty point beyond; captures are compulsory, and a piece that can jump again must continue.
- Win by capturing every enemy piece or leaving the opponent no move. "If neither player can
  capture, more pieces wins" is implemented as: 40 moves without a capture ends the game,
  more pieces wins, equal is a draw.
