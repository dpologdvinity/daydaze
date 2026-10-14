# Prototypes

Throwaway visual spikes from 2026-10-14, kept as reference. They are not built or tested by this repo's scripts.

- `3d-lounge/`: the IMVU-style 3D neon lounge with a code-built doll avatar (React Three Fiber). This direction was chosen. The real client ports and cleans this code; see `docs/specs/2026-10-14-3d-client-foundation-design.md`.
- `2d-lounge/`: the Club Penguin / Fantage-style 2D version of the same lounge, built on the layered 2D doll art. Not chosen: it was polished, but felt too flat. `screenshots/` shows how it looked.

Both were built inside the Club Lion repo as separate Vite pages (`spike.html`, `spike2d.html`), so their import paths assume that layout.

## 2D lounge notes (from its builder)

- Strongest: the painted doll heads, and the head-to-body join is seamless.
- Weakest: the drawn vector body and outfits look like a paper doll under a painted head. Hands are mitten shapes, and poses are stiff.
- Performance: about 60 composited layers. Cheap on a real GPU, but slow on machines without GPU compositing.
