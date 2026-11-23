# src/client

The Vite + React Three Fiber app. `main.tsx` mounts `App.tsx`, which owns the save, the current room and the HUD. Keep this folder thin: it draws and wires things up, while the rules live in [`../game/`](../game/README.md), the protocol in [`../net/`](../net/README.md) and sound in [`../audio/`](../audio/README.md).

## Files

| File                                     | What it does                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `main.tsx`                               | Entry point; imports `adult.ts` first so the content tier is set before tier-dependent data builds                        |
| `App.tsx`                                | The root: save (in `localStorage`), room and travel fades, chat bubbles, arrests and jail, payouts, and the online panels |
| `adult.ts`                               | The age-tier switch: `ADULT_OK` gates every 18+ venue and effect; only a dev build with `?adult=1` runs the adult tier    |
| `flags.ts` (+ `flags.test.ts`)           | Parses URL flags (`?quality`, `?still`, `?debug`, `?room`, `?view`, `?at`, `?spot`, `?adult`...) into typed values        |
| `timeScale.ts`                           | `?timescale=` slows the player and every doll, for frame strips on a slow renderer (development)                          |
| `motion.ts`                              | The `prefers-reduced-motion` setting as a hook and a context for components inside the Canvas                             |
| `canvas.ts`                              | Creates offscreen 2D canvases for painted textures                                                                        |
| `RoomAudio.tsx`                          | Picks and runs the sound for wherever the player is: jukebox track, ambience bed, click and unlock hooks                  |
| `musicPick.ts`                           | The record the player picked to hear, shared by the record panels and `RoomAudio`                                         |
| `albumSnaps.ts` (+ `albumSnaps.test.ts`) | The photo album's thumbnails, newest first, kept in `localStorage` and validated on load                                  |
| `streakCheckIn.ts`                       | Opening the game on a new day counts toward the daily streak; loaded on demand                                            |
| `serviceWorker.ts`                       | Registers `public/sw.js` in production and tracks a waiting update (development never registers it)                       |
| `styles.css`                             | Global styles                                                                                                             |

## Subfolders

| Folder                              | What it holds                                                              |
| ----------------------------------- | -------------------------------------------------------------------------- |
| [`world/`](world/README.md)         | The 3D world shell: player, camera, post effects, shared stores, dev panel |
| [`city/`](city/README.md)           | The open city: streets, transit, traffic, parks, beach, events             |
| [`rooms/`](rooms/README.md)         | One scene per room, plus the shared room kit                               |
| [`avatar/`](avatar/README.md)       | The player and NPC dolls (`avatar/human/` is the 3D doll)                  |
| [`creatures/`](creatures/README.md) | Animated animals and pets                                                  |
| [`effects/`](effects/README.md)     | Buzz and high state and their screen effects (18+)                         |
| [`food/`](food/README.md)           | The held food and delivery orders                                          |
| [`inventory/`](inventory/README.md) | Weed counters and the pouch (18+)                                          |
| [`vending/`](vending/README.md)     | Soda vending machine menu and proximity                                    |
| [`ui/`](ui/README.md)               | The HUD and panels over the canvas (`ui/phone/` is the delivery app)       |
| [`net/`](net/README.md)             | The online UI and client-side stores                                       |

## Notes

- Dev-only code (the dev panel, `net/devNetLog.ts`) stays behind `import.meta.env.DEV` so production never ships it; the doll and game-kit labs are separate HTML entries not linked from the game.
- Low-tier render budget: under 250 draw calls, under 300k triangles, at most 4 real lights; allocate nothing inside `useFrame`.
