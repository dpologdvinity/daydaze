# Architecture

Daydaze is a browser game: a Vite + React Three Fiber client, with game rules
kept as pure TypeScript, and an optional online layer on a Cloudflare Worker.
This page is the map. Product decisions live in [docs/VISION.md](docs/VISION.md),
the threat model in [docs/security.md](docs/security.md), deployment in
[docs/deploy.md](docs/deploy.md), and what to build next in
[docs/plans/2026-10-23-next-steps.md](docs/plans/2026-10-23-next-steps.md).

## The layers

```
 browser                                              Cloudflare
┌──────────────────────────────────────────────┐    ┌──────────────────────────┐
│ src/client   React + R3F: scenes, HUD, input │    │ server/src/worker        │
│      │ uses                                  │    │   index.ts  /api routes  │
│      ▼                                       │    │   RoomInstance (DO)      │
│ src/game     pure rules: rooms, games, saves │◄───┤   Directory (DO)         │
│ src/audio    procedural Web Audio            │    │   RateLimiter (DO)       │
│ src/net      protocol + online client ───────┼───►│ server/src  pure cores   │
└──────────────────────────────────────────────┘ ws │   roomCore, routes, ...  │
                                                 api│ D1: users, saves, friends│
                                                    └──────────────────────────┘
```

The rule that holds it together: **logic lives in `src/game` (and the pure
`server/src` cores), with Node tests; React and three.js stay in
`src/client`, and only draw and wire things up.** Nothing in `src/game`
imports React or three.js. The server imports the same game modules (room
floors, looks, saves, chat effects) so both sides agree on the rules.

## Client (`src/client`)

- `main.tsx` mounts `App.tsx`, which owns the save (in `localStorage`, loaded
  through `loadSave`), the current room, mood and dance, and the HUD.
- `ui/Onboarding.tsx` is the first-visit walkthrough (name, one of
  `STARTER_LOOKS` or the closet, walking, the city map, the games). It shows
  until the save's `onboarded` flag is set; a stored save from before the
  flag loads as onboarded, so only brand-new players see it. Browser tests
  seed the flag in a `beforeEach` (the walkthrough's own tests use a fresh
  context).
- `world/World.tsx` is the R3F canvas. It lazy-loads one scene per room from
  the `SCENES` table and renders the player (`PlayerController.tsx`), the
  camera (`CameraRig.tsx`, with a shot per room), seats and effects. The
  canvas mirrors state into `data-*` attributes (`data-frames`,
  `data-calls`, `data-triangles`, per-room ones) for the browser tests.
- `rooms/` holds each room's scene and its game sessions. A game is a pure
  engine in `src/game/<game>.ts`, a small store-backed session
  (`rooms/shared/store.ts`, `createStore`), and a panel. `ui/RoomPanels.tsx`
  maps rooms to their panels; rooms with several games get tabs.
  In-world games build on `rooms/shared/game3d/`: `Ball`, `Splash` /
  `SandPuff` / `Burst` (instanced particles), `ScoreCard`, `useGameShot`
  (a camera shot through `cameraHold`) and `useGameClip` (the player's doll
  plays a game clip over the picked mood). `game3d/kit.html` is a dev lab.
- `ui/` is the HUD: `Overlay.tsx` (room card, closet, action bars),
  `Dressing.tsx`, the prize card (`prizeDesk.ts` → `App` grades, pays and
  records bests and daily challenges), the city map, shops, jail.
- `city/` is the streamed open city: chunks, traffic, your car, the fuel
  stops, the beach net, events (fireworks, the Pride parade). New York
  blocks (Downtown, Uptown, Arts District) wear real facades near the player:
  `game/city/nyc.ts` picks storey-high bays per street face (seeded lots,
  ground floor, cornice, fire escapes) and `city/NycFacades.tsx` draws them
  from `public/models/nyc/bays.glb` (`scripts/import-nyc.sh`), one
  InstancedMesh per bay; farther blocks keep the cheap box walls.
- `avatar/` is the doll: `human/HumanDoll.tsx` loads the Blender-built GLB
  parts, paints the face and plays baked Mixamo clips on the full skeleton
  with an AnimationMixer (`human/anims.ts`; `game/dance/clips.ts` picks the
  clip). The hand-made 13-joint poses in `pose.ts` (built dances, poses for
  two, the toon doll) reach the skeleton through `BuiltPose`.
