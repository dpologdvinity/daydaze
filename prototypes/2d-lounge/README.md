# prototypes/2d-lounge/

The 2D (Club Penguin style) version of the Mango Lounge spike. It was not chosen; background and verdict are in [`../README.md`](../README.md). Not built or tested by this repo's scripts.

| Path                                | What it is                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `spike2d.html`                      | Vite page entry. Its script path (`/src/spike2d/main.tsx`) assumes the original Club Lion layout, so it does not resolve here.          |
| `src/main.tsx`, `src/Lounge.tsx`    | React entry and the lounge scene: movement, sitting, look picker.                                                                       |
| `src/Room.tsx`                      | The room as SVG layers in a 1600x900 stage space.                                                                                       |
| `src/Doll.tsx`, `src/dollShapes.ts` | The doll: painted head and bust layers over a drawn vector body, in the 1024px template space.                                          |
| `src/looks.ts`, `src/tones.json`    | Look types and the skin-tone table.                                                                                                     |
| `src/prep-assets.mjs`               | One-off script (uses `sharp`) that recolors the golden bust into skin tones and downsizes every layer to 512 px into `public/spike2d/`. |
| `src/spike2d.css`                   | Styles.                                                                                                                                 |
| `public/spike2d/`                   | Prepared 2D layers: heads per skin tone, hair, hoops, brows, lips.                                                                      |
| `screenshots/`                      | How the spike looked at desktop and mobile widths, with doll close-ups.                                                                 |

The 2D art it uses comes from [`art/doll/`](../../art/doll/README.md).
