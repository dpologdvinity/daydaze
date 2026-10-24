# Plan: the wonder pass (2026-10-24)

**Spec:** [docs/specs/2026-10-24-wonder-pass.md](../specs/2026-10-24-wonder-pass.md)
(the binding authority; this plan argues from it).

**For the executor.** Run this with `superpowers:executing-plans`. Each
`### Task N` below is a self-contained brief: goal, files, steps in TDD
order, the commands to run with what to expect, and the acceptance bar.
Work on `main` (the owner allows direct commits and pushes; see Global
constraints), one task at a time, in the order given. Tasks marked
**[OWNER-GATED]** wait until the owner checks the matching item in
`STEPS-FOR-OWNER.md` (repo root, git-excluded); skip them and come back.

## Context you need first

Read, in this order, before Task 1:

1. `CLAUDE.md` (local, untracked): repo rules, commands, gotchas.
2. `docs/VISION.md`: audience, tone, rules (adult, no AI dialogue, all audio
   procedural, 18+ gated, never the trademarked doll brand name, American
   spelling).
3. `ARCHITECTURE.md`: layers and where things live.
4. The spec above.
5. `docs/plans/2026-10-23-next-steps.md` §3 ("How work gets done here") and
   its Gotchas list.
6. `STEPS-FOR-OWNER.md`: what's blocked on the owner.

## Global constraints

- **Definition of done (every task):** unit tests for new rules (pure code in
  `src/game/`, Node test runner), a Playwright test for the visible flow,
  low-tier budget held (< 250 draw calls, < 300k triangles, ≤ 4 real lights;
  check `data-calls` / `data-triangles` on the canvas), `npm run verify`
  green (lint, tests, typecheck, Prettier, build), a screenshot looked at,
  reduced motion respected (`useReducedMotion`), keyboard and touch
  playable, docs updated (`docs/plans/2026-10-23-next-steps.md`, and README
  / ARCHITECTURE when structure changes).
- **The owner's bar:** "every aspect full of wonder, never half-assed." A
  game is not done as a side panel: the doll animates, the room reacts,
  sound follows the action. If a task can only ship a stopgap, say so in
  the ledger as a Ruling and in the final message.
- **Code:** strict TypeScript, no `any`, no needless `as`, no lint or
  ts suppressions to get green. Every file has a header comment; exports
  have docstrings. Rules live in `src/game` (no React/three there);
  `src/client` draws. Allocate nothing inside `useFrame`. Validate anything
  from the network or `localStorage`.
- **Commits:** Conventional Commits, small and atomic, pushed to `origin
  main` after verify and the relevant browser tests pass. Pushes bypass the
  branch protection as admin (expected message "Bypassed rule violations").
  Never commit `CLAUDE.md`, `.claude/`, `.superpowers/`, `.mcp.json`,
  `.env`, `STEPS-FOR-OWNER.md`, `docs/agents/`. Never deploy or log in to
  Cloudflare without the owner's go-ahead.
- **Browser tests:** `PORT=5196 npx playwright test -g "<name>" --workers=1`.
  Run `npm run test:e2e:online` after touching `src/net`, `src/client/net`
  or `server/`. Don't edit `src/` while Playwright runs (HMR reloads pages).
- **Reviews:** after each phase, run `superpowers:requesting-code-review` on
  the phase's commit range and fix Critical/Important findings with a
  failing test first.

## Working notes from the last session (read; they save hours)

- The machine is shared and CPU-bound (other projects run `llama_ref`, Go
  builds, clang-tidy). Headless WebGL is SwiftShader. A browser test that
  fails on the first load or times out under load average > 20 is usually a
  flake: check `uptime`, rerun it alone once before debugging.
- **Never run two Playwright runs at once on one port or one log file.** A
  backgrounded run keeps going; check `ps -eo pid,args | grep "[p]laywright
  test"` and `ss -ltnp | grep 519` and kill by PID before starting another.
  Never `pkill -f` (it kills your own shell, exit 144).