- `net/` wires the online session into React (see Online below).

Quality tiers (`world/quality.ts`, `?quality=low|high`) keep the low tier
under 250 draw calls, 300k triangles and 4 real lights.

## Game logic (`src/game`)

Pure, deterministic and seeded where randomness matters, so tests and every
online player agree. The main tables:

- `collections.ts`: the photo album (places visited, a save field), closet
  sets that pay a reward once complete (claimed sets, a save field) and the
  sticker book (best grade per game, from the personal bests). Snapshot
  thumbnails stay on the device (`client/albumSnaps.ts`, 12 kept): images
  would overflow the 64 KB cloud save. The panel is `ui/Collections.tsx`.
- `events.ts`: the weekly club nights (Y2K, Latin, chiptune) on a UTC
  schedule shared by every player: on its night a club plays the night's
  track (`RoomAudio`), glows its color and its NPCs talk about it (the
  `event-*` dialogue situations); the city map lists them with Pride night,
  the fireworks and the parade (`ui/EventCalendar.tsx`). `?night=<id>`
  previews a night.
- `rooms.ts`: the `RoomId` union and `ROOMS` (floor polygons, blockers,
  spawns, portals). `city/layout.ts` is the city's buildings and streets.
- `look.ts`, `save.ts`, `shop.ts`, `wallet.ts`: the doll's look, the save
  (`SaveV1`, salvaged field by field from untrusted JSON), shops and coins.
- `prizes.ts`, `challenges.ts`: grading every scored game S to C, bests,
  daily challenges.
- One module per game (`bowling.ts`, `tennis.ts`, `cookOff.ts`,
  `volleyball.ts`, `karaokeGame.ts`, ...), plus `dance/` (moves, mocap
  clips, couple poses, and `GAME_CLIP_IDS`: the dig, spike, sing, tuck, dive,
  stir, chop and aim clips the in-world games play), `crime/`, `police/`, `driving/`, `speedway/`.
- `dialogue/`: handwritten NPC lines by role, picked by `pickLine`. The
  banks are a separate chunk: `loadDialogue()` fetches them (prefetched at
  idle from `client/main.tsx`), and NPCs say "..." until then.
