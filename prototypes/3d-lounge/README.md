# prototypes/3d-lounge/

The 3D neon lounge spike (React Three Fiber) with a code-built doll. This direction was chosen; the real client ports and cleans this code. Background is in [`../README.md`](../README.md). Not built or tested by this repo's scripts.

| Path                                  | What it is                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `spike.html`                          | Vite page entry. Its script path (`/src/spike/main.tsx`) assumes the original Club Lion layout, so it does not resolve here. |
| `src/main.tsx`                        | Canvas, camera, orbit controls and post-processing (bloom, SMAA, vignette).                                                  |
| `src/Lounge.tsx`                      | The room: reflective floor, lighting and props.                                                                              |
| `src/Doll.tsx`, `src/dollGeometry.ts` | The doll, sculpted in code from the 2D template outline (lathe and lumpy geometry, hair).                                    |
| `src/faceTexture.ts`                  | Face canvas where brows and lips are painted onto a planar-projected head.                                                   |
| `src/looks.ts`, `src/ui.tsx`          | Look options (skin, hair, lips, brows, outfit) and the picker UI.                                                            |
| `src/toon.ts`                         | Four-step toon gradient map.                                                                                                 |
| `src/flags.ts`                        | Profiling toggles read from the URL, for example `spike.html?off=reflector,bloom,npcs`.                                      |
| `public/`                             | Face template and the brow and lip images the face texture uses.                                                             |
| `ui-only-headless.png`                | A headless screenshot of the UI.                                                                                             |