- Stale wrangler on 8798 after an aborted online run blocks the next one
  ("is already used"): kill it by PID from `ss -ltnp`.
- Panels the player opens on purpose (peer card, Friends) sit at
  `z-index: 6` so open game panels (`z-index: 5`) can't cover their buttons;
  keep that rule for any new opened-on-purpose panel.
- `?still=1` stops after ~10 frames; screenshot scripts should wait for
  `canvas[data-frames="10"]` without `still`, then capture via CDP
  (`Page.captureScreenshot`); `page.screenshot` can hang on WebGL. Ad-hoc
  scripts live in the git-ignored `art/textures/.cache/*.mjs` (e.g.
  `snap.mjs`, `wrap.mjs`, `hugprobe.mjs`, `perf.mjs`, `bytes.mjs`,
  `budget.mjs`).
- The Chrome DevTools MCP needs a Chrome on port 9222 and wasn't running;
  `perf.mjs` / `bytes.mjs` measure FCP, LCP, long tasks and transfer via
  Playwright + CDP instead (Fast 4G throttling).
- Mixamo clips: `./mixamo/<category>/*.fbx`. Useful finds: `talking/
  Singing_Singing-While-Walking-On-Stage`, `running/Run-To-Dive_...`,
  `sports/Goalie-Throw_...` (overhand, spike-like), `sports/Receiver-Catch_
  ...` (dig-like), `drinking/Bartending_...`. `art/doll/blender/mocap.py`
  refuses `weapons/` and `combat/` clips by design, so aiming poses must be
  hand-keyed in `src/game/dance/moves.ts`. Retarget with Blender batch mode
  (`blender --background --factory-startup --python
  art/doll/blender/mocap.py`), which rewrites `src/game/dance/mocap.ts` and
  `mocapKeys.ts`.
- GitHub Actions can't run: the account's billing is failing (owner item).
  CI (`.github/workflows/ci.yml`) is written and will run once fixed.
- Doll parts now load their low-poly twin first and the full model only
  when the doll comes within LOD range (`Part` / `NearPart` in
  `HumanDoll.tsx`). Keep that pattern for new parts.
- Cloud saves: pushes wait for `account.cloudReady`; `refreshAccount()`
  keeps it for the same account (`stillReady`). Don't reintroduce a reset on
  room change.
- Effects use exact dependencies (ESLint `react-hooks/exhaustive-deps` is an
  error); read latest values through refs where re-running would be wrong.

## Phase 0. Foundations

### Task 1: Deterministic event clocks for tests

**Goal.** Timed events (dance-off, Pride night, fireworks, parade) can be
pinned to a fixed moment in tests so a slow load never misses the window.
The Pulse dance-off test failed under load because the shifted clock was
read early and the short window passed.

**Files.** `src/client/rooms/pulse/danceOffClock.ts`,
`src/client/city/eventClocks.ts`, `tests/client.spec.ts` (Pulse dance-off
test), a new pure helper in `src/game/clock.ts` (+ test).

**Steps.**
1. Write `src/game/clock.test.ts`: a `heldClock(every, intoSeconds)` stays
   at the same value however much real time passes; a `shiftedClock`
   (current behavior) advances. RED.
2. Implement `src/game/clock.ts` with both, header comment, docstrings.
3. Make `?danceoff=<s>` hold the dance-off clock at `<s>` seconds into a
   dance-off until the player first dances, then run from there (so the test
   can never miss it); keep the real clock without the flag.
4. Update the Pulse test to use the held clock; run it 3 times in a row.

**Commands.** `node --test src/game/clock.test.ts` → pass;
`PORT=5196 npx playwright test -g "dance-off" --workers=1 --repeat-each=3`
→ 3 passed.

**Acceptance.** Dance-off test passes 3/3 even with `stress` load; verify
green.

### Task 2: Animation clips for the in-world games

**Goal.** The doll can dig, spike, dive (pencil, swan, backflip, twist),
tuck, sing, stir, chop, and aim a pistol and a rifle.

