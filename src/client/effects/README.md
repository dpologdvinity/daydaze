# src/client/effects

The local player's drinking and drug state and the screen effects it drives. Rules are in `src/game/effects/` (`buzz.ts` and friends). Everything here is gated by the 18+ tier (`ADULT_OK`, `../adult.ts`): at 13+ a drink never builds a buzz and a dose does nothing. State lives in memory only, so a reload sobers the doll up.

## Files

| File                                                  | What it does                                                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drunk.ts` (+ `drunk.test.ts`, `drunk.adult.test.ts`) | The local drinking state (blood alcohol, absorbing drinks, food in the stomach, hangover) with change listeners. The tests cover the 13+ tier (no buzz) and the 18+ tier (a drink raises it) |
| `high.ts` (+ `high.test.ts`)                          | The local doses (joint, vape, edible, mushroom tea, LSD, molly, cocaine) and the meters they make. Doses exist only at 18+ and land after their onset                                        |
| `DrunkState.tsx` (+ `DrunkState.test.ts`)             | Per-frame driver: decays buzz and high, publishes the look the doll and post effect read, mirrors it onto canvas `data-*` attributes                                                         |
| `DrunkPost.tsx`                                       | The post-processing effect: sways, tints and breathes the screen from the live buzz and high, plus double vision for heavy drinking                                                          |
| `minigameAssist.ts`                                   | Resolves the high meter into a small adult-only offline minigame assist                                                                                                                      |
| `smokeEffect.ts` (+ `smokeEffect.test.ts`)            | Shared state for the smoke wisp and lighter flicker at an outdoor smoking spot; drawn by `../city/SmokeWisps.tsx`                                                                            |
