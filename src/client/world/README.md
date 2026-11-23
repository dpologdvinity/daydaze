# src/client/world

The 3D world shell: `World.tsx` picks the current room's scene (lazy-loaded), warms its shaders and mounts the player, camera and post effects. The rest is the player's movement, camera and the small shared stores the scene, HUD and audio read. Movement rules are in `src/game/` (`walker.ts`, `reactions.ts`).

## Files

| File                                           | What it does                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `World.tsx`                                    | Picks the room scene, warms shaders, mounts player, camera and effects                                            |
| `PlayerController.tsx`                         | Moves the player's doll: taps and keys feed a fixed-step walker and the drawn pose is interpolated                |
| `CameraRig.tsx`                                | Camera framing and orbit controls, including the city's arrival composition                                       |
| `CreatorFrame.tsx`                             | Slides the picture while the character creator covers the screen                                                  |
| `Effects.tsx`                                  | The post stack (bloom, ambient occlusion, tone mapping), its own chunk so low tier never downloads postprocessing |
| `NeonClamp.tsx`                                | Low-tier fix: rescales unlit colors brighter than 1.0 each frame so neon keeps its hue without bloom              |
| `Confetti.tsx`                                 | A confetti burst when the prize desk posts a prize; one instanced mesh with preallocated buffers                  |
| `Photo.tsx`                                    | The photo button's snapshot, tagged with the place name                                                           |
| `Seats.tsx`                                    | Walks the player to the nearest or tapped seat and plays the sit-down clip                                        |
| `Butterflies.tsx`                              | Instanced decimated monarchs over a place's flocks                                                                |
| `DevTools.tsx`                                 | Dev-only hook-up for the panel in [`dev/`](dev/README.md)                                                         |
| `quality.ts`                                   | Render quality as React context: content tier and the advanced switches                                           |
| `view.ts`                                      | Camera view framing modes                                                                                         |
| `camOverride.ts` (+ `camOverride.test.ts`)     | Live override of the overview camera framing (`?cam=`, `__dd`, dev panel)                                         |
| `cameraHold.ts`                                | Set while a room drives the camera itself (a bowling lane's shot)                                                 |
| `compileGate.ts` (+ `compileGate.test.ts`)     | Decides when to compile shaders for content that streamed into a room                                             |
| `ready.ts` (+ `ready.test.ts`)                 | Whether the room has finished compiling shaders; the loading veil waits on it                                     |
| `fps.ts`                                       | The measured frame rate and tier in force, read by the Graphics menu                                              |
| `dataset.ts`                                   | Writes a `data-*` attribute only when its value changed, so frame loops do not churn the DOM                      |
| `bakedGeometry.ts` (+ `bakedGeometry.test.ts`) | Float copies of glTF geometry for meshopt-quantized models, with node transforms baked in                         |
| `guards.ts` (+ `guards.test.ts`)               | Type guards for three.js scene-graph nodes (avoids `instanceof` narrowing to `Mesh<any, any>`)                    |
| `joystick.ts`                                  | Touch joystick input in the same frame as the keys                                                                |
| `keyTargets.ts`                                | True when a key press belongs to a dialog or text field rather than the game                                      |
| `jump.ts`                                      | The player's jump (Space in the city)                                                                             |
| `reaction.ts` (+ `reaction.test.ts`)           | The reaction the doll is playing (flinch, trip, hard landing)                                                     |
| `heat.ts`                                      | The player's shared wanted state and the HUD's pursuit status                                                     |
| `driving.ts`                                   | The Speedway controls' requests for the scene's next frame                                                        |
| `skates.ts`                                    | Where skates can go on and how much faster she rolls                                                              |
| `water.ts`                                     | The rooms where the player is in the sea: depth, diving, afloat                                                   |
| `submerged.ts`                                 | Whether the player is under water, which swaps in the muffled ambience                                            |
| `playerSpot.ts`                                | Where the player stands, copied each frame for panels outside the canvas                                          |

## Subfolders

- [`dev/`](dev/README.md): the dev-only panel, inspector and scene tree.

## Notes

- Frame loops here must not allocate: see the render rules in `AGENTS.md`.
