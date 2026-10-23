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
- **Games with prizes and daily challenges** (`src/game/prizes.ts`): most
  scored games, including (B11, done) the Speedway and jet-ski races (graded
  on finishing place, lower is better), bumper cars (bumps, cashed when you
  climb out), the four Midway booths, Gem Glam, Star Siege and Trivia (the
  dialog hands its best round to the prize desk on close; leveled cabinets
  grade on their medium bars). Still paying a bare grade: Bassline and Last
  Call. Newest: Ramen Rush,
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
- **Online (behind `?online=1`)**: guests (accounts exist on the server
  and in `src/net/client/api.ts`, but the 3D client has no login, signup or
  save sync yet; see A0), room copies, other
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
   the budget list in `tests/client.spec.ts`; `RoomPanels.tsx` for games;
   `DebugPanel.tsx` jump button; the city map's `VENUE_PLACES` in
   `src/game/city/places.ts`.
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

**A0. Online must-haves before real players (M–L, do with or before D1).**
Done 2026-10-23: the connection HUD line (`connectionNote.ts`,
`ConnectionNote.tsx`), solo apartment and jail online (`SOLO_ROOMS`; they
leave the room copy), and the strict chat filter (`settings.strictChat`, a
checkbox in the Friends panel, masked client-side with the server's
`filterChat`), and drunk chat applied by the server (`roomCore` stretches
vowels by the `~N` buzz tag on the sender's last move, `shownBuzz` in
`buzz.ts`; the client sends what was typed), and accounts: an Account
section at the top of the Friends panel (`AccountPanel.tsx`, `account.ts`):
signing up uploads the guest's local save as the account's, logging in loads
the account's save, and while signed in every change is pushed 4 s later
(`saveSync.ts`, `cloudSave.ts`, flushed on `pagehide`); an admin-only
"Ban (admin)" on the peer card (`api.ban`, `session.ban`; not browser-tested,
needs `is_admin` in D1); the room-copy list in the Friends panel
(`RoomCopies.tsx`, `session.copies()`, hop with `switchCopy`);
`docs/security.md` refreshed; an admin report viewer (`GET
/api/admin/reports`, latest 50, `ReportsPanel.tsx` in the Friends panel,
smoke-tested). Still open: online leaderboards (wait for a server economy:
scores are client-owned, see `docs/security.md`), jail and store bans in D1
(with A5).
- Account UI and cloud saves: login, signup, logout screens; load the save
  at login, push changes debounced (`api.getSave/putSave`); upload a
  guest's local save when they make an account. Nothing in `src/client`
  calls `signup`, `login` or `putSave` today.
- Connection status: a HUD line for reconnecting, playing offline, room
  full (4001), kicked (4002), banned (4003), replaced (4009).
- Private rooms: `useOnlineRoom` joins every room the same way, so online
  strangers would share one `apartment` and one `jail` copy. Make homes and
  jail per player (a copy keyed by owner) or skip them online until M6b.
- Server-enforced drunk chat: send the buzz level and apply `chatDistort`
  in `server/src/roomCore.ts` instead of only in `App.tsx`.
- Jail sentences and store bans are client-owned (`SaveV1.jail`,
  `crime.bans`); move them to D1 with server checks (with A5).
- Moderation tools: an admin menu on `PeerCard` (kick, ban via
  `/api/admin/ban`, today only callable from devtools), a report viewer,
  and the M11 threat-model review against `docs/security.md`.
- A strict personal chat filter setting (`filterChat` strict mode exists,
  unused by the client).