**Files.** `art/doll/blender/mocap.py` (`MIXAMO_CLIPS`),
`src/game/dance/mocap.ts`, `mocapKeys.ts` (generated),
`src/game/dance/moves.ts` (hand-keyed poses), `src/game/dance/moves.test.ts`.

**Steps.**
1. In `./mixamo`, pick the best clip for each action (see Working notes);
   add each to `MIXAMO_CLIPS` with kind `emote` (not in the dance picker).
2. Rerun the retarget in Blender batch mode; check the generated ids.
3. Hand-key what Mixamo can't provide (aim pistol, aim rifle, tuck, the
   dive tricks if no clip fits) as `DanceMove`s in `moves.ts`, excluded from
   `PICKER_DANCE_MOVES` like `hug`.
4. Test: every new id resolves with `danceMove(id)`, none is in the picker.
5. Look at each on the doll in the lineup page
   (`/src/client/avatar/lineup.html?human=1&shot=body`) and screenshot.

**Commands.** `node --test src/game/dance/moves.test.ts` → pass.

**Acceptance.** Ten new moves, each screenshot-checked; verify green.

### Task 3: In-world game kit

**Goal.** Shared building blocks so each game scene is small: a ball
(parabola plus bounce), instanced splash and burst particles, a judge
score-card prop, a camera-shot helper, and a hook that plays a clip on the
player's doll for a game.

**Files.** Pure motion math in `src/game/motion/ball.ts` and
`src/game/motion/particles.ts` (+ tests); client pieces in
`src/client/rooms/shared/game3d/` (`Ball.tsx`, `Splash.tsx`, `Burst.tsx`,
`ScoreCard.tsx`, `useGameShot.ts`, `useGameClip.ts`).

**Steps.**
1. Tests first: `ballAt(launch, t)` follows a parabola and lands at the
   predicted spot; `bounce` keeps energy below 1; particle bursts are
   seeded and finish in their lifetime.
2. Implement the pure modules.
3. Build the client pieces: instanced meshes (`frustumCulled={false}` when
   instances start hidden), emissive materials, no new lights, nothing
   allocated in `useFrame`.
4. `useGameClip(move)` sets the player's doll dance to `move` while a game
   is active and restores the mood after (store-driven; see how `pairUp`
   overrides mood in `PlayerController.tsx`).
5. Add a dev page or a `?debug=1` button to preview the kit.

**Acceptance.** Kit unit tests pass; a preview screenshot shows ball, splash
and burst; budgets unchanged.

### Task 4: Lazy NPC dialogue

**Goal.** The 202 KB of handwritten lines leave the first-load bundle.

**Files.** `src/game/dialogue/pick.ts`, `src/game/dialogue/index.ts`,
`src/game/dialogue/pick.test.ts`, the app start (prefetch at idle).

**Steps.**
1. Test: before `loadDialogue()` resolves, `pickLine` returns `"..."`;
   after, real lines. RED.
2. Implement `loadDialogue()` with a dynamic `import("./index.ts")` (the
   `loadMocap` pattern); make sure nothing else imports the banks
   statically (`grep -rn "dialogue/index\|LINE_BANKS" src`).
3. Prefetch with `requestIdleCallback` (fallback `setTimeout`) at app start.
4. Measure: `npx vite build` and confirm the main `index-*.js` shrinks
   (record before/after gzip sizes in the commit message).

**Acceptance.** Main chunk smaller by roughly the dialogue's gzip size; NPCs
still talk (run the Back Room and amusement park tests).

## Phase 1. In-world games

Each task turns one panel game into an in-world game. Keep the pure engine
(already tested) and its prize; add a scene component and wire the panel to
show only score and controls.

### Task 5: Karaoke on stage

**Goal.** The player walks to the mic and sings; notes come down three lanes
on the big screen in time with the backing track; hits light the stage and
play the melody; NPCs cheer on streaks.

