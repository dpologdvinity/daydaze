# scripts

Build, CI and asset tooling for the repo. TypeScript scripts run with `node --experimental-strip-types scripts/<name>.ts`; the `*.test.ts` files beside them are Node tests that `npm test` runs. Most CI scripts are called by a workflow in [`../.github/workflows/`](../.github/workflows/README.md); the asset scripts are run by hand and wrap the Blender sources in `art/`. Scripts that need API keys run through `with-env.sh`.

## Files

### Quality gates

| File                                             | What it does                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check-headers.ts` (+ `check-headers.test.ts`)   | Fails when a tracked code file under `src/`, `server/src/`, `scripts/` or `tests/` lacks a header comment. Run by `npm run lint:headers`                           |
| `check-coverage.ts` (+ `check-coverage.test.ts`) | Enforces per-directory coverage floors for `src/game/` and `src/net/` from `coverage/lcov.info`, which `npm run test:coverage` writes                              |
| `perf-budget.ts` (+ `perf-budget.test.ts`)       | Checks `dist/` against the performance budget (initial JS under 600 KB gzipped, plus a per-asset-class report). Run by `npm run perf:budget` after `npm run build` |
| `declared-deps.test.ts`                          | Test: every package `src/` imports by bare name is declared in `package.json`                                                                                      |
| `eslint-ignores.test.ts`                         | Test: git-ignored scratch and tool directories are ignored by ESLint                                                                                               |

### CI selection and merge line

| File                                         | What it does                                                                                                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select-tests.ts` (+ `select-tests.test.ts`) | Picks which browser tests a PR runs from its changed files and the test map recorded by `tests/test-map.ts`; used by `playwright.yml` (see [`../tests/README.md`](../tests/README.md)) |
| `docs-only.ts` (+ `docs-only.test.ts`)       | Prints `true` when a change touches only files the browser suites cannot notice, so they are skipped                                                                                   |
| `main-merged-only.sh`                        | Prints `true` when a PR head only merges `main` into a commit whose browser suites already passed, so only the fast checks re-run                                                      |
| `next-update.ts` (+ `next-update.test.ts`)   | Picks the one auto-merge PR to bring up to date next; used by `auto-update.yml`                                                                                                        |

### Screenshots, recording and profiling