- A room-copy list ("Plaza #1, 12 people") from `api.rooms`.
- Online leaderboards for bests (today client-only).
- Refresh `docs/security.md`: it says there's no admin route (there is) and
  that rate limits are in memory (they're in DO SQL storage). Its known
  gaps (no account recovery, no 2FA, no breached-password check, a short
  slur list) need a user decision.

**A1. Couple emotes (M, highest value). Done 2026-10-23 (online only):**
hug, hold hands, forehead kiss (handwritten poses in `moves.ts`; `./mixamo`
has only partner salsa, no hug/kiss/hand clips) and slow dance.
`src/game/dance/together.ts` (list, `followSpot`, relay messages
`pair-invite`/`pair-accept`/`pair-stop`), action code `pair:<emote>:<l|f>`,
`src/client/net/together.ts` + `TogetherPanel.tsx`, PeerCard group "Do
something together". The follower snaps beside the lead; walking 0.4 m off
ends it. Left: piggyback (needs a lifted doll), pose polish (the hug's arms
are guessed; check in the lineup), offline NPC partners. `test:e2e:online` passes (the card table used to cover the
peer card's buttons; the card now sits on z-index 6). Original note: Holding hands, forehead kiss,
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

**A2. Filipino cook-off (M). Done 2026-10-23:** `src/game/cookOff.ts`
(`COOKOFF` station, `ghostScore`, `cook-*` relay messages), Kamayan Hall's
`CookOffPanel` (vs Tita Baby's ghost score, or a matched player with the same
seed; scores swap at the end), the invite anywhere (`CookOffInvite`, PeerCard
"Challenge to a cook-off"), prize `cook-off`. The online spec covers invite
and accept only (both players walking to Kamayan Hall would add minutes).
Original note: Two players, one kitchen, Kamayan Hall or a new
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

**B1. Water Park expansion (L). In progress:** cliff dives done
2026-10-23 (`src/game/cliffDive.ts`, `rooms/waterpark/DivePanel.tsx`,
prize `cliff-dive`; panel only, no dive animation) and the speed slide race
(`src/game/speedSlide.ts`, `SlidePanel.tsx`, prize `speed-slide`, lower is
better) and pool volleyball (`VolleyGame` shared with the beach, prize
`pool-volleyball`) and a water-gun battle (the Midway `Gallery`, prize
`water-guns`), as tabs. Left: grow the floor, the lazy river ride.
Original note: The park floor is about 21 m × 10 m
(`WATER_PARK_FLOOR` in `rooms.ts`, `src/game/waterPark.ts`); too small.
Grow it (walkable polygon, gate, camera shots), then add: lazy river (a tube
ride: `player.seat` along a loop, like the slide rides), speed slide race
(two slides, a timing "tuck" game vs a rival), cliff-dive tricks (meter
game, like skee/curling), pool volleyball and the water-gun battle (both
multi in the roadmap; ship solo vs NPCs first).

**B2. Beach volleyball (M). Done 2026-10-23:** a contextual panel at the
city net (`src/client/city/VolleyStop.tsx`, shown within 9 m on foot via the
new `playerSpot`), engine `src/game/volleyball.ts` (dig then spike, first to
seven), prize `volleyball`, and "Beach volleyball" under Beachside in the
city map's directory (`OUTDOOR_SPOTS`). No 3D ball or opponents yet.
Original note: The city beach already has nets
(`BeachLife.tsx`, `layout.ts`). The city's panel slot is `CityDrivePanel`;
either a beach gate room (cleaner; like Lagoon Links) or a contextual city
panel when near the net. Timing rally engine like `src/game/tennis.ts`.

**B3. Shooting range (M, M7). Done 2026-10-23 (lean):** a "Target range"
tab at Photon Zone (`RangePanel.tsx`): pistol and rifle drills in light, the
Midway `Gallery` (exported, `ammo="shots"`) at medium and hard; prizes
`range-pistol`/`range-rifle`. Still open: a 3D range with lanes. Original
note: A game zone only (guns only in zones and
your own home). Targets, timed drills, pistol to rifle; reuse the gallery
logic from `src/minigames/midway/engine.ts` and laser tag's panel. Hits are
paint or light, never blood.

**B4. Airport and private jet (L, M8).** Terminal lounge room, then a jet
cabin party room that "flies" to vacation rooms (tropical island, snowy
town); taxi ranks are unnecessary (city map travel is free).

**B5. Yacht party (M, M8).** A party yacht from the Marina sailing to a
private island; DJ set and dance-off.

**B6. Delivery job and scooter (M, M5).** Not built:
`src/game/food/delivery.ts` only times a food order (20 s). Build a courier
job: pickup and drop-off on the city road graph, a scooter in the roster
(`src/game/driving/roster.ts`, non-road class like `JET_SKI`), tips by
speed, visible courier NPCs. Cook-off is A2.

**B7. Diverse doll (M–L, M4/M11).** Glasses and freckles exist. Pronouns
done 2026-10-23: `look.pronouns` from `PRONOUNS` (a fixed list, validated by
`validateLook`, so they ride the look online), picked under Body in the
closet, shown on the peer card. Missing: vitiligo, birthmarks
and monolid eyes (face canvas/sliders, like freckles in `faceCanvas.ts`),
a plus-size body range (`src/game/body.ts` scales only about ±6–10%),
hijab, head wraps, turbans, bindis, hearing aids, prosthetics (Blender
parts or anchors like `Glasses.tsx`), hair: locs, cornrows, bantu knots,
twist-outs, puffs, buzz cut, shaved sides, bald, edges/baby hair (strand
hair in `art/doll/blender/strands.py`; check ponytail and braids, which
were still the older cards at one point), and a wheelchair (model + seated
locomotion; M11 wants it in every place). Pronouns and face paint are S;
bodies, parts, hair and the wheelchair are L.

**B8. More stores (S–M each).** Galleria's "Track 99" has no shop
(`src/game/galleria.ts`); a swimwear shop at the beach; more jewelry. Shoe
models: only sneakers, platforms, boots exist in `public/models/doll/`;
new shoes need Blender work (`art/doll/blender/`).

**B9. Car wraps (S). Done 2026-10-23:** `WRAPS` in `drive.ts` (racing
stripes, black stripes, checker, two-tone), drawn by an object-space pattern
in `CarMesh`'s paint shader (no UVs needed); the four mods now pack into two
base-36 characters of the action code (`c:<hex><2 chars><id>`), so an
11-character car id still fits with a buzz tag. Original note: Roadmap lists wraps beside rims/underglow/tint. A
canvas-texture livery on the paint material in `CarMesh.tsx`; add to
`ParkedCar` mods and the action codec (`c:<hex><r><g><t><id>`; a fourth
digit fits only if the id is ≤ 10 chars with a buzz suffix; check limits).

**B10. Haunted house as a game (M). Done 2026-10-23:** find the way out
(`src/game/hauntedRun.ts`: 8 rooms, 3 doors, 3 nerve; `rooms/haunted/
EscapePanel.tsx` with 12 handwritten scares, no gore; prize `haunted`).
Panel only: the 3D rooms don't change as you go deeper. Original note: `HauntedHouse.tsx` is a walk-through
with no score; the roster wants a solo horror game (jump-scare timing or a
find-the-exit run, no gore). Star Siege already is the roster's alien
shooter.

**B11. Prizes for unscored games (S). Done 2026-10-23.** Add `PRIZE_GAMES`/`PRIZE_TABLES`
entries and `award()` calls for the jet-ski race and Speedway races (best
lap or place), bumper cars (bumps), the Midway booths (score per booth) and
the arcade minigames, so they get bests and daily challenges.

**B12. Karaoke game (M, M3). Done 2026-10-23:** `src/game/karaokeGame.ts`
(16 seeded notes on three lanes), `rooms/karaoke/KaraokePanel.tsx` (J/K/L
or buttons, shell-note tones), prize `karaoke`. The chart's 0.6 s beat isn't
synced to the room's backing track yet. Original note: `karaoke` is a room only (`src/game/karaoke.ts`,
`Karaoke.tsx`). A pitch/timing rhythm game at the mic, procedural backing
track, no lyrics on screen (rule from earlier work).

**B13. Card table at the speakeasy (S, M3). Done 2026-10-23:** Odette deals
Crazy Eights at the Back Room bar (`src/client/rooms/backroom/CardsPanel.tsx`;
`CardTable` takes `rival`/`winLine`; the engine's `deal(seed, rival)` names
them in the table talk). The online duel already works in any room from
`PeerCard`. Original note: Put Crazy Eights (vs a regular
NPC, and the online duel) at a Back Room table (`back-room`).

**B14. Club events and sapphic touches (M, M3). Partly done 2026-10-23:**
Pride night (`src/game/prideNight.ts`, every 15 min for 4 min, in
`PRIDE_CLUBS`; `PrideTicker` in the room card with a rainbow glow; preview
with `?pride=20`). Left: lights in the 3D clubs, beat-tile streak glow,
couple skating, pride-flag prints. Original note: Pride night event at the
clubs (timed like `src/game/danceOff.ts`, the HUD ticker pattern), beat-tile
streak glow on dance floors, couple skating at the ice rink (with A1),
pride-flag clothing prints (an outfit pattern option).

**B15. Homes and economy (M each, M4/M6a).** Choose the apartment's
neighborhood with a matching window view (`HomeSave` in
`src/game/home/home.ts` has none); cooking with groceries (a kitchen and
pantry; `market.ts` is layout only); a furniture and decor store
(`decor.ts` is a free catalog); pets and a pet shop (low priority in VISION).

**B16. Salons and beauty (M each, M4).** More salons (braiding shop,
barbershop, Korean perm, walk-in, luxe nail studio), lash/brow/makeup
artist services, and painted nails on the doll's hands (a `Look` field plus
`HumanDoll` material; today nails are only a minigame). Check whether the
salon previews a style before you pay.

