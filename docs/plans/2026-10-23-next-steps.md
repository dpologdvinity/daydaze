# Daydaze: what comes next (2026-10-23)

A handoff for a fresh session. It records where the game stands on `main`
(2bb89fc), how work gets done here, every gotcha learned the hard way, and a
plan for each piece of remaining work. Read `CLAUDE.md`, `docs/VISION.md` and
`docs/plans/2026-10-14-master-roadmap.md` (milestones M0–M11) alongside it.
Where this file and the master roadmap disagree on status, this file is newer.

---

## 1. Ground rules (from the user; never break them)

- Commit and push to `main` freely once `npm run verify` and the relevant
  Playwright tests pass. **Never deploy** (`wrangler deploy`, `wrangler login`,
  remote D1 migrations) without the user's explicit approval.
- **Never commit `CLAUDE.md` or `.claude/`**; leave edits to them unstaged.
  Never commit `.mcp.json` (git-excluded; holds a GitHub PAT and a Meshy key)
  or `.env`. Never print secrets.
- Conventional Commits, small and focused: one logical change per commit.
- Before `git restore`, `git checkout .`, `git reset --hard` or `rm -rf`,
  run `git status`; stash unrelated work with `git stash -u` first.
- The repo is private and stays private. Never touch `~/git/club-lion`.
- No trademarked doll brand name; say "doll". No AI-generated NPC dialogue:
  new lines must be handwritten (none were added recently; staff use existing
  role banks via `pickLine`).
- 18+ content stays behind the age gate (`src/game/age.ts`; dev-only
  `?adult=1`). Not for children: no child-safety framing, but adult
  moderation (block, mute, report) everywhere.
- All audio is procedural Web Audio. American spelling in all copy and code.
- Paid Meshy calls need the user's confirmation of model and cost first.
  Mixamo only from `./mixamo` (symlink, git-ignored, Adobe terms), never `tmp/`.
- At most one subagent at a time unless the user says otherwise. Python venvs
  via `uv venv`; prefer npm over bun.
- Keep working without stopping to wait; report outcomes faithfully.

## 2. Where things stand

### Built (highlights; full list in `CLAUDE.md` "Status")

- **City**: streamed, 8 neighborhoods, traffic, pedestrians, doors, city map
  fast travel (free), your own car (12 road cars, fuel, paint, rims,
  underglow, window tint behind a "Customize" toggle in `CarPicker`).
- **~66 rooms**: `node --experimental-strip-types -e 'import("./src/game/rooms.ts").then(m=>console.log(Object.keys(m.ROOMS)))'`.
  Newest: `ramen-shop`, `sushi-bar`, `bistro` (food counter kit), `lune`
  (custom candlelit date room, `src/game/lune.ts`).
- **Games with prizes and daily challenges** (`src/game/prizes.ts`):
  everything in the roster except those listed in §4. Newest: Ramen Rush,
  Sushi Catch, safari photo hunt and feeding time (zoo), curling (ice rink),
  Reef Spotter (aquarium), jet-ski race (marina), water-gun race (Midway
  booth), Super Slide ride (fairground).
- **Rooms with two games** show tabs: `games(...)` in
  `src/client/ui/RoomPanels.tsx` (ice rink, zoo, aquarium, marina).
- **Shopping**: Galleria shops incl. Platform Palace (shoes: `look.shoes`,
  `shoesOf()` in `look.ts`), Thrift Temple, salon, piercing parlor.
  **Shoplifting** in real shops: "Pocket" per item (`ShopPanel.tsx`),
  stealth profiles in `src/game/crime/shoplift.ts`, shop mapping, stolen
  tags (`CrimeSave.stolen`) and staff recognition in `src/game/crime/lift.ts`.
  The old stub shelf in the apartment still exists.
- **Online (behind `?online=1`)**: guests and accounts, room copies, other
  players' dolls, swimsuits, dances, seated and ride poses, cars with mods,
  buzz icons, chat (drunk-distorted), mute/block/report, friends with
  presence and "Go to" (D1 `friend_requests`, presence in the Directory DO),
  120 m interest radius in RoomCore, and **Crazy Eights between two players**
  over a generic `game` relay message (`networkProtocol.ts` `GameMessage` /
  `GameRelay`, RoomCore `GAME_LIMIT`, `src/game/cards/duel.ts`,
  `src/client/net/duel.ts`, `DuelPanel.tsx`).

### Known issues

- Boots over jeans: a little denim pokes through at the boot tops.
- The apartment's stub shoplifting shelf is now redundant (real shops do it).
- Full client Playwright suite (158 tests) passes 152 under heavy machine
  load; the 6 that failed (paintball, Plaza door, city keys, Speedway race,
  apartment, city map to Beachside) pass alone and on older commits: load
  flakes, not regressions. Other projects on this machine (Rust builds,
  `llama-bench`, `nibble_tests`) push load average to ~30.

