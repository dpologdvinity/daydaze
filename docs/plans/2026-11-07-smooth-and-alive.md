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