**B17. Stores, groceries, malls (S–M each, M4/M8).** `ShopId` is
boutique/beauty/salon/piercing/thrift/shoes. Missing from the content spec:
sneakers, handbags, hats, wigs, sunglasses, beauty supply, K-beauty,
drugstore, perfume, nail polish bar, plants, phone/gadgets, toys,
crystals/tarot, liquor, flowers, party, bridal, sports gear, style
boutiques (goth, cottagecore, lingerie…). Groceries: Filipino grocery, Asian
supermarket, farmers market, a bodega with a cat (the spec's easy
shoplifting store). Malls: an outdoor luxury street, a retro dead mall; the
Galleria's photo-sticker booth, pretzel stand and arcade. Most can reuse
`ShopPanel` with new items once there are things to sell (new wearables
need Blender parts; accessories like hats and bags need new `Look` slots).

**B18. Places from the M7/M8 checklist (M each).** Park and Gardens: boating
lake, night-sky lookout, the Lanmaoa grove (18+, D2). Zoo: monkey canopy
walk, reptile house, petting area, safari tram (habitats in
`src/game/zoo.ts`). Aquarium: underwater cafe, otter show. Mermaid Cove:
sunken ship, swimming. Marina: rowboats, speedboat rentals. Water Park:
night swim, pool bar (with B1). Amusement Park: photo booth. Neighborhoods
not built: Hillside Winter Town, the Fashion District (`cells.ts`); one bus
stop per neighborhood (only `SQUARE_BUS_STOP` exists).

