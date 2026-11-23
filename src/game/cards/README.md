# src/game/cards

Pure card-game rules for the jail's Crazy Eights table. The client's jail UI plays against the guard or, online, against another player.

## Files

| File                                       | What it does                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crazyEights.ts` (+ `crazyEights.test.ts`) | Crazy Eights with the jail guard: five cards each, match suit or rank, eights are wild, first to empty their hand wins. Seeded and deterministic.          |
| `duel.ts` (+ `duel.test.ts`)               | The same game between two players online: the asker deals from a shared seed, and each move goes to the other player numbered so both tables stay in step. |

## Notes

- Pure TypeScript: no React, no three.js. The shuffle comes from a seed, so tests and both online players get the same deal.