| File                                               | What it does                                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screenshots.ts`                                   | Captures review screenshots of rooms, spots and raw scenes into `docs/screenshots/`; the `screenshots.yml` workflow shards it. Needs a dev server |
| `shot-plan.ts` (+ `shot-plan.test.ts`)             | The screenshot token language: names, raw URL-flag queries and the `all-rooms`, `all-spots` and `tour` presets                                    |
| `pr-shots.ts` (+ `pr-shots.test.ts`)               | Picks which shots a PR attaches from its changed files; used by `pr-screenshots.yml`                                                              |
| `wait-for-frames.ts` (+ `wait-for-frames.test.ts`) | How long a screencast frame strip keeps recording, so slow rooms still deliver frames                                                             |
| `record.ts` (+ `record.test.ts`)                   | Records an MP4 of a scene or minigame from the dev server; used by `record.yml`                                                                   |
| `lineup-shot.ts`                                   | Screenshots one shot of the doll lineup page into `docs/screenshots/`                                                                             |
| `face-previews.ts`                                 | Renders the closet's eye and lip previews from the runtime's facial morphs                                                                        |
| `perf-profile.ts`                                  | Per-area frame-time and CPU profile against `npm run preview`; used by `profile.yml`                                                              |
| `cpuprofile-top.ts`                                | Summarizes a V8 `.cpuprofile`: top functions by self time                                                                                         |

### Archive

| File                                           | What it does                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `archive-run.sh`                               | Copies a CI run's files into a permanent release on `dpologdvinity/daydaze-artifacts`; called by `screenshots.yml` and `record.yml` |
| `archive-sweep.ts` (+ `archive-sweep.test.ts`) | Copies expiring artifacts (screenshots, recordings, reports, profiles) to permanent releases; run daily by `archive-sweep.yml`      |

### Asset import and build

Each `import-*.sh` wraps a Blender script under `art/` (where there is one) and `gltf-transform` to write optimized GLBs into `public/models/`. Sources, licenses and credits are recorded in `docs/assets.md` and `src/game/credits.ts`; several scripts expect downloaded packs under `/tmp` (see each header).

| File                                            | What it does                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `import-animals.sh`                             | Animals and fish into `public/models/animals/`                                                                                       |
| `import-cars.sh`                                | Road cars (and low-detail twins) into `public/models/cars/`                                                                          |
| `import-el.sh`                                  | The El train cars into `public/models/el/`                                                                                           |
| `import-fair.sh`                                | The Fairground's gondola, carousel horse and coaster pieces into `public/models/fair/`                                               |
| `import-train.sh`                               | The Amusement Park's kiddie train into `public/models/fair/`                                                                         |
| `import-farm.sh`                                | Farm crops, soil plots, buildings and props into `public/models/farm/`                                                               |
| `import-forest.sh`                              | Forest trail trees, logs, rocks and plants into `public/models/forest/`                                                              |
| `import-garden.sh`, `import-garden-dressing.sh` | Community garden crops and props into `public/models/garden/`; the dressing script downloads from Poly Pizza and needs `with-env.sh` |
| `fix-garden-crop-alpha.py`                      | Makes the garden crop GLBs opaque by rewriting each material's base color alpha (run after `import-garden.sh`)                       |
| `import-home.sh`                                | Apartment furniture into `public/models/home/`                                                                                       |
| `import-marina.sh`                              | Marina ships and props into `public/models/marina/`                                                                                  |
| `import-motels.sh`                              | Beachside cottages and Suburbia homes                                                                                                |
| `import-nature.sh`, `import-trees.sh`           | Trees, bushes, flowers and grass into `public/models/nature/` (and palms into `public/models/street/`)                               |
| `import-ocean.sh`                               | Reef props and gulls into `public/models/ocean/`                                                                                     |
| `import-speedway.sh`                            | Speedway oval assets into `public/models/speedway/`                                                                                  |
| `import-street.sh`                              | The street kit (crosswalks, manholes, bollards) into `public/models/street/`                                                         |
| `import-transit.sh`                             | Bus, van and bus stop into `public/models/transit/`                                                                                  |
| `import-vendors.sh`                             | Street vendor props into `public/models/vendors/`                                                                                    |
| `import-yards.sh`                               | Block-yard props into `public/models/yards/`                                                                                         |
| `optimize-doll.sh`                              | Compresses the doll parts Blender wrote into `public/models/doll/`, with a lower-detail twin of each                                 |
| `optimize-opponents.sh`                         | Compresses the Paintball and Laser Tag opponents into `public/models/opponents/`                                                     |
| `pruneMorphs.ts` (+ `pruneMorphs.test.ts`)      | Drops shape keys that move no vertices of a mesh; run by `optimize-doll.sh`                                                          |
| `trimClips.ts`                                  | Drops redundant bone channels from an animation GLB; run by `optimize-opponents.sh`                                                  |
| `mocap-metas.ts`                                | Writes per-pack mocap metadata from the committed catalog so `art/doll/blender/mocap.py` can re-bake one pack                        |
| `mixamo-gait.mjs`                               | Measures a Mixamo walk's knee flex and thigh pitch from its FBX, to pick walks                                                       |
| `gen-infill.ts`                                 | Writes `src/game/city/infill.generated.ts`, the plan that fills the city's empty blocks; rerun after changing the city layout        |
| `prepare-city-copper.ts`                        | Converts collected CC0 copper textures into shared roof textures                                                                     |
| `fetch-textures.ts`                             | Downloads CC0 PBR texture sets (Poly Haven, ambientCG) into `public/textures/`                                                       |
| `gen-sounds.mjs`                                | Generates sound effects and music beds with ElevenLabs into `public/audio/` (costs credits; run through `with-env.sh`)               |
| `freesound.mjs`                                 | Searches and downloads Freesound previews (CC0 and CC-BY)                                                                            |
| `build-recordings.sh`                           | Builds recorded sounds in `public/audio/` from Freesound previews                                                                    |
| `tripo.sh`                                      | Runs the Tripo 3D CLI scoped to this repo (key in git-ignored `.tripo-home/`); costs credits, ask first                              |

### Environment

| File          | What it does                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `with-env.sh` | Runs one command with keys from the git-ignored `.env` loaded, without printing the file: `bash scripts/with-env.sh <command>` |

## Notes

- Never print `.env`; use `with-env.sh` for anything that needs keys.
- Meshy, Tripo and ElevenLabs cost credits: ask the owner before running paid generation.
- Locally, run Blender and gltf-transform work under `nice -n 19`, one Blender at a time.
