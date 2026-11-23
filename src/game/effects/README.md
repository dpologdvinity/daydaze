# src/game/effects

The 18+ substance models: what a drink or strain does over real time, and how it shows in the doll and on screen. Everything here is adult-tier content and must stay behind `ADULT_OK` (`src/client/adult.ts`, rules in [`../age.ts`](../age.ts)). The timelines follow `docs/research/substances.md`.

## Files

| File                                                   | What it does                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `buzz.ts` (+ `buzz.test.ts`)                           | The buzz: blood alcohol modeled on the research, with absorption over time that depends on the drink and a full stomach. |
| `substances.ts` (+ `substances.test.ts`)               | The 18+ substances: what each menu item is, how it builds, peaks and fades, and how it shows on the doll and screen.     |
| `minigameModifiers.ts` (+ `minigameModifiers.test.ts`) | Small deterministic assists for offline adult minigame sessions; online and under-18 play stay sober.                    |
| `tracer.ts` (+ `tracer.test.ts`)                       | Acid's tracers: how much of the last frame's history survives, independent of frame rate.                                |

## Notes

- Pure TypeScript with no React or three.js; the client draws the visuals.
- No real alcohol or tobacco brands, and nothing here may be reachable without `ADULT_OK`.
