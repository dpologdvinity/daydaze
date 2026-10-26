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
- Also downloaded by the owner (CC0, Quaternius, Standard): `Stylized Nature
  MegaKit[Standard].zip` (68 glTF trees, bushes, grass, flowers, rocks;
  unpacked to `/tmp/daydaze-city/Stylized_Nature_MegaKit_Standard__zip/`) and
  `Universal Animation Library[Standard].zip` (unpacked to
  `/tmp/daydaze-city/Universal_Animation_Library_Standard__zi/`), both in
  `C:\Users\mango\Downloads`.
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

## Asset map (owner's downloads, all CC0 Quaternius unless noted)

Zips live in `C:\Users\mango\Downloads` (`/mnt/c/Users/mango/Downloads`),
unpacked under `/tmp/daydaze-city/` (`megakit/`, `q/<pack>/`, `kenney/`;
re-unzip if /tmp was cleared). Older packs are FBX only: convert with Blender
(`blender --background --python` import FBX → export glTF), then
gltf-transform. Every model gets the house look: our palette, the box-mapped
tiling breakup and weathering (`boxMapped` with `weather`), day/night dimming,
merged and instanced per kind. Record each in `docs/assets.md`.

| Pack | Where it goes |
|---|---|
| Downtown City MegaKit (153 glTF) | NYC blocks in Downtown, Uptown and the Arts District: brick and stone walk-ups, cornices, fire escapes, storefronts with awnings, doors and stoops; replaces the box buildings there |
| Ultimate Textured Building Pack, Buildings Packs 2017/2019 | variety elsewhere: Suburbia houses, Little Manila and Chinatown shophouses, Beachside pastel motels (Ocean City) |
| Street Pack, Kenney City Kit Roads | street furniture everywhere: lamps, hydrants, benches, bins, traffic lights, signs, bus stops, mailboxes |
| Stylized Nature MegaKit, Ultimate Stylized Nature, Ultimate Nature, Textured Stylized Trees | street trees on every block, the park (lawns, paths, pond, flower beds), beach palms and dune grass, planters |
| Nature Crops | a community garden and the farmers market; Skyline Supply produce |
| Public Transport, Realistic Car Pack | traffic variety (buses, taxis, vans, sedans) next to our lofted cars |
| Train Pack | an elevated train (the "El") with stations, as a ride and fast travel |
| Ships | the Marina and harbor boats, the Mermaid Cove boat |
| Furniture Packs, Ultimate House Interior | the apartment furniture catalog; café, bookshop, bar and lounge interiors |
| Ultimate Food, Junk Food | boardwalk food stands (fries, taffy, pizza, corn dogs), dishes in hand from Plate Rush, restaurant tables, grocery shelves |
| Sushi Restaurant Kit (117 glTF) | rebuild Belt Sushi Yard and the ramen shop |
| Animated Fish, Cute Fish | the Aquarium tanks, Mermaid Cove, fishing at the Marina |
| Ultimate Animated Animals | the Zoo's animals; dogs being walked, pigeons and squirrels in the park |
| Universal Base Characters | its 20 rigged hairstyles as new closet hair (refit to our head); body reference |
| Universal Animation Library 1 and 2 | more clips baked onto our Mixamo skeleton (idles, sits, emotes, sports) |
| Sci-Fi Essentials | Photon Zone (laser tag) and Player 2 (arcade bar) props |
| Kenney Coaster Kit, City Kits Commercial/Suburban | the Fairground's coaster and rides; filler props |

## New ideas (to build as this pass goes, or next)

- Ride the El across the city (fast travel with a view), and hail a taxi.
- A dog park and dog walking: adopt a pet (Zoo animals pack), take it out.
- The boardwalk: a Ferris wheel, a tram along the planks, food stands with
  real menus (Plate Rush), arcade games, a fishing pier.
- Central park: picnic blankets, a pond with rowboats (Ships pack), a band
  shell for club-night pop-ups by day.