**Files.** `src/game/karaokeGame.ts` (chart from a tempo), tests;
`src/client/rooms/karaoke/` (new `Stage.tsx` scene, `session.ts`,
`KaraokePanel.tsx`); `src/audio/proceduralJukebox.ts` (expose the current
track's BPM and start time); `src/client/rooms/Karaoke.tsx`.

**Steps.**
1. Test: `chart(seed, bpm, startAt)` puts every note on a beat of that tempo
   (within 1 ms). RED, then implement (replace the fixed 0.6 s beat).
2. Jukebox: expose `currentTempo()` (BPM and the AudioContext time the
   track started); test the pure part.
3. Session uses the audio clock (`AudioContext.currentTime`) for both the
   chart and grading, so sound and notes never drift.
4. Scene: the doll walks to `MIC` (`src/game/karaoke.ts`) and plays the
   `sing` clip; the big screen draws the three lanes and falling notes
   (instanced quads on a canvas texture or meshes); stage light strips pulse
   on hits (emissive intensity); booth NPCs play a cheer emote after 4 hits
   in a row.
5. Each hit plays the note's pitch through the jukebox's synth; misses play
   a soft off note.
6. Camera shot for singing; reduced motion turns off the light pulse.
7. Playwright: sing a song, see `data-karaoke-hits` rise, prize card shows.

**Acceptance.** Screenshot of the stage mid-song; notes visibly on the beat;
budgets held; verify green.

### Task 6: Beach volleyball at the net

**Goal.** A real rally at the city beach net: the ball arcs over, two NPC
opponents move to it, your doll digs and spikes, sand puffs on landings.

**Files.** `src/game/volleyball.ts` (add ball targets per touch, tested),
`src/client/city/VolleyCourt.tsx` (new scene piece in the city), the kit
from Task 3, `src/client/city/VolleyStop.tsx` (panel shows score only).

**Steps.**
1. Test: each rally step produces a ball launch (from, to, apex) that lands
   on the right side of the net; opponents' positions follow the ball.
2. Scene: render the ball with the kit, opponents as NPC dolls with dig and
   spike clips, the player's doll plays dig/spike on press (Task 2 clips),
   sand puffs on landing.
3. Camera shot behind the player while playing.
4. Playwright (existing beach test still passes) plus a check that
   `data-volley-ball` changes during a rally.

**Acceptance.** Screenshot mid-rally; the city budget still under the cap
(city is closest: 254k triangles, so keep the court tiny).

### Task 7: Pool volleyball in the Water Park

**Goal.** The beach court reused in the pool, waist deep, with splashes.

**Files.** `src/client/rooms/waterpark/PoolCourt.tsx`, reuse Task 6 pieces.

**Acceptance.** As Task 6, in the Water Park; splash instead of sand.

### Task 8: Cliff dive off the tower

**Goal.** The doll climbs the tower, performs the chosen trick (rotation per
trick), and enters the water with a splash sized by the entry grade; a judge
NPC holds up the score.

**Files.** `src/game/cliffDive.ts` (trick rotation curves, tested),
`src/client/rooms/waterpark/DiveScene.tsx`, kit pieces, `DivePanel.tsx`.

**Steps.** Test the rotation curve per trick (ends upright, total rotation
matches the trick); animate along the tower (`TOWER` in `waterPark.ts`);
splash size from `entryOf`; judge card via `ScoreCard`.

**Acceptance.** Screenshot mid-dive and at the splash; verify green.

### Task 9: Speed slide race, ridden

**Goal.** The player rides the slide (existing `startRide`) and tucks at
bends; a rival NPC rides the twin; bend markers flash on time.

**Files.** `src/game/speedSlide.ts` (bend positions along the slide path),
`src/client/rooms/waterpark/SlideRace.tsx`, `slideSession.ts`.

**Acceptance.** Bends flash in sync with the ride; finish splash; prize;
screenshot.

### Task 10: Water-gun battle in the pool

**Goal.** Replace the Gallery dialog: floaties bob in the pool, the doll
aims a water gun (hand-keyed pose), hits make floaties spin and splash.

**Files.** `src/game/waterGuns.ts` (targets, hits; reuse Midway gallery math
where it fits), `src/client/rooms/waterpark/WaterGuns.tsx`,
`WaterGunPanel.tsx`.

**Acceptance.** Playable with mouse, keyboard and touch; prize; screenshot.

### Task 11: Cook-off at the stove

**Goal.** The doll stands at the Kamayan Hall stove and chops/stirs per
ingredient; ingredients appear in the wok; steam; a rival cook at the next
stove (NPC, or the online rival's doll in a match).

**Files.** `src/client/rooms/kamayan/Stove.tsx`, `CookOffPanel.tsx`,
ingredient props (low-poly, instanced).

**Acceptance.** Screenshot of a plate being built; prize; online cook-off
step still green.

### Task 12: Target range lanes

**Goal.** Replace the Gallery dialog at Photon Zone with lanes in the room:
light pistol or rifle (hand-keyed aim poses), sliding glowing targets, light
bursts on hits.

**Files.** `src/client/rooms/lasertag/Range.tsx`, `RangePanel.tsx`.

**Acceptance.** Playable, prizes `range-pistol` / `range-rifle` kept;
screenshot.

### Task 13: Haunted escape, walked

**Goal.** Each depth of the escape is a different room set inside the
Haunted House; wrong doors trigger an in-world scare (a doll head turns,
candles out, a sheet slides) with a sound stinger.

**Files.** `src/client/rooms/haunted/` (room sets, scares),
`src/game/hauntedRun.ts` (unchanged engine), `EscapePanel.tsx`.

**Acceptance.** Screenshots of two depths and one scare; reduced motion
softens scares; no gore.

## Phase 2. Fast to playable

### Task 14: Shader warm-up

**Goal.** Compile common materials during the loading veil so the first
frames don't stall. **Files.** `src/client/world/World.tsx`,
`src/client/ui/LoadingVeil.tsx`. **Steps.** Call `gl.compile(scene,
camera)` once the room's scene is mounted but before the veil lifts;
measure long-task total with `art/textures/.cache/perf.mjs` before and
after (3 runs each). **Acceptance.** Lower long-task total; no visual
change.

### Task 15: Interactive lobby while the world streams

**Goal.** The player can chat and use the closet while the room loads.
**Files.** `src/client/App.tsx`, `src/client/ui/LoadingVeil.tsx`.
**Acceptance.** Chat and closet usable before `data-frames=10`;
Playwright test.

### Task 16: Service worker

**Goal.** Return visits load from cache. **Files.** `public/sw.js` (or a
Vite plugin), registration in `src/client/main.tsx`. **Rules.**
Cache-first for hashed `assets/`, `models/`, `textures/`; network-first for
HTML; never cache `/api` or `/ws`; versioned cache names; an update prompt
when a new version is waiting. **Tests.** A Playwright test that a second
load is served from the service worker. **Acceptance.** Second-visit
transfer near zero for assets.

### Task 17: Asset diet

**Goal.** Shrink low-poly hair GLBs (180–290 KB each) and size textures per
tier. **Files.** `scripts/optimize-doll.sh`, `art/doll/blender/`,
`public/models/doll/`, `src/client/city/worldTexture.ts`. **Acceptance.**
Downtown cold transfer (`bytes.mjs`) down from 5.75 MB; no visible loss in
a near screenshot.

### Task 18: Perf budgets in CI

**Goal.** CI fails when the initial JS or the Downtown cold transfer grows
past budget. **Files.** `scripts/perf-budget.ts`, `.github/workflows/ci.yml`,
`package.json` (`perf:budget`). **Budgets.** Initial JS (gzip) < 600 KB;
dist size per asset class recorded. **Acceptance.** Script passes locally;
CI step added.

## Phase 3. Real players

### Task 19: Share links

**Goal.** `/?join=<room>.<copy>` opens straight into that room copy online;
a "Copy invite link" button on the room card. **Files.**
`src/client/flags.ts`, `src/client/net/online.ts` (`joinCopy`),
`src/client/ui/Overlay.tsx`. **Tests.** Parse/validate the param (unit);
online spec step: A copies a link, B opens it and lands in A's copy.

### Task 20: First-visit onboarding

**Goal.** Name, a preset doll (3 presets plus "customize"), walking, the
city map, one game, in under a minute, skippable, shown once (save flag).
**Files.** `src/game/save.ts` (`onboarded`, tested), `src/client/ui/
Onboarding.tsx`. **Acceptance.** Playwright: a fresh save sees it, a skip
never shows it again.

### Task 21: Landing page [OWNER-GATED: open question 4]

**Goal.** A static, fast page with screenshots, a short pitch in the brand
voice, and "Play as a guest". **Files.** `index.html`/`landing.html`, Vite
config. **Acceptance.** Lighthouse-style lab numbers good; links work.

### Task 22: Age gate [OWNER-GATED: D2]

**Goal.** Birthdate at signup, stored and locked server-side; under 16 can't
sign up; 18+ unlocks automatically; guests never see 18+ rooms; the server
checks every 18+ room join. **Files.** `server/migrations/0003_birthdate.sql`,
`server/src/worker/index.ts`, `server/src/roomCore.ts`, `src/game/age.ts`,
signup UI. **Tests.** Server unit tests and smoke checks for each rule.

### Task 23: Deploy [OWNER-GATED: D1, billing, secrets]

**Goal.** Run `.github/workflows/deploy.yml`, apply D1 migrations, measure
PBKDF2 cost against the plan's CPU limit, smoke test production. Only after
the owner approves in writing.

### Task 24: Online on by default [OWNER-GATED: after Task 23]

**Goal.** Online without a flag (`?online=0` opts out). **Files.**
`src/client/net/online.ts`, tests that relied on offline default.

## Phase 4. Social play

### Task 25: Party invites

**Goal.** Invite friends to a party; the party moves together through doors
(followers join the leader's room copy). **Files.** relay messages in
`src/game/party.ts` (+ tests), `src/client/net/party.ts`, a panel.
**Tests.** Unit codec tests; online spec step.

### Task 26: Passengers

**Goal.** A friend rides in your car: a passenger seat on the car; the
driver's moves carry the passenger. **Files.** `src/game/peerAction.ts`
(passenger code), `src/client/city/PlayerCar.tsx`, relay invite.
**Tests.** Codec tests; online spec step.

### Task 27: Piggyback emote

**Goal.** The follower attaches to the lead's back bone with a carry pose;
both move as one. **Files.** `src/game/dance/together.ts`, `moves.ts`,
`OnlinePeers.tsx`, `HumanDoll.tsx` (attach). **Tests.** Codec and placement
tests; online spec step.

### Task 28: Race friends

**Goal.** Two players race the same Speedway track with a shared seed and
start time over the relay. **Files.** `src/game/speedway/`,
`src/client/net/race.ts`. **Tests.** Shared-start unit test; online step.

### Task 29: Karaoke duet (after Task 5)

**Goal.** Two players alternate lines on the same chart; combined score.

### Task 30: Beach volleyball 2v2 (after Task 6) [OWNER-GATED: open question 2]

**Goal.** Two players per side; one client is rally host (or the server, per
the owner's answer); hits relayed.

## Phase 5. Coming back

### Task 31: Event calendar

**Goal.** A weekly schedule of club nights (Pride, Y2K, Latin, chiptune) and
city events, on the city map with countdowns; themed music, lights and NPC
lines (`when: { event: ... }` in dialogue). **Files.** `src/game/events.ts`
(+ tests), `CityMap.tsx`, club scenes, dialogue role files (handwritten
lines, 10+ per event).

### Task 32: Collections

**Goal.** A photo album (places visited, snapshots), closet sets with a
reward, a sticker book for game grades. **Files.** `src/game/collections.ts`
(+ tests), save fields, a panel.

### Task 33: Apartment visits online

**Goal.** Per-owner apartment room copies (`apartment` keyed by owner id);
friends can visit when unlocked (replaces the current solo rule).
**Files.** `server/src/routes.ts`, `roomInstance.ts`, `src/game/rooms.ts`
(`SOLO_ROOMS`), `online.ts`. **Tests.** Server unit tests, online step.

### Task 34: Server economy (A5) [OWNER-GATED: after Task 23]

**Goal.** Coins and bests move to D1 with server-validated awards (a score
accepted only from a server-known game session, with plausibility checks).

### Task 35: Weekly leaderboards (after Task 34)

## Phase 6. Doll diversity

Blender work in `art/doll/blender/`; each part gets a low-poly twin through
`scripts/optimize-doll.sh` (`--flatten false --palette false
--prune-attributes false`; shape keys at 0 before export) and a closet entry.

### Task 36: Textured hair (locs, box braids, cornrows, bantu knots, twist-out, puffs)

**Acceptance.** Each part is pickable in the closet, renders correctly with
every outfit and both body extremes, has a low-poly twin, keeps budgets, and
shows in a lineup screenshot (`/src/client/avatar/lineup.html?human=1`).
Unit-test any new `Look` field in `look.test.ts` (and `validateLook`'s
16-key wire limit in `isLookShape`: today a full look uses 15).
### Task 37: Short hair (buzz cut, shaved sides, bald, edges)

**Acceptance.** Each part is pickable in the closet, renders correctly with
every outfit and both body extremes, has a low-poly twin, keeps budgets, and
shows in a lineup screenshot (`/src/client/avatar/lineup.html?human=1`).
Unit-test any new `Look` field in `look.test.ts` (and `validateLook`'s
16-key wire limit in `isLookShape`: today a full look uses 15).
### Task 38: Body range including plus-size, with outfit shape keys

**Acceptance.** Each part is pickable in the closet, renders correctly with
every outfit and both body extremes, has a low-poly twin, keeps budgets, and
shows in a lineup screenshot (`/src/client/avatar/lineup.html?human=1`).
Unit-test any new `Look` field in `look.test.ts` (and `validateLook`'s
16-key wire limit in `isLookShape`: today a full look uses 15).
### Task 39: Head coverings and accessories (hijab, head wrap, turban, bindi, hearing aids)

**Acceptance.** Each part is pickable in the closet, renders correctly with
every outfit and both body extremes, has a low-poly twin, keeps budgets, and
shows in a lineup screenshot (`/src/client/avatar/lineup.html?human=1`).
Unit-test any new `Look` field in `look.test.ts` (and `validateLook`'s
16-key wire limit in `isLookShape`: today a full look uses 15).
### Task 40: Skin and face (vitiligo, birthmarks, monolid option)

**Acceptance.** Each part is pickable in the closet, renders correctly with
every outfit and both body extremes, has a low-poly twin, keeps budgets, and
shows in a lineup screenshot (`/src/client/avatar/lineup.html?human=1`).
Unit-test any new `Look` field in `look.test.ts` (and `validateLook`'s
16-key wire limit in `isLookShape`: today a full look uses 15).
### Task 41: Wheelchair (model and seated locomotion everywhere) and prosthetics

**Acceptance.** Each part is pickable in the closet, renders correctly with
every outfit and both body extremes, has a low-poly twin, keeps budgets, and
shows in a lineup screenshot (`/src/client/avatar/lineup.html?human=1`).
Unit-test any new `Look` field in `look.test.ts` (and `validateLook`'s
16-key wire limit in `isLookShape`: today a full look uses 15).


## Phase 7. Tests

### Task 42: Browser suite in CI [OWNER-GATED: billing]

**Goal.** Run the sharded browser suite on every PR (extend `ci.yml` or make
`playwright.yml` run on PRs).

### Task 43: Flake sweep

**Goal.** Replace any time-window waits with state waits or held clocks;
five consecutive green full-suite runs.

## Running order

Tasks 1–4 → 5, 6 → 14 → 7–13 (interleave 15–18 between games) → 19, 20 →
25–28 → 31–33 → 29 → 36–41 → owner-gated tasks as they unblock → 42, 43.
