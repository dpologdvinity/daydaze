# src/game/motion

Small physics helpers for the in-world games. Scenes in `src/client/` sample them each frame into instanced meshes.

## Files

| File                                   | What it does                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ball.ts` (+ `ball.test.ts`)           | A ball's flight for volleyball, the water guns and dives: parabolas under gravity and bounces that lose energy.      |
| `particles.ts` (+ `particles.test.ts`) | Seeded particle bursts (sand puffs, splashes, light bursts) as data: one direction, speed and lifetime per particle. |

## Notes

- Pure math, no three.js; positions are written into a caller's arrays.