**B19. Cars (S–M, content spec "Cars"). Partly done 2026-10-23:** horn
(`playHorn`, H key), radio (`src/audio/carRadio.ts` stations, played by
`RoomAudio` via `carExtras`) and headlight beams (additive cones in
`CarMesh`, local only, not sent to others) in the "In the car" group.
Left: passengers, parking at home, locks. Original note: Horn, headlights, car radio
(procedural tracks), friends riding along as passengers (online), parking at
home, and car locks (C2 assumes locks; none exist yet).

### C. Crime and homes (M6b, needs A5)

**C1. Break-ins and home defense (L).** Door locks (exist), unlocked doors
enterable by others online, intruder warning, the home gun (cartoon
knock-out), wake at a hospital room and drop carried items, or call police
NPCs (`src/game/police/arrest.ts`) who jail the intruder. Safety rules:
offline auto-lock, blocked players never enter, repeated break-ins auto-block
and report.

**C2. Car theft (M).** Unlocked parked cars online; police recovery.

**C3. Friend bail (S).** Friends pay bail from the jail panel (`JailHud`).

**C4. Shoplifting polish (S). Done 2026-10-23:** kept the apartment shelf
as a practice shelf (it drives the arrest-flow browser test); the lift panel
lists each watcher looking or away (`isWatching`). 3D sight cones would need
watchers placed as shop NPCs; not done. Original note: Remove the apartment stub shelf and its hint
(`Overlay.tsx` apartment hint, `ShopliftPanel.tsx`, World `onShelf`), or
keep it as a practice shelf; add sight-cone visuals in shops (today watchers
are beat-based, `watchersFacing`).

