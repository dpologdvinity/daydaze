# Plan: the real-world pass (2026-10-26)

**Why:** the owner's second round of play-test notes, after the deploy-gate
pass (`docs/plans/2026-10-26-deploy-gate.md`):

- "the characters still walk weird. use more of the mixamo animations and
  poses."
- "the map is so many buildings that all look the same ... this looks like
  las vegas when it needs to look more like the boardwalk in ocean city, md.
  or like nyc." They want grass, trees and outdoor places.
- "everything is still too smooth. u cant see any texture from a distance.
  this city has no personality. it looks like legos."
- New working rule (CLAUDE.md): before building anything in 3D, search the
  internet for it; download and adapt a good free one instead of making it
  from scratch. Record every asset's source and license.

This plan outranks the remaining wonder-pass tasks. Never deploy. Each task
ends with before/after screenshots or numbers, `npm run verify` green, the
browser tests it touches green, and a push to `origin main`.

## Research behind it (2026-10-26)

- The walk's root cause is the rig: the doll drives 13 joints (no hips
  chain, spine, neck or clavicles), so clips lose the pelvis rotation and the
  counter-rotating torso that make a walk read as human. Natural walks need a
  full humanoid skeleton playing the clips directly (three.js AnimationMixer),
  in place, with playback matched to ground speed and idle↔walk blending.
- "Texture from a distance" comes from tiling breakup (hex/stochastic
  sampling), macro variation and grime, per-instance color and wear, fake
  ambient occlusion at street level and on edges, and atmospheric fog. Those
  cost no draw calls.
- "All the same / Las Vegas" comes from one box per building with neon
  everywhere. NYC and boardwalk character come from cornices, stoops, fire
  escapes, awnings and storefronts, varied heights, street trees and parks,
  daylight, and neon only where the clubs are.
- CC0 sources: Quaternius Downtown City MegaKit (NYC/Boston-style modular
  facades, glTF), Quaternius Stylized Nature MegaKit and Ultimate Stylized
  Nature (trees, palms), Kenney city/coaster/nature kits (props), ambientCG
  and Poly Haven (PBR, HDRIs). CC-BY options (brownstone set, a boardwalk, a
  Ferris wheel) need an in-game credits screen.

## Tasks

### 1. Bodies with a full skeleton

Find downloadable rigged bodies (research in progress: Microsoft Rocketbox,
Quaternius base characters, MakeHuman with a game-engine rig, Mixamo
characters and more). Pick separate female and male bodies with a
Mixamo-compatible skeleton, refit our hair, outfits and shoes (or adopt
theirs), keep the face painting, closet sliders and shape keys where
possible.

### 2. Walks, idles and poses straight from Mixamo

Play the Mixamo clips on the full skeleton with AnimationMixer: several
walk styles per body, idle variants (breathing, weight shift, look around,
bored), talking and laughing gestures, sitting, leaning, the dance set.
In-place clips, playback matched to ground speed (clamped about 0.8-1.25x),
smooth idle↔walk blends and turning. NPCs pick idles and gestures so the
crowd has personality.

### 3. Texture that reads at a distance

Tiling breakup and macro grime in the shared surface shader, per-instance
color/wear/window seeds, height-gradient and edge darkening, contact
shadows at wall bases, fog toward the sky color.

### 4. A city with personality: NYC blocks and an Ocean City boardwalk

Replace the box buildings with downloaded modular facades (brownstones with
stoops, walk-ups with fire escapes, storefronts with awnings, corner shops,
a few towers), varied heights and materials per block. Daylight with a
warm sun and a sky, neon kept to Nightlife Row. A wooden boardwalk along the
beach: planks, railings, rides, piers, food stands, palms.

### 5. Grass, trees and outdoor places

Downloaded trees on every street (instanced, impostors far off), lawns
with instanced grass near the camera, a large park with paths, benches,
a fountain and a pond; planters and street furniture.

### 6. Credits

A credits screen listing every CC-BY asset and its author, linked from the
menu; the asset list with sources and licenses kept in `docs/assets.md`.

## Progress (2026-10-26)

- Done: men and women are separate dolls (58b2b12); texture tiling breakup
  and wall weathering (0e1c8e1); day/night cycle on the player's clock, neon
  only on nightlife buildings, real asphalt and concrete, stone cornices
  (499aa09, owner chose "day/night cycle").
- In progress: Task 1-2, a full 52-bone Mixamo rig from MPFB2 (CC0,
  `rig.mixamo.json` / `weights.mixamo.json`) on the MakeHuman bodies, clips
  baked from `mixamo/` and played with AnimationMixer — being built on branch
  `feat/mixamo-rig` in a worktree (research: Rocketbox has baked-in clothes,
  Quaternius free bodies are superhero-proportioned; MPFB2 rig keeps our
  closet). Merge it after verify + doll browser tests.
- The Quaternius Downtown City MegaKit (Standard, CC0) is downloaded:
  `C:\Users\mango\Downloads\Downtown City MegaKit[Standard].zip` (WSL
  `/mnt/c/Users/mango/Downloads/`), unpacked to `/tmp/daydaze-city/megakit/`
  (re-unzip if /tmp was cleared): 153 glTF pieces in `Exports/glTF (Godot)`
  (89 MB) plus shared `Textures/` (142 MB) — brick and stone facade modules,
  columns, cornices, windows, doors, storefronts, roads, sidewalks and three
  prebuilt buildings. Optimize what we use with gltf-transform before it
  enters `public/`.
- Next: remaining purple night palette by day (parking lines, lane strips,
  the far skyline backdrop); street trees and lawns (EZ-Tree / Quaternius
  nature, InstancedMesh2, impostors far off); the park; the boardwalk
  district; NYC facades from the MegaKit; credits screen and `docs/assets.md`.
- Useful finds: InstancedMesh2 (MIT) for culling/LOD of trees and crowds;
  agargaro octahedral impostors (MIT); EZ-Tree (MIT); Takram three-geospatial
  sky (MIT); Gobkit (CC0); Physically Based for material values. The
  Three.js Resources MCP is configured at project scope (`.mcp.json`).
- Known: the city overview at noon draws 302k triangles on low (budget 300k);
  the street view 282k.