### Not deployed

Production needs, with the user's approval: D1 migrations `0001_init.sql` and
`0002_friends.sql` applied remotely, `ALLOWED_ORIGINS` set to the real site,
`wrangler deploy`, then flip `ONLINE` in `src/client/net/online.ts` on by
default (it is a URL flag today; the comment there says so).

## 3. How work gets done here

### Commands

- `npm run verify`: unit tests (~1000), typecheck incl. Worker, Prettier, build.
- `PORT=5196 npx playwright test -g "<name>" --workers=1`: the browser tests
  for what you touched. Full suite only when needed (`--workers=2`, ~1.6 h).
- `npm run test:e2e:online`: two browsers against a throwaway Worker
  (wrangler 8798 + Vite 5197, ~7 min); run after touching `src/net`,
  `src/client/net` or `server/`.
- `npm run smoke:server`: server end to end (guests, rooms, chat, friends,
  blocks, reconnects, accounts, bans).
- Screenshots: dev server on 5195 (`npm run dev -- --port 5195 --strictPort`),
  then `node --experimental-strip-types scripts/screenshots.ts <name>`; look
  at every image before committing it to `docs/screenshots/`.
- Ad-hoc Playwright scripts (two-browser checks, captures) live in the
  git-ignored `art/textures/.cache/*.mjs` (e.g. `online.mjs`, `car.mjs`,
  `curl.mjs`, `jet.mjs`); copy one as a template.

### Adding a room (checklist)

1. `src/game/<room>.ts`: BOUNDS, FLOOR, BLOCKERS, SPAWN, EXIT, door.
2. `src/game/rooms.ts`: `RoomId` union + `ROOMS` entry; `rooms.test.ts` key
   list is **alphabetically sorted** (e.g. `back-room` < `bistro`,
   `laser-tag` < `lune`).
3. A door: city `venue: {id, door}` building, or a food venue's `room`
   field in `src/game/food/venues.ts` (food rooms get their street door
   automatically via `FOOD_ROOM_EXITS`; custom-floor food rooms spread
   `foodRoom(...)` and override `walkable`/`blockers`, see `lune`).
4. Seats in `src/game/seats.ts` via `seat(id, room, at, height, facing, from)`;
   approach points sit 0.5 m out and must clear blockers by 0.35 m.
5. Client: `World.tsx` lazy import + `SCENES`; `CameraRig.tsx` `ROOM_SHOTS`
   and `MAX_DISTANCE`; `Overlay.tsx` `ROOM_HINTS`; `RoomAudio.tsx` track
   (ids in `src/audio/proceduralJukebox.ts`); `scripts/screenshots.ts`;
   the budget list in `tests/client.spec.ts`; `RoomPanels.tsx` for games.
6. Budget on the low tier: < 250 draw calls, < 300k triangles, ≤ 4 lights.

### Adding a game

- Pure engine in `src/game/<game>.ts` with a Node test; seeded, no React.
- Client session: `createStore` (`src/client/rooms/shared/store.ts`); timers
  via `useNow`/`usePressKeys` (`shared/useNow.ts`); never set state during
  render: tick from the scene's `useFrame` or an effect.
- Order-style games reuse `src/game/orders.ts` + `createOrderSession` +
  `OrderPanel` (props `vessel`, `serveLabel`, `wrong`, `tipWord`, `tipsWord`).
- Prizes: add to `PRIZE_GAMES` and `PRIZE_TABLES` in `prizes.ts`, call
  `award(game, score)` from `src/client/ui/prizeDesk.ts`; daily challenges
  pick it up.
- Panels are `section.game-panel` with an `aria-label`; a second game in a
  room goes in `games([...],[...])`.
- Races reuse the Speedway engine: `startRace(track, spec, bots, skill)`,
  `stepSession`, `advance`, `ChaseCamera`, `RaceHud`, `DriveControls`
  (see `src/client/rooms/marina/JetSkiRace.tsx`).

### Gotchas

- `instancedMesh` whose instances start hidden: set `frustumCulled={false}`
  (bounds are computed from the first frame).
- `CarMesh` starts `visible={false}`: pass a ref that sets it visible.
- R3F reuses a material when a map appears: key it (`key={tex.uuid}`).
- Allocate nothing per frame in `useFrame`; decode network actions only when
  the string changes (see `PeerDoll` in `OnlinePeers.tsx`).