- `motion/`: ball flights (`lob`, `bounce`, `ballAt`) and seeded particle
  bursts for the in-world games. `clock.ts`: held and shifted event clocks
  (`?danceoff=<s>`, `?pride=<s>` and the city's event flags pin a clock to a
  moment, so tests can't miss a window).
- `peerAction.ts`: what a player is doing, packed into the 24-character
  `action` string every move carries (mood, dance, seat, car and mods,
  couple emotes, buzz).

## Audio (`src/audio`)

Everything is synthesized with Web Audio: the jukebox tracks, ambience beds,
footsteps, horns, fanfares. No audio files. `audioBus.ts` routes music and
effects to separate, mutable buses; `client/RoomAudio.tsx` picks what plays.

## Online (`src/net`, `server/`)

Online play is opt-in (`?online=1`); without it, or when `/api` can't be
reached, the game is single-player and makes no network calls.

- `src/net/networkProtocol.ts` defines and validates every client and
  server message. Both sides decode untrusted input with it.
- `src/net/client/`: `api.ts` (typed, validated `/api` calls),
  `WebSocketTransport.ts` (reconnects with backoff; some close codes are
  final), `OnlineSession.ts` (identity, the room copy, remote players with
  interpolation, throttled moves, the `game` relay, sign-in and saves).
- `src/client/net/`: React glue: `online.ts` joins the current room, `OnlinePeers.tsx`
  draws everyone else and sends your moves, `PeerCard.tsx` (friend, mute,
  block, report, couple emotes, cook-off, admin ban), `FriendsPanel.tsx`
  (account, room copies, reports for admins), and the two-player games over
  the relay (`duel.ts`, `together.ts`, `cookOff.ts`).
- `server/src/worker/index.ts` is the Worker: it serves `dist/`, answers
  `/api/*` (guests, signup and login with PBKDF2, saves, friends, reports,
  blocks, admin) against D1, and upgrades `/ws/room/<room>/<copy>` to the
  `RoomInstance` Durable Object for that room copy.
- `RoomInstance` wraps the pure `server/src/roomCore.ts`: occupants,
  interest radius, rate limits, chat filtering, blocks, kicks and bans, the
  relay. `Directory` tracks copies and who is where; `RateLimiter` keeps
  auth and report budgets in its SQLite storage.
- `server/migrations/` is the D1 schema.
- Apartments are one copy per owner: `/ws/home/<ownerId>` reaches the
  `apartment:home:<ownerId>` Durable Object, for the owner or a friend
  (checked in D1; never a blocked one). `RoomCore`'s home mode lets a visitor
  in only while the owner is home with the door unlocked; the owner's client
  sends its layout (`home` message: door and furniture), visitors receive it
  and draw that home read-only, and locking up or leaving closes them out
  (close code 4006, `closed`). Apartments aren't listed in the Directory.
  Client side: `src/client/net/home.ts` and the Friends panel's "Visit".

Accounts: signing up uploads the guest's save; logging in loads the
account's; while signed in, changes push a few seconds later, but only after
the account's own save has loaded (`saveSync.ts`, `client/net/cloudSave.ts`).

## Art pipeline

The 3D doll is built in Blender from MakeHuman's CC0 assets
(`art/doll/blender/`), optimized with gltf-transform into
`public/models/doll/`. Textures are CC0 PBR sets fetched by
`scripts/fetch-textures.ts`. The doll's skeleton is Mixamo's 52 bones
(MPFB2's CC0 rig); `art/doll/blender/mocap.py` retargets Mixamo clips onto
it into `public/models/doll/anims.glb` and lists them in
`src/game/dance/mocap.ts`. Sources and licenses: `docs/assets.md`.

The sea: `art/ocean/fetch_ocean.py` downloads the reef and sea-life models
(Poly Pizza), `art/ocean/build_ocean.py` joins and fits the reef props and
gulls, `art/animals/build_animals.py` bakes the grouper, crab and turtle, and
`scripts/import-ocean.sh` compresses them into `public/models/ocean/` and
`public/models/animals/`. Seaside Swim (`openWater.ts`) and the reef
(`dive.ts`: air, species log, seeded layout, creature paths) are pure; the
player's swim state is `src/client/world/water.ts` plus the `swim-front` and
`swim-tread` clips (`afloat` in `HumanDoll`), and the rented gear is
`ScubaGear.tsx` on her spine and head bones.

## Service worker

`public/sw.js` registers in production builds only
(`src/client/serviceWorker.ts`). The fingerprinted `/assets/` bundle and
the models, textures, sky maps and closet art are cache-first; pages are
network-first; `/api` and `/ws` pass straight through. The cache is named
after the build (`__BUILD_ID__`, set in `vite.config.ts`), so each deploy
gets a fresh cache. A new version waits until the player taps Reload in the
update prompt (`src/client/ui/UpdatePrompt.tsx`), then deletes the old cache.

## Testing

- `npm run lint`: ESLint with typescript-eslint and the React hooks rules
  (`eslint.config.mjs`).
- `npm test`: Node's test runner over `src/**/*.test.ts` and
  `server/**/*.test.ts` (game rules, protocol, server cores).
- `npm run typecheck`: strict TypeScript, including the Worker.
- `npm run test:e2e:client`: Playwright against the client (headless
  WebGL runs on the CPU, so it's slow; run what you touched).
- `npm run test:e2e:online`: two browsers against a local Worker.
- `npm run test:e2e:sw`: the service worker against a production build
  (`vite preview`): a second visit loads from its cache.
- `npm run smoke:server`: the server end to end.
- `npm run perf:budget`: after a build, fails when the initial JS (entry plus
  preloads, gzipped) passes 600 KB, and prints `dist/` by asset class; CI runs
  it after the build.
- `npm run test:coverage`: the unit tests with a coverage report
  (`coverage/lcov.info`, `coverage/summary.txt`).
- `npm run verify`: lint, tests, typecheck, format check and build; the
  merge gate, and what CI (`.github/workflows/ci.yml`) runs on every push
  and pull request to `main`.