- Street vendors: hot dog and pretzel carts, a halal cart, an ice-cream truck
  that drives a route (Public Transport + Food packs).
- A farmers market on weekends (Crops pack), the community garden to tend.
- Seasonal dressing: holiday lights and trees, summer umbrellas on the beach.
- Bus stops with routes that NPCs ride; buses that stop for players.

## Owner's ideas (2026-10-26, while downloading the packs)

Each builds on what exists where it can; packs from the asset map above.

| Idea | Builds on | Packs |
|---|---|---|
| Fishing | Starboard Marina's fishing game | Animated Fish, Cute Fish, Ships |
| Oceans and beaches with fish and animals | Beachside, the Ocean, Mermaid Cove | Cute Fish, Animated Animals (crabs, gulls, dolphins if present) |
| Swimming in the ocean with the fish | the water park's swim state, the Ocean | Cute Fish, Animated Fish |
| Scuba diving | Mermaid Cove, the Aquarium's reef | fish packs, Ultimate Nature (corals/rocks) |
| Pets | new: adopt at the Zoo or a shelter, follows you, lives at home | Ultimate Animated Animals |
| Zoos | the Daydaze Zoo (swap procedural animals for animated ones) | Ultimate Animated Animals |
| Parks and forests | new: a central park and a forest trail at the city's edge | Stylized Nature MegaKit, Ultimate Nature, Textured Stylized Trees |
| Sci-fi places | Photon Zone, Player 2; new: a space-station club or museum | Sci-Fi Essentials |
| Ships, boats, yachts | the Marina; new: rentable boats, a yacht party venue | Ships |
| Public transportation | new: buses and stops, taxis | Public Transport |
| Trains | new: the El across the city, a boardwalk train | Train Pack |
| NASCAR race tracks | the Speedway (add a stock-car oval, pit crew, grandstand crowd) | Realistic Car Pack |
| Farms | new: a farm at the city's edge (crops, animals, farm stand), feeding the farmers market | Nature Crops, Animated Animals |

## Handoff (2026-10-26, before a context compaction)

- **Uncommitted on main (street trees, work in progress):**
  `src/game/city/plan.ts` + `plan.test.ts` (TreeSpot / `plan.trees`,
  `TREE_VARIANTS`; tests green), `src/client/city/CityTrees.tsx` + its use in
  `CityScene.tsx`, `scripts/import-nature.sh`, `art/nature/nature_lod.py`,
  `public/models/nature/*.glb`. Problem being fixed: the city-day shot hit
  410745 tris on low because the kit's trees are 3.5-6.3k tris each and
  gltf-transform simplify can't merge leaf cards. Fix in progress:
  `nature_lod.py` (Blender: decimate bark through a vertex group, keep 1 leaf
  card in 3 grown 1.45x for the -lo twin; env KEEP/GROW/SOLID_RATIO; near
  model KEEP=1 GROW=1 SOLID_RATIO=0.35). Tested on CommonTree_1: 6265 → 1507
  tris for -lo. Next: make the env overrides, rerun import-nature.sh for both
  levels, re-shoot city-day (target < 300k low), verify, commit.
- **Mixamo rig branch** `feat/mixamo-rig` (worktree
  `.claude/worktrees/agent-a5242a3cc45607159`, rebased on main at 3ec904d):
  52-bone MPFB2 rig, 78 baked Mixamo clips in `anims.glb`, AnimationMixer
  playback; verify green. NOT merged: walks look like jogging (back heel kicks
  to the hip; knee flex over-rotated in the retarget). The agent was stopped
  mid-diagnosis; resume by comparing per-frame knee flex / thigh pitch of the
  source FBX vs our baked rig for Walk_Female-Walk, fix the bake, re-render
  docs/screenshots/doll-walk.png with a source-armature strip, re-verify,
  then merge (squash the first commit if each must be green).
- Asset sources other than CC0 packs: Unity Asset Store (owner downloads;
  check each EULA), freegameassets.com, itch.io free 3D, Sketchfab (per-asset
  license; CC-BY needs credits).