### D. Needs the user's approval or decisions

**D1. Deploy.** See §2 "Not deployed" and `docs/deploy.md`: `wrangler
login`, `wrangler d1 create`, replace the placeholder `database_id`
(`00000000-…`) in `server/wrangler.jsonc`, apply migrations remotely, set
`ALLOWED_ORIGINS`, measure PBKDF2 against the free plan's 10 ms CPU limit
(Paid plan or fewer iterations), make the user an admin, deploy, turn online
on by default, rerun the smoke test against production. Do A0 first. Every
step needs the user's approval.

**D2. Age gate and 18+ area (M10).** Birthdate at signup, locked on the
server; under-16 can't sign up; 18+ unlocks automatically; guests never see
18+. Then the weed lounge/smoke shop polish, shrooms trip, Lanmaoa elves, and
the secret strip club (behind the speakeasy, the `jazz-club` Midnight Horn
can host the unmarked door) and massage parlor (upstairs from the nail bar),
suggestive only. Read the M10 section of the master roadmap; confirm the
design with the user before building.

**D4. Open questions for the user** (master roadmap §8): the mango line in
VISION ("subtle mango references" or "one rare easter egg"), an optional
landing page, placeholder names. VISION still describes toon,
doll-proportion avatars, which the user rejected for the semi-realistic 3D
doll; update it once confirmed.

**D3. Day–night.** The user wants the city always night (neon, fireworks);
M11's day–night clock was deliberately skipped. Ask before revisiting.

### E. Polish and launch (M11)

- Measured 2026-10-23 on the low tier (1280x800, SwiftShader, calls /
  triangles): Amusement Park 167 / 191k, city 113 / 254k (closest to the
  300k cap), Pulse 115 / 115k, Plaza 105 / 149k, Water Park 63 / 92k,
  Galleria 89 / 39k, Speedway 56 / 51k, Zoo 40 / 29k. All within budget.
- Performance pass on a mid phone: 30 fps low tier, 16 ms frames on the
  high tier; re-measure the heaviest rooms (Galleria, Pulse, Water Park,
  Speedway, Amusement Park, which a note once put near 370k triangles on
  low; the Super Slide commit measured 179 calls and 211k).
- Accessibility: keyboard play, labels, axe-clean dialogs (Speedway test
  already runs axe), reduced motion, effects intensity.
- Fix boots-over-jeans poke-through (outfit tuck shape keys).
- Regenerate all screenshots at the end.
- Test infrastructure: the machine is shared and CPU-bound; a GPU-backed
  headless Chrome or cloud CI (GitHub Actions is manual-only for billing)
  would cut the 1.6 h suite and end load flakes. Suggest to the user.

### F. Unverified (check before relying on them)

- Ponytail and braids may still be the older hair cards, not strand hair.
- Salon: whether you can preview a style before paying.
- An eating animation, and clinking drinks with others: no clips found.
- Guns stay in game zones because they only exist inside game rooms; the
  roadmap's `src/game/weapons/` pickup/return module was never built.
- The online spec's planned tests that `tests/online.spec.ts` doesn't cover:
  a block hiding a player, a full room opening a new copy, the server
  stopping mid-session falling back to offline.

## 5. Suggested order for the next session

0. B11 prizes for unscored games and B13 speakeasy cards (quick, high value).
1. ~~A1 couple emotes~~ (done; piggyback left).
2. ~~A2 cook-off~~ (done).
3. ~~C4 shoplifting cleanup and B9 car wraps~~ (done).
4. ~~B2 beach volleyball, B3 shooting range~~ (done).
5. B1 Water Park expansion.
6. A0 online must-haves, then ask the user about D1 deploy and D2 age gate;
   then A5 and the M6b chain.
7. The long tail in B12–B19 and B7, picking what the user asks for.
