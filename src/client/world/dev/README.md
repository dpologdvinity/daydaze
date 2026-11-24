# src/client/world/dev

The dev panel (press `` ` `` in development). It is dev-only: `../DevTools.tsx` loads it through `import.meta.env.DEV` dynamic imports so production never ships it. Every control and handle is documented in `docs/dev-tools.md`.

## Files

| File                                   | What it does                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DevPanel.tsx`                         | The panel itself, outside the Canvas: live readouts on a draggable header, then fold-away sections                            |
| `DevProbe.tsx`                         | The panel's half inside the Canvas: samples `gl.info`, applies the view switches (wireframe, grid, half res, pause, free cam) |
| `RenderSection.tsx`                    | Render controls: exposure, fog, field of view and a switch and intensity per light                                            |
| `Inspector.tsx`                        | What shift+click (or the scene tree) selected, with transform, visibility and first material editable                         |
| `SceneTree.tsx`                        | The live scene graph, folded by default, with a search over names and types                                                   |
| `widgets.tsx`                          | Small building blocks: a fold-away section, a dropdown, the hour format                                                       |
| `store.ts` (+ `store.test.ts`)         | The shared state that carries readouts and switches between the Canvas and the DOM panel                                      |
| `sceneUtil.ts` (+ `sceneUtil.test.ts`) | Scene walks: wireframe on every material, object and light counts, a picked object's world box                                |
| `transform.ts` (+ `transform.test.ts`) | Reads and writes the selection's transform, for an object or one instance of an instanced mesh                                |
