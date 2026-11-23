# src/minigames

The 2D minigames that open over the 3D world in a modal dialog. Each game is a folder with a pure, seeded `engine.ts` (tested in Node), and a React view that owns the timing loop and reports the best result of the visit once on close. `src/client/ui/Minigames.tsx` loads each view lazily; the Bassline view is also opened from `src/client/ui/JailHud.tsx`.

## Games

| Folder       | The game                                                                                                                                                    | Entry file      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `bassline/`  | Bassline: the DJ booth rhythm game at Pulse, notes falling down four lanes (also has a procedural backing mixer, `mixer.ts`).                               | `Bassline.tsx`  |
| `gemGlam/`   | Gem Glam: the arcade's match-three with sparkle and disco gems.                                                                                             | `GemGlam.tsx`   |
| `lastCall/`  | Last Call: the bartending game; pour, pick the glass and garnish, time the shake and serve. Labels and menu change by age tier (teens get a mocktail menu). | `LastCall.tsx`  |
| `midway/`    | The Midway: four carnival booths (whack-a-mole, shooting gallery, water-gun race, ring toss).                                                               | `Midway.tsx`    |
| `starSiege/` | Star Siege: the arcade bar's alien invasion shooter, drawn on a canvas.                                                                                     | `StarSiege.tsx` |
| `trivia/`    | Throwback Trivia: ten 2000s pop-culture questions on a clock, with a handwritten host (`host.ts`) and question bank (`questions.ts`).                       | `Trivia.tsx`    |

## Files

| File                       | What it does                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dialog.tsx`, `Dialog.css` | The modal frame every minigame opens in, on the native `<dialog>`: focus is trapped, the page behind is inert and Escape closes it. The CSS holds the shared theme. |
| `fixture.tsx`              | A standalone test bench that opens Bassline and Last Call without the 3D world; reads `?adult=1` and `?muted`.                                                      |

## Notes

- Every game folder holds `<Game>.tsx` and `<Game>.css` (the view) and `engine.ts` (+ `engine.test.ts`); the engines are pure, with no DOM or audio.
- Last Call picks its content by age tier (`src/game/age.ts`); keep adult content behind `ADULT_OK`.
- Payouts: `src/game/wallet.ts` maps a grade to its base coins. For Gem Glam and the other prize-desk games, `src/game/prizes.ts` turns the score into that grade (`gradeFor`) and adds the personal-best bonus.
