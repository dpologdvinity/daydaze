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
- `world/World.tsx` is the R3F canvas. It lazy-loads one scene per room from
  the `SCENES` table and renders the player (`PlayerController.tsx`), the
  camera (`CameraRig.tsx`, with a shot per room), seats and effects. The
  canvas mirrors state into `data-*` attributes (`data-frames`,
  `data-calls`, `data-triangles`, per-room ones) for the browser tests.
- `rooms/` holds each room's scene and its game sessions. A game is a pure
  engine in `src/game/<game>.ts`, a small store-backed session
  (`rooms/shared/store.ts`, `createStore`), and a panel. `ui/RoomPanels.tsx`
  maps rooms to their panels; rooms with several games get tabs.
- `ui/` is the HUD: `Overlay.tsx` (room card, closet, action bars),
  `Dressing.tsx`, the prize card (`prizeDesk.ts` → `App` grades, pays and
  records bests and daily challenges), the city map, shops, jail.
- `city/` is the streamed open city: chunks, traffic, your car, the fuel
  stops, the beach net, events (fireworks, the Pride parade).
- `avatar/` is the doll: `human/HumanDoll.tsx` loads the Blender-built GLB
  parts and paints the face; `Doll.tsx` picks poses, dances and couple poses.
- `net/` wires the online session into React (see Online below).

Quality tiers (`world/quality.ts`, `?quality=low|high`) keep the low tier
under 250 draw calls, 300k triangles and 4 real lights.

## Game logic (`src/game`)

Pure, deterministic and seeded where randomness matters, so tests and every
online player agree. The main tables:

- `rooms.ts`: the `RoomId` union and `ROOMS` (floor polygons, blockers,
  spawns, portals). `city/layout.ts` is the city's buildings and streets.
- `look.ts`, `save.ts`, `shop.ts`, `wallet.ts`: the doll's look, the save
  (`SaveV1`, salvaged field by field from untrusted JSON), shops and coins.
- `prizes.ts`, `challenges.ts`: grading every scored game S to C, bests,
  daily challenges.
- One module per game (`bowling.ts`, `tennis.ts`, `cookOff.ts`,
  `volleyball.ts`, `karaokeGame.ts`, ...), plus `dance/` (moves, mocap
  clips, couple poses), `crime/`, `police/`, `driving/`, `speedway/`.
- `dialogue/`: handwritten NPC lines by role, picked by `pickLine`.
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

Accounts: signing up uploads the guest's save; logging in loads the
account's; while signed in, changes push a few seconds later, but only after
the account's own save has loaded (`saveSync.ts`, `client/net/cloudSave.ts`).

## Art pipeline

The 3D doll is built in Blender from MakeHuman's CC0 assets
(`art/doll/blender/`), optimized with gltf-transform into
`public/models/doll/`. Textures are CC0 PBR sets fetched by
`scripts/fetch-textures.ts`. Motion capture is retargeted by
`art/doll/blender/mocap.py` into `src/game/dance/mocap.ts`.

## Testing

- `npm test`: Node's test runner over `src/**/*.test.ts` and
  `server/**/*.test.ts` (game rules, protocol, server cores).
- `npm run typecheck`: strict TypeScript, including the Worker.
- `npm run test:e2e:client`: Playwright against the client (headless
  WebGL runs on the CPU, so it's slow; run what you touched).
- `npm run test:e2e:online`: two browsers against a local Worker.
- `npm run smoke:server`: the server end to end.
- `npm run verify`: tests, typecheck, format check and build; the merge gate.
