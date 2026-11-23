# src/client/avatar

How the player and NPC dolls are drawn. `Doll.tsx` is the entry point used by the world, rooms and online peers: it shows the Blender-built 3D doll from [`human/`](human/README.md) and falls back to the older procedural toon doll in this folder while models load. The look data and wardrobe rules are in `src/game/` (`look.ts`, `wardrobe`, `dance/`).

## Files

| File                        | What it does                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Doll.tsx`                  | The player and NPC doll: the 3D doll with `ToonDoll` (toon materials, painted face, pose animation, distance LOD) as the loading fallback |
| `Couple.tsx`                | Two dolls dancing one move as a couple, placed either side of a center point                                                              |
| `DressingStudio.tsx`        | A private preview scene inside the existing canvas for the dressing room; the world stays mounted underneath                              |
| `dollGeometry.ts`           | Geometry helpers for the toon doll: head outline, lathe and lumpy-blob builders, hair shapes, merged into few meshes                      |
| `dollParts.ts`              | The toon doll's shared body parts (hand, nails, torso profile) and materials, built once                                                  |
| `faceTexture.ts`            | Paints the toon doll's face onto a canvas texture from the PNG feature art, tinted to the look                                            |
| `toon.ts`                   | The shared 4-step gradient map, hair sway clock and toon material with a fresnel rim                                                      |
| `pose.ts`                   | Sets the toon rig's joint rotations each frame from mood, gait and dance pose. Called from `useFrame`, so it must not allocate            |
| `danceClock.ts`             | The clock dancers share: the club's beat clock while music plays, the wall clock otherwise                                                |
| `pairClock.ts`              | The wall-seconds clock a pair's timed moves (the kisses) run on, so both partners move together                                           |
| `lineup.html`, `lineup.tsx` | Dev-only doll lab, not linked from the game: `lineup.html?shot=face`, `body`, `lineup` or `far` on the dev server                         |

## Subfolders

- [`human/`](human/README.md): the skinned glTF human doll, its clips, accessories and caches.
