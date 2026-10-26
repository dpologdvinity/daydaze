# Plan: the deploy gate (2026-10-26)

**Why:** the owner's play-test verdict on 2026-10-26: "this is not good
enough to deploy yet." This plan fixes their list, item by item. It outranks
the remaining wonder-pass tasks (36-41, 43), which resume after it.

**Run with** `superpowers:executing-plans` on `main`. Ledger:
`.superpowers/sdd/2026-10-26-deploy-gate/progress.md`. Every task ends with
before/after evidence (screenshots under `docs/screenshots/`, numbers in the
ledger and the commit message), `npm run verify` green, the Playwright tests
it touches green, Conventional Commits, push to `origin main`. Never deploy.
Don't edit `src/` while an online test runs on the dev server.

## Global constraints

- The low-tier budget still holds: < 250 draw calls, < 300k triangles,
  at most 4 real lights (`data-calls` / `data-triangles` on the canvas).
- TDD for every rule that can live in `src/game/` (pure); the client stays
  thin.
- Look at every screenshot before committing it.
- Old saves keep loading: any new `Look` or save field is optional and
  validated.

## Order

Quick, certain wins first, so the owner sees progress early; the big art
jobs (bodies, men, cars) follow; content (events, songs) last.

### Task 1: Zoom in on your own character

**Finding:** in the "Room" view the orbit target sits at the room shot's
look point (in the city, about 255 m from the player) and is only moved
along with her; the wheel dollies toward that point, never toward her
(`src/client/world/CameraRig.tsx`).

- Pure rule (`src/game/camera.ts` or the existing camera module): a
  "follow" target that is the player's chest, and a zoom range per room from
  about 1.2 m (face fills the screen) up to the room's max.
- Wheel and pinch zoom toward the player in every view; zooming all the way
  in hands over to the Face shot, all the way out to Room.
- Evidence: Playwright scrolls the wheel in the city and asserts the camera
  distance to the player (a `data-cam-distance` canvas attribute) drops
  below 2 m; before/after screenshots at the closest zoom.

### Task 2: Declutter the HUD

**Finding:** the city shows 12 buttons, 2 selects and 2 segmented controls
at once, plus a title card with hint text, tickers and coins.

- Keep on screen: the place name and coins (a small chip), chat, a single
  "menu" button, and only what the moment needs (Drive while near your car,
  Take a seat near a seat, the game panel inside a venue).
- Everything else moves into one menu sheet: Sound, Photo, Friends, Skates,
  City map, car choice, Mood, Camera view, Collections, Plate Rush, Invite.
- The hint text shows once per place, then fades; tickers collapse into one
  line that rotates.
- Evidence: count of visible controls before/after (Playwright asserts the
  city shows at most 6), before/after screenshots desktop and mobile.

### Task 3: Real building textures

**Finding:** every facade shares one painted-plaster material tinted per
instance (`src/client/city/meshes.ts`); "brick", "glass" and "warehouse"
styles differ only in color.

- One facade material per style family (brick, plaster/stucco, concrete,
  glass curtain wall, corrugated metal for warehouses), each a CC0 PBR set
  already in `public/textures/` or added through `scripts/fetch-textures.ts`.
- Window grids read as recessed glass (normal map plus emissive night
  windows), not flat decals.
- Keep it instanced: one InstancedMesh per family, so draw calls rise by
  a handful at most.
- Evidence: before/after city-street and city-overview screenshots; draw
  calls and triangles before/after.

### Task 4: Load time and frame rate

**Baseline (2026-10-25):** slow 4G load 12.3 s to playable, critical-path
JS 588 KB; fast 4G CPU-bound.

- Measure first (Chrome trace on the preview build): what blocks the first
  frame, main-thread long tasks, per-frame CPU in the city.
- Likely fixes, each kept only if it measures better: split three/R3F/drei
  from app code so the app chunk caches separately; show the city before the
  doll's full-detail GLB (start on `body-lo`); compress the 692 KB body GLB
  harder; cut per-frame allocations and React re-renders in the city
  (traffic, peers, HUD tickers); lower post-processing cost on high.
- Evidence: load time and initial JS before/after under the same throttling;
  city frame time before/after.

### Task 5: Walk cycle and body proportions

**Findings:** walk phase advances at a fixed rate times speed, not by the
clip's stride length, so feet slide; the rig drives only 13 joints (no
spine, no hips), so walks look stiff; the body shape is a stack of
MakeHuman female targets that may push proportions off.

- Pure rule: phase advance from distance travelled over the clip's stride
  length (feet plant).
- Add pelvis and spine to the driven joints so the hips sway and the torso
  counter-rotates; arms swing from the shoulder.
- Proportions: measure the doll against figure-drawing canon (head count,
  leg-to-height, shoulder-to-hip) and retune `SHAPE` in `build_doll.py`;
  render a lineup before/after.
- Evidence: foot-slip number before/after (unit test), a 4-frame walk strip
  before/after, lineup before/after.

### Task 6: Male characters

- A masculine body on the same MakeHuman base (male macro targets as a
  shape key, so every garment still fits), chosen in the closet as "Body:
  feminine / masculine" (`Look.body?`, optional).
- Short hairstyles and beard/stubble options; menswear outfits (tee and
  jeans, button-up, suit, hoodie) and the existing unisex ones; masculine
  walk clips.
- NPCs: a share of men in the city crowds and venues.
- Evidence: lineup render, closet screenshot, city screenshot with men.

### Task 7: Better cars

**Finding:** the 12 road cars are extruded side profiles with box extras;
city traffic is one generic instanced shape.

- Rounded bodies (beveled, lofted cross-sections instead of flat
  extrusions), wheel arches, real glass with reflections, lit headlights
  and taillights, door seams, mirrors, per-model grilles.
- Traffic draws from the same models (instanced per model) instead of one
  blob.
- Evidence: cars-lineup and city-street screenshots before/after; draw
  calls within budget.

### Task 8: Many more event nights

- Grow `CLUB_NIGHTS` from 3 to at least 12, covering the week (several per
  night across different clubs): for example disco, '80s synth, '90s R&B,
  K-pop, house, emo night, country line dancing, drag show, salsa, foam
  party, silent disco, ladies' night, open mic, trivia night.
- Each night: its music (a new procedural track where the existing nine
  don't fit), its color in the room, 10+ handwritten lines per role, and its
  calendar entry.
- Evidence: unit tests for the schedule; calendar screenshot.

### Task 9: Karaoke songs from real, public-domain music

**Constraint:** only melodies in the US public domain (published 1930 or
earlier, or traditional). No modern pop, K-pop, hip-hop, R&B, EDM or rock
song is in the public domain; the report to the owner names those genres.

- A song table: title, credit, year, genre, tempo, backing style, and the
  melody as notes (pitch and length), mapped to the three lanes by contour.
- Genres covered: jazz standards, blues, ragtime, Broadway/Tin Pan Alley,
  folk, country/bluegrass, gospel/spirituals, classical/opera, Latin,
  holiday, and traditional songs from the city's neighborhoods (Filipino,
  Korean, Chinese, Japanese).
- A song picker in the karaoke panel; the duet sends the song id.
- Evidence: unit tests for the table and charting; picker screenshot.
