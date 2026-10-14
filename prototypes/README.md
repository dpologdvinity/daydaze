# Prototypes

Throwaway visual spikes from 2026-10-14, kept as reference. They are not built or tested by this repo's scripts.

- `3d-lounge/`: the IMVU-style 3D neon lounge with a code-built doll avatar (React Three Fiber). This direction was chosen. The real client ports and cleans this code; see `docs/specs/2026-10-14-3d-client-foundation-design.md`.
- `2d-lounge/`: the Club Penguin / Fantage-style 2D version of the same lounge, built on the layered 2D doll art. Not chosen: it was polished, but felt too flat. `screenshots/` shows how it looked.

Both were built inside the Club Lion repo as separate Vite pages (`spike.html`, `spike2d.html`), so their import paths assume that layout.
