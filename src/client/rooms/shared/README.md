# src/client/rooms/shared

Pieces shared by many rooms: the floor, portals, batching helpers, neon, crowds and NPCs, props and food. They are built to keep rooms inside the low-tier budget (static geometry batched per material, repeated pieces instanced). Room data (portals, pads, NPCs) comes from `src/game/rooms.ts` and friends. Used by every scene in [`../`](../README.md).

## Files

### Room frame and interaction

| File                | What it does                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Floor.tsx`         | The walkable floor: turns a click into a walk order; mirrored with `MeshReflectorMaterial` when reflections are on |
| `PortalPads.tsx`    | The breathing floor ring at every portal, placed from the room's portal data                                       |
| `GamePad.tsx`       | The glowing floor ring that opens a minigame when tapped                                                           |
| `AssetBoundary.tsx` | Error boundary for a model or image that fails to load (Suspense covers only the wait)                             |
| `store.ts`          | A tiny module-level store: `get` for frame loops, `use` for components                                             |
| `useNow.ts`         | `performance.now()` re-read each frame for panels with live meters                                                 |

### Batching, materials and lighting

| File                                     | What it does                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `batch.ts` (+ `batch.test.ts`)           | Static-geometry batching: collect posed pieces by material and merge each material into one mesh |
| `place.ts`                               | Local frames for `Batch`: author a piece around its own origin, bake it into room space          |
| `materials.ts`                           | Materials and helpers shared by every room so pieces batch into one draw call                    |
| `details.ts`                             | Small set dressing (posters, plants, condiments) added to a room's batch                         |
| `blacklight.ts` (+ `blacklight.test.ts`) | The UV night's blacklight as one patch for every lit material                                    |
| `HdriLight.tsx`                          | Image-based lighting from a Poly Haven HDRI, high tier only                                      |
| `Beams.tsx`                              | Additive shader cones faking volumetric club light beams                                         |
| `Sparkles.tsx`                           | drei's Sparkles with the shader patched so a center pixel cannot blow out through bloom          |
| `nightSprites.ts`                        | Sprite pictures and cheap per-index random draws shared by the night decor and signatures        |

### Signs, screens and art

| File             | What it does                                                                        |
| ---------------- | ----------------------------------------------------------------------------------- |
| `Neon.tsx`       | Neon tubes, canvas-drawn lettering and ring signs                                   |
| `Arch.tsx`       | A carnival entrance arch with a marquee neon sign                                   |
| `Jumbotron.tsx`  | A big screen with a title and up to three lines; redrawn only when the text changes |
| `LedFloor.tsx`   | A pulsing LED dance floor, instanced in four phase groups                           |
| `ImagePiece.tsx` | A painting fitted to its slot by the image's own aspect                             |
| `artTexture.ts`  | Painting images as sRGB textures, cached per URL                                    |

### People

| File              | What it does                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `TalkingNpc.tsx`  | The standard talking NPC: a doll or a cheap `CrowdFigure`, a tap target and a speech bubble |
| `CrowdFigure.tsx` | A background doll for club crowds, dancing or idling                                        |
| `useCrowdMove.ts` | The move a venue's dancer is doing right now                                                |
| `ChatGroup.tsx`   | A standing conversation of two to four dolls                                                |
| `VenueChats.tsx`  | A venue's standing conversations from `game/chatSpots.ts`                                   |
| `Opponent.tsx`    | One Paintball or Laser Tag opponent in a team kit                                           |
| `Stands.tsx`      | Bleachers with their crowds, shared by the arenas                                           |
| `TriviaHost.tsx`  | Trivia night's host and floor pad while the night is on                                     |

### Props, food and sessions

| File                                | What it does                                                             |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `Prop.tsx`                          | Loads a generated prop from `public/models/props/` and fits it to a size |
| `Palm.tsx`                          | A potted palm (about a dozen draw calls; use a batched one for many)     |
| `BarStools.tsx`                     | Bar stools batched per part                                              |
| `Bottles.tsx`                       | The back bar's bottles merged into four draw calls                       |
| `Cocktail.tsx`                      | A small decorative cocktail                                              |
| `VendingMachines.tsx`               | The vending machines standing in a venue                                 |
| `Bakes.tsx`                         | Baked goods from Pasha's CC-BY Bakery pack                               |
| `Dishes.tsx`                        | Filipino dishes from the Meshy food sets on a counter or table           |
| `PlatedFood.tsx`                    | Instanced place settings                                                 |
| `Fishing.tsx`                       | Fishing presentation shared by the marina and boardwalk pier             |
| `beachProps.ts`                     | Sun bed, umbrellas and towel cut from the beach diorama                  |
| `OrderPanel.tsx`, `orderSession.ts` | The panel and session shared by the order stations (espresso, boba)      |
| `routineSession.ts`                 | The session for a judged routine on a clock (gym floor, ice show)        |

## Subfolders

- [`game3d/`](game3d/README.md): the kit for in-world games.
