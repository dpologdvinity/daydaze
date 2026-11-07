# Smooth and alive (owner, 2026-11-07)

Starts once the open worktrees (yacht, cove2, motels, park budget, benches,
band shell, pottery, florist, garden) are merged. Owner's words: "the gameplay
is too slow/laggy, the player walks too slow, use the Mixamo animations, use
the 3D cars — the cars are ugly; I gave you so many 3D things, look in
~/downloads/game".

## 1. Smooth and fast (first)

- Profile real frame time, not SwiftShader: Chrome with the GPU on the
  owner's machine is the target. Measure frame time, long tasks and GC per
  area (city spawn, Nightlife Row, the park, Beachside, a busy room).
- Cold load and arrival: shader warm-up (`renderer.compileAsync`), fewer
  material variants, KTX2 textures, meshopt everywhere, no synchronous
  geometry merging on arrival (idle callbacks or a worker), preload the next
  area. The `perf/load` branch has a profiling script to start from.
- Per frame: no allocation in `useFrame`, fewer React re-renders from stores
  (subscribe with selectors), instancing for anything repeated, frustum
  culling and LOD (InstancedMesh2), cap shadow casters.
- Done when: a measured before/after table per area, and the browser tests'
  raised timeouts come back down.

## 2. Walk speed and Mixamo motion

- The player walks too slowly: raise walk speed (and run), keep the
  feet planted (playback rate matched to ground speed), smooth starts and stops.
- Use the Mixamo library in `mixamo/` (~630 clips: walking 37, running 6,
  idle 78, dancing 138, sitting 61, talking 25, gestures 44, reactions 41,
  laying 42, swimming 9, sports 39...). Bake a curated, larger set onto our
  skeleton with `art/doll/blender/mocap.py`: several walk and run styles,
  idle variants, sits, talking/laughing gestures, the dance set, swims.
  Keep the file size in check (load clips per need, not all at once).
- NPCs pick idles, gestures and dances so crowds have personality.

Status (branch `feat/motion`, 2026-11-07): 278 clips are baked per sex in six
packs (`art/doll/blender/mocap_clips.py`; `anims.glb` is the always-loaded core,
`anims-<pack>.glb` load on demand): core (walk styles, a run, backwards walks,
idles, jump, the original set), social (talking, greetings, yes/no, moods,
cheering), seated (sit down, seated idles, talk, clap, cheer, typing), dance2
(Thriller, YMCA, moonwalk, samba, swing...), ual (Quaternius' CC0 farm, carry,
push, throw, climb, slide) and moves (start/stop/turn, baked but unwired).
Wired: the player's idle rotation and each NPC's temperament
(`game/dance/idlePlan.ts`), sit-down/stand-up joins (`transitions.ts`), the
emote row in the Dance panel, talking gestures on tapped NPCs, farm clips in the
garden and the farm (`rooms/shared/game3d/workClip.ts`), and the soccer-jog
hand-over at the brisk walk speed (RUN_CLIP = "run", natural pace 2.3 m/s).
Known gap: at WALK_SPEED 2.6 every gait hands over to the run, so the walk
styles only show at slower speeds.

## 3. Real cars

- Replace the lofted procedural traffic and player cars with downloaded
  models: Quaternius Realistic Car Pack and Public Transport Pack (CC0) first;
  the owner's Sketchfab zips (1970 Charger, Porsche 992 GT3 R, Nissan R34,
  Jaguar XJ pack, the Barbie Dodge pickup, a future car) only after checking
  each license (CC-BY with credit is fine; NC/ND is not); strip real brand
  logos/badges. Optimize (meshopt, webp), instanced per model for traffic,
  low-poly LODs for the low tier, keep paint colors, wraps, rims,
  underglow and tint working on the new bodies.

## 4. Better hair (started 2026-11-07, branch feat/hair)

- Fix the white speckles in dark hair (alpha card rendering) for every style.
- New styles from the owner's 12 hair packs in ~/downloads/game/hair/ and
  Quaternius Universal Base Characters (licenses checked; NC/ND skipped),
  fitted to both heads, tintable, with LODs, added to the closet without
  breaking saved looks.

### 1. Results (branch perf/smooth, measured on GitHub runners)

Tooling: `scripts/perf-profile.ts` (areas spawn, nightlife, park, beachside,
pulse; phases arrive / stand / walk; frame times, long tasks, late shader
links, optional V8 CPU profiles), `scripts/cpuprofile-top.ts`, and
`.github/workflows/profile.yml` (push a commit with `[profile]` or
`[profile:spawn,pulse]` in its message to `perf/smooth`, or dispatch it; then
`gh run download <id> -n profile`). SwiftShader numbers are relative only.

What the CPU profiles showed: the per-frame JS was already small (traffic,
walkers and the player loop allocate nothing and run at fixed rates). The
stalls were (1) shader programs compiled and linked inside the first frame that
drew streamed-in content (`getProgramInfoLog`, 0.5 to 2 s per 8 s window),
(2) painting every arriving doll's 1024 px face on the main thread (three
`getImageData` passes per face) and again each time a walker came back, and
(3) per-frame skeleton work for dolls a few pixels tall.

Fixes: `LateWarmup` (`src/client/world/compileGate.ts`) hands newly mounted
content to `compileAsync`; faces and irises are shared and kept after the last
holder lets go (`refCache.ts`, `faceCanvas.ts`), the lip and cheek masks are
read back once and tinted by compositing; far dolls pose every third frame;
the blink morph and `data-*` attributes are written only when they change.
Do not move the face canvas to the GPU (`willReadFrequently: false`): under
SwiftShader its 22 px blur took 80 s.

| area (low tier) | before: ten frames / stand mean frame / stand long tasks | after |
| --- | --- | --- |
| spawn | 11.4 s / 419 ms / 750 ms | 9.6 s / 269 ms / 0 |
| nightlife | 11.6 s / 210 ms / 1164 ms | 8.5 s / 226 ms / 0 |
| park | 9.9 s / 413 ms / 2849 ms | 7.5 s / 141 ms / 662 ms |
| beachside | 9.8 s / 144 ms / 892 ms | 7.4 s / 91 ms / 0 |
| pulse | 9.2 s / 278 ms / 0 | 6.5 s / 198 ms / 0 |