- `validateLook` counts fields: an optional field set to `undefined` fails;
  drop the key instead (see `unlockedLook`).
- Two systems sharing `player.seat` or `cameraHold` must only release what
  they took (see `IceShow` `skating` ref and `CurlingSheet`).
- Never `pkill -f vite`/`wrangler` from a shell whose command line contains
  the pattern (it kills itself, exit 144); kill by PID from `ss -ltnp`.
  8787 is taken by `caveman-proxy`; run wrangler on 8797 with
  `WORKER_PORT=8797` and `--var ALLOWED_ORIGINS:http://localhost:5199`.
- Editing `src/` while Playwright runs reloads its pages (HMR): don't.
- Headless WebGL is SwiftShader on the CPU; a failure under load is usually a
  flake: rerun alone before debugging. Timing games (paintball) flake most.
- Python patch scripts: read before writing; a bad splice once truncated
  `layout.ts` and once mangled `RoomPanels.tsx`. Typecheck after each.

## 4. The plan

Ordered by value; each item is self-contained. Sizes: S < half a day, M ~ a
day, L several days.

### A. Social and online (M9)

**A1. Couple emotes (M, highest value).** Holding hands, forehead kiss,
piggyback, hug, slow dance; offline with nobody, online between two players.
- Clips: look in `./mixamo` (dancing, gestures, idle folders) for paired or
  adaptable clips; add to `art/doll/blender/mocap.py` `MIXAMO_CLIPS`
  (refuses weapons/combat), rerun the retarget (writes
  `src/game/dance/mocap.ts` + `mocapKeys.ts`). Paired poses need two clips
  (lead and follow) or one clip with an offset.
- Pairing: invite/accept over the `game` relay (reuse the duel pattern:
  `{k:"emote-invite", e}` / accept / stop), placement in
  `src/game/dance/couple.ts` (today it only places dancers): the follower's
  doll snaps to an offset from the leader. Sync over the action codec
  (`src/game/peerAction.ts`, 24 chars): e.g. `pair:<emote>:<role>`; add
  tests. Note the action already holds buzz suffix `~N`.
- UI: PeerCard button "Do something together" with a short menu.
- Tests: codec units; online spec step (A invites, B accepts, both see the
  pose attribute on the peer tag `data-doing`).

**A2. Filipino cook-off (M).** Two players, one kitchen, Kamayan Hall or a new
Little Manila kitchen. Each gets the same tickets (orders engine, a new
`COOKOFF` station: adobo, sinigang, pancit, lumpia…); scores exchanged over
the `game` relay; highest after 8 tickets wins. Offline: versus a ghost score.
Prize `cook-off`. Tests: station validity in `orders.test.ts`, codec units,
online spec step.

**A3. Multiplayer versions of existing games (M each).** The relay makes
turn-based ones cheap: bowling (alternate frames, `src/game/bowling.ts`),
mini golf, curling (alternate stones; add stone collisions first, see the
`shortcut:` in `curling.ts`), tennis. Real-time races (kart, jet ski) need
the server to tick or at least relay car states: send race car states in the
action/move stream and draw them like peers (larger; do after deploy).

**A4. Dance-off and runway voting online (M).** Pulse dance-off and the
Catwalk: votes over the relay, or a small server tally in RoomCore.

**A5. Server-owned items (L).** D1 tables for inventory and homes; move
wardrobe/coins to the server for traded items only. Unlocks the swap rack
(A6) and M6b (C1–C3). Needs a migration (local only until deploy approval).

**A6. Thrift swap rack (M, after A5).** Leave an item, take an item; plus
flea market stall and consignment (roadmap M4 thrift extras).

**A7. City regions as separate Durable Objects (L).** Today the whole city is
one room copy of 60 with a 120 m interest radius. Split into regions with
border handover when crowds demand it; roadmap asks for a 500-player load
test within free-plan CPU.

### B. Content gaps (roster and wishlist)

**B1. Water Park expansion (L).** The park floor is 21 m × 16 m
(`WATER_PARK_FLOOR` in `rooms.ts`, `src/game/waterPark.ts`); too small.
Grow it (walkable polygon, gate, camera shots), then add: lazy river (a tube
ride: `player.seat` along a loop, like the slide rides), speed slide race
(two slides, a timing "tuck" game vs a rival), cliff-dive tricks (meter
game, like skee/curling), pool volleyball and the water-gun battle (both
multi in the roadmap; ship solo vs NPCs first).

**B2. Beach volleyball (M).** The city beach already has nets
(`BeachLife.tsx`, `layout.ts`). The city's panel slot is `CityDrivePanel`;
either a beach gate room (cleaner; like Lagoon Links) or a contextual city
panel when near the net. Timing rally engine like `src/game/tennis.ts`.

