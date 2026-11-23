# src/client/avatar/human

The 3D human doll: a skinned glTF body (built by `art/doll/blender/`) driven by a `Look` from `src/game/look.ts`. `HumanDoll.tsx` is mounted by [`../Doll.tsx`](../README.md); the rest are its accessories, motion and caching.

## Files

| File                                           | What it does                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `HumanDoll.tsx`                                | Loads the body, then drives clips, face makeup, shoes, piercings and prosthetics from the `Look` and the current mood              |
| `anims.ts`                                     | The doll's motion: Mixamo clips baked onto her 52-bone skeleton (`public/models/doll/anims.glb`, `anims-m.glb`)                    |
| `afloat.ts`                                    | Whether the player's own doll is out of her depth; `HumanDoll` then plays swim strokes in place of a walk                          |
| `faceCanvas.ts`                                | The face texture: makeup, brows and beard strokes drawn on a canvas along landmarks baked into the model                           |
| `Glasses.tsx`                                  | Procedural round, cat-eye or square glasses at the nose anchor, parented to the head bone                                          |
| `HearingAids.tsx`                              | Behind-the-ear hearing aids, built like the glasses                                                                                |
| `Jewelry.tsx`                                  | Piercing studs and rings at the piercing anchors baked into the model                                                              |
| `Prosthetics.tsx`                              | Leg prostheses: swaps a shin's skin for a pylon and ankle adapter                                                                  |
| `ScubaGear.tsx`                                | Rented scuba tank and mask parented to the bones                                                                                   |
| `mergeGarments.ts` (+ `mergeGarments.test.ts`) | Merges a far doll's garment twins into one skinned, atlas-textured mesh, so mix-and-match clothes cost one draw call at a distance |
| `refCache.ts` (+ `refCache.test.ts`)           | A reference-counted cache with a keep-alive list for costly things such as painted face textures                                   |
| `dollReady.ts` (+ `dollReady.test.ts`)         | Readiness check for hair, outfit and footwear, used for rendering and capture synchronization                                      |
| `bodyAssets.test.ts`                           | Checks that rebuilt dolls expose the editor's real controls and load neutral                                                       |

## Notes

- Shared glasses and hearing-aid materials are module-wide and never disposed; geometry is disposed on unmount.
- Doll count on screen drives the draw-call budget: far dolls use the merged-garment path.
