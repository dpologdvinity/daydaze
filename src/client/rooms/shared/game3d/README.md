# src/client/rooms/shared/game3d

The kit for in-world games (volleyball, diving, aiming, chores): balls, particle bursts, score cards, and the hooks that give a game the camera, the seat and the doll's clip. Session logic stays in each room's own `session.ts`; rules are in `src/game/` (particles in `src/game/motion/particles.ts`).

## Files

| File                                   | What it does                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Ball.tsx`                             | A lit sphere with seams (volleyball, beach ball) that rolls as it flies; the game supplies a `track` callback |
| `Burst.tsx`                            | Instanced particle bursts, one draw call per effect, seeded per shot                                          |
| `Splash.tsx`                           | Water and sand bursts on the `Burst` base                                                                     |
| `ScoreCard.tsx`                        | A judge's score card on a stick, drawn on a canvas texture                                                    |
| `gameClip.ts`                          | The game clip the player's doll plays during a game; `PlayerController` reads it                              |
| `seatClaim.ts` (+ `seatClaim.test.ts`) | Seat claims: only one game at a time holds the seat it moves itself                                           |
| `useGameShot.ts`                       | A game's camera shot: eases to a fixed eye and target (snaps under reduced motion)                            |
| `workClip.ts`                          | Chore clips (planting, watering, harvesting) from Quaternius' farm clips                                      |
| `kit.html`, `kit.tsx`                  | Dev-only lab for the kit, not linked from the game: open `kit.html` on the dev server                         |