**B3. Shooting range (M, M7).** A game zone only (guns only in zones and
your own home). Targets, timed drills, pistol to rifle; reuse the gallery
logic from `src/minigames/midway/engine.ts` and laser tag's panel. Hits are
paint or light, never blood.

**B4. Airport and private jet (L, M8).** Terminal lounge room, then a jet
cabin party room that "flies" to vacation rooms (tropical island, snowy
town); taxi ranks are unnecessary (city map travel is free).

**B5. Yacht party (M, M8).** A party yacht from the Marina sailing to a
private island; DJ set and dance-off.

**B6. Food games left (S each).** Delivery job exists in
`src/game/food/delivery.ts` and the phone; check it's reachable and
scored. Cook-off is A2.

**B7. Diverse doll (M–L, M4/M11).** Glasses and freckles exist. Missing:
pronouns on the profile/peer card (save `identity`), hijab (Blender part),
vitiligo (face canvas paint, like freckles in `faceCanvas.ts`), wheelchair
(model + seated locomotion; M11 wants it in every place). Pronouns and
vitiligo are S; hijab and wheelchair are L.

**B8. More stores (S–M each).** Galleria's "Track 99" has no shop
(`src/game/galleria.ts`); a swimwear shop at the beach; more jewelry. Shoe
models: only sneakers, platforms, boots exist in `public/models/doll/`;
new shoes need Blender work (`art/doll/blender/`).

**B9. Car wraps (S).** Roadmap lists wraps beside rims/underglow/tint. A
canvas-texture livery on the paint material in `CarMesh.tsx`; add to
`ParkedCar` mods and the action codec (`c:<hex><r><g><t><id>`; a fourth
digit fits only if the id is ≤ 10 chars with a buzz suffix; check limits).

**B10. Haunted house, Midway, Star Siege** already exist; the roster's
"alien invasion arcade shooter" is Star Siege.

### C. Crime and homes (M6b, needs A5)

**C1. Break-ins and home defense (L).** Door locks (exist), unlocked doors
enterable by others online, intruder warning, the home gun (cartoon
knock-out), wake at a hospital room and drop carried items, or call police
NPCs (`src/game/police/arrest.ts`) who jail the intruder. Safety rules:
offline auto-lock, blocked players never enter, repeated break-ins auto-block
and report.

**C2. Car theft (M).** Unlocked parked cars online; police recovery.

**C3. Friend bail (S).** Friends pay bail from the jail panel (`JailHud`).

**C4. Shoplifting polish (S).** Remove the apartment stub shelf and its hint
(`Overlay.tsx` apartment hint, `ShopliftPanel.tsx`, World `onShelf`), or
keep it as a practice shelf; add sight-cone visuals in shops (today watchers
are beat-based, `watchersFacing`).

### D. Needs the user's approval or decisions

**D1. Deploy.** See §2 "Not deployed"; then turn online on by default and
rerun the smoke test against production. Ask first.

**D2. Age gate and 18+ area (M10).** Birthdate at signup, locked on the
server; under-16 can't sign up; 18+ unlocks automatically; guests never see
18+. Then the weed lounge/smoke shop polish, shrooms trip, Lanmaoa elves, and
the secret strip club (behind the speakeasy, the `jazz-club` Midnight Horn
can host the unmarked door) and massage parlor (upstairs from the nail bar),
suggestive only. Read the M10 section of the master roadmap; confirm the
design with the user before building.

**D3. Day–night.** The user wants the city always night (neon, fireworks);
M11's day–night clock was deliberately skipped. Ask before revisiting.

### E. Polish and launch (M11)

- Performance pass on a mid phone: 30 fps low tier; re-measure the heaviest
  rooms (Galleria, Pulse, Water Park, Speedway).
- Accessibility: keyboard play, labels, axe-clean dialogs (Speedway test
  already runs axe), reduced motion, effects intensity.
- Fix boots-over-jeans poke-through (outfit tuck shape keys).
- Regenerate all screenshots at the end.
- Test infrastructure: the machine is shared and CPU-bound; a GPU-backed
  headless Chrome or cloud CI (GitHub Actions is manual-only for billing)
  would cut the 1.6 h suite and end load flakes. Suggest to the user.

## 5. Suggested order for the next session

1. A1 couple emotes (check `./mixamo` first; if no usable clips, do A2 first).
2. A2 cook-off.
3. C4 shoplifting cleanup and B9 car wraps (quick wins).
4. B2 beach volleyball, B3 shooting range.
5. B1 Water Park expansion.
6. Ask the user about D1 deploy and D2 age gate; then A5 and the M6b chain.
