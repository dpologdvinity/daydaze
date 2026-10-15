# Speedway and Driving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared arcade car model, and the Speedway venue on top of it. The Speedway has a race track (solo time trial against bots) and a bumper car arena. Phase 3 of the open city later reuses the same car model for street driving.

**Architecture:**
- Car physics, track data, laps, bots and bumper collisions live in pure, Node-tested modules under `src/game/driving/` and `src/game/speedway/`. They step on a fixed 50 Hz tick.
- The client in `src/client/rooms/Speedway.tsx` and `src/client/rooms/speedway/` interpolates between ticks for rendering. It reads input through the shared action layer.
- The Speedway is a gated venue room (`"speedway"`), entered from the Plaza for now and from the city later.

**Tech Stack:** TypeScript strict, React 19, React Three Fiber 9, drei 10, three 0.186, Node test runner, and Playwright.

**Specs:**
- `docs/specs/2026-10-14-world-content-design.md`: Cars, Speedway, Games roster (Bumper cars; Race track), Non-player characters, Rides.
- `docs/specs/2026-10-14-open-city-design.md`: Moving around (car model, chase camera, reduced motion) and Build phases.

## Global Constraints

- No real car brands, models, logos or badges. Cars are "clearly based on a real car" in silhouette, class and feel, under original names.
- No `any`. No `as` where a type guard or `as const` works. React 19: `import type { JSX } from "react"`.
- No physics engine dependency. Use a kinematic bicycle model in pure TypeScript.
- No AI dialogue. Pit crew and Speedway NPC lines come from `src/game/dialogue/` (built on `feat/npc-lines`), using the `pit-crew`, `ticket-cashier` and `ride-operator` roles.
- Reduced motion: the chase camera is steadier and higher, with no camera shake, and the side view is available.
- Low quality tier: 30 fps on a mid phone, under 250 draw calls, at most 4 real lights.
- CPU: run heavy commands under `taskset -c 6-11`, and Playwright with `--workers=2`.
- Never push or deploy.

## Review Focus

1. **A large frame gap**, such as a backgrounded tab returning after 10 s. The fixed-step accumulator must clamp, at most 5 ticks per frame, so the car does not teleport through walls. Test this in Task 1.
2. **Driving backwards across the start line.** Driving backwards over the line and forwards again must not count a lap. Test this in Task 3.
3. **A car stuck against a wall with the throttle held.** Speed must stay bounded, the car must not jitter through the wall, and reverse must free it. Test this in Task 2.
4. **Two bumper cars hitting head-on at the same tick.** Both must bounce apart, with no overlap left after the tick and no NaN. Test this in Task 5.
5. **Touch only, with no keyboard.** The on-screen pedals and steering must drive the car on a 390×844 phone. Test this in Task 7's Playwright check.

---

### Task 1: Fixed-step clock

**Files:**
- Create: `src/game/driving/fixedStep.ts`
- Test: `src/game/driving/fixedStep.test.ts`

**Interfaces:**
- Produces:
  - `export const TICK_HZ = 50`
  - `export type StepClock = { accumulator: number }`
  - `export function advance(clock: StepClock, dtSeconds: number, step: () => void): number`. It runs `step` once per whole tick and returns the interpolation alpha in [0, 1). It clamps to `MAX_TICKS_PER_FRAME = 5`.

- [ ] **Step 1:** Write the tests:
  - `advance` with dt 0.05 runs 2 ticks and returns alpha ≈ 0.5 with dt 0.01 carried over.
  - dt 10 runs exactly 5 ticks.
  - A negative or NaN dt runs 0 ticks.
- [ ] **Step 2:** Run `npm test` and confirm it FAILS (module missing).
- [ ] **Step 3:** Implement `advance`.
- [ ] **Step 4:** Run `npm test` and confirm it PASSES.
- [ ] **Step 5:** Commit `feat(game): add a fixed-step clock for vehicles`.

### Task 2: Car model and roster

**Files:**
- Create: `src/game/driving/car.ts`
- Create: `src/game/driving/roster.ts`
- Test: `src/game/driving/car.test.ts`
- Test: `src/game/driving/roster.test.ts`

**Interfaces:**
- Consumes: `Vec2` from `src/game/walk.ts`, and `TICK_HZ` from Task 1.
- Produces:
  - `export type CarClass = "beater" | "everyday" | "y2k" | "luxury" | "exotic" | "kart" | "bumper"`
  - `export type CarSpec = { id: string; name: string; basedOn: string; class: CarClass; topSpeed: number; accel: number; brake: number; turnRate: number; grip: number; length: number; width: number; seats: number; price: number }`. Units: m/s, m/s², rad/s, 0..1, m and coins. `basedOn` is a plain-words description for designers, such as "2000s compact sedan". It is never shown in the UI.
  - `export type CarInput = { throttle: number; brake: number; steer: number }`. Throttle and brake run 0..1, steer runs -1..1.
  - `export type CarState = { position: Vec2; yaw: number; speed: number }`
  - `export function stepCar(spec: CarSpec, state: CarState, input: CarInput, walls: readonly (readonly Vec2[])[]): CarState`. It advances one fixed tick with a bicycle model. Grip below 1 adds drift: heading lags yaw. A wall hit zeroes the speed component into the wall and pushes the car out along the normal.
  - `export const CARS: readonly CarSpec[]`. Seven starter cars:
    - a beater 2000s compact sedan, 900 coins
    - an everyday compact SUV, 4 000 coins
    - an everyday electric sedan, 9 000 coins
    - a Y2K bubbly hatchback, 3 500 coins
    - a luxury German-style executive sedan, 30 000 coins
    - an exotic Italian-style supercar, 120 000 coins
    - a kart (Speedway only, 0 coins)
  - `export const BUMPER_CAR: CarSpec`
  - `export function carById(id: string): CarSpec | null`

- [ ] **Step 1:** Write the car tests:
  - From rest with full throttle, speed reaches `topSpeed` and never exceeds it.
  - Brake from top speed stops the car in under `topSpeed / brake + 0.1` s.
  - steer = 1 at speed turns yaw positive. At speed 0, yaw does not change.
  - Full throttle into a wall for 200 ticks: the position stays outside the wall polygon, the speed stays finite and ≤ `topSpeed`, and then reverse moves the car away.
  - Output values are finite for every input of ±Infinity or NaN. Treat them as 0.
- [ ] **Step 2:** Write the roster tests:
  - Ids are unique.
  - Prices increase from beater to exotic.
  - No name or `basedOn` matches the banned brand list. Reuse the list exported from `src/game/dialogue/` if it exists. Otherwise define `BANNED_BRANDS` in `roster.ts` and export it.
- [ ] **Step 3:** Run `npm test` and confirm it FAILS.
- [ ] **Step 4:** Implement `stepCar`, `CARS`, `BUMPER_CAR` and `carById`. Give the cars original names, for example "Quill Lite", "Pebble", "Arc S".
- [ ] **Step 5:** Run `npm test` and confirm it PASSES.
- [ ] **Step 6:** Commit `feat(game): add an arcade car model and starter roster`.

### Task 3: Track data and lap timing

**Files:**
- Create: `src/game/speedway/track.ts`
- Create: `src/game/speedway/laps.ts`
- Test: `src/game/speedway/track.test.ts`
- Test: `src/game/speedway/laps.test.ts`

**Interfaces:**
- Consumes: `Vec2`.
- Produces:
  - `export type Track = { id: string; name: string; centerline: readonly Vec2[]; width: number; checkpoints: readonly { a: Vec2; b: Vec2 }[]; grid: readonly { position: Vec2; yaw: number }[] }`. Checkpoint 0 is the start and finish line. `grid` holds at least 6 slots.
  - `export const TRACKS: readonly Track[]`. Two tracks: "Neon Oval" (easy) and "Boardwalk Loop" (medium, with a chicane).
  - `export function trackWalls(track: Track): readonly (readonly Vec2[])[]`. It returns the inner and outer barrier polygons offset by `width / 2`.
  - `export type LapState = { nextCheckpoint: number; lap: number; lapStartMs: number; bestLapMs: number | null; lapTimesMs: readonly number[] }`
  - `export function initialLap(nowMs: number): LapState`
  - `export function updateLap(track: Track, state: LapState, from: Vec2, to: Vec2, nowMs: number): LapState`. A crossing counts only for `nextCheckpoint` and only in the forward direction. Use the sign of the cross product along the centerline tangent.

- [ ] **Step 1:** Write the tests:
  - Every track's centerline is closed and has no self-intersection.
  - The grid slots lie inside the track.
  - A forward pass through all checkpoints completes lap 1 and records its time.
  - Skipping a checkpoint does not complete a lap.
  - Crossing the start line backwards and then forwards does not count a lap.
  - `bestLapMs` is the minimum lap time.
- [ ] **Step 2:** Run `npm test` and confirm it FAILS.
- [ ] **Step 3:** Implement the track data, `trackWalls` and `updateLap`.
- [ ] **Step 4:** Run `npm test` and confirm it PASSES.
- [ ] **Step 5:** Commit `feat(game): add Speedway tracks and lap timing`.

### Task 4: Race bots and race flow

**Files:**
- Create: `src/game/speedway/bots.ts`
- Create: `src/game/speedway/race.ts`
- Test: `src/game/speedway/bots.test.ts`
- Test: `src/game/speedway/race.test.ts`

**Interfaces:**
- Consumes: `stepCar`, `CarSpec`, `CarState`, `CarInput`, `Track`, `trackWalls`, `LapState` and `updateLap`.
- Produces:
  - `export type BotSkill = "easy" | "medium" | "hard"`
  - `export function botInput(track: Track, state: CarState, skill: BotSkill): CarInput`. It uses pure pursuit on the centerline: lookahead of 6, 9 or 12 m, and a speed cap of 70, 85 or 97% of topSpeed for easy, medium and hard.
  - `export type RacePhase = "grid" | "countdown" | "racing" | "finished"`
  - `export type Race = { track: Track; laps: number; phase: RacePhase; countdownMs: number; cars: readonly { id: string; spec: CarSpec; state: CarState; lap: LapState; isPlayer: boolean; skill?: BotSkill; finishedMs: number | null }[] }`
  - `export function createRace(track: Track, laps: number, playerSpec: CarSpec, bots: number, skill: BotSkill, nowMs: number): Race`
  - `export function stepRace(race: Race, playerInput: CarInput, nowMs: number): Race`. The countdown is 3000 ms. Input is ignored before "racing". The phase is "finished" when the player finishes.
  - `export function standings(race: Race): readonly string[]`. Car ids are ordered by laps, then by checkpoint, then by distance to the next checkpoint.

- [ ] **Step 1:** Write the tests:
  - A medium bot alone on each track completes 3 laps within 20 000 ticks and never leaves the track walls.
  - A hard bot's best lap is faster than an easy bot's.
  - Player input during the countdown does not move the player.
  - `standings` puts a car on lap 2 ahead of a car on lap 1.
- [ ] **Step 2:** Run `npm test` and confirm it FAILS.
- [ ] **Step 3:** Implement the functions.
- [ ] **Step 4:** Run `npm test` and confirm it PASSES.
- [ ] **Step 5:** Commit `feat(game): add race bots and race flow`.

### Task 5: Bumper car arena

**Files:**
- Create: `src/game/speedway/bumper.ts`
- Test: `src/game/speedway/bumper.test.ts`

**Interfaces:**
- Consumes: `stepCar`, `BUMPER_CAR` and `CarState`.
- Produces:
  - `export const ARENA: { walls: readonly (readonly Vec2[])[]; size: Vec2 }`. A 24 m × 16 m rounded rectangle.
  - `export type Bumper = { id: string; state: CarState; isPlayer: boolean; hits: number }`
  - `export function stepBumpers(cars: readonly Bumper[], playerInput: CarInput, tick: number): readonly Bumper[]`. Bots wander and target the nearest car. Circle–circle collisions use radius `BUMPER_CAR.width / 2 + 0.1` with a restitution of 0.8. Any car that hits another gets `hits + 1`.

- [ ] **Step 1:** Write the tests:
  - Two cars driving head-on at full speed: after the colliding tick their circles do not overlap, both speeds are finite, they move apart on the next tick, and both `hits` counts increment.
  - 6 bots stepped for 3000 ticks stay inside the arena and none produces NaN.
- [ ] **Step 2:** Run `npm test` and confirm it FAILS.
- [ ] **Step 3:** Implement `ARENA`, `Bumper` and `stepBumpers`.
- [ ] **Step 4:** Run `npm test` and confirm it PASSES.
- [ ] **Step 5:** Commit `feat(game): add the bumper car arena`.

### Task 6: Speedway room data and portal

**Files:**
- Modify: `src/game/rooms.ts`. Add `"speedway"` to `RoomId`, add a `ROOMS.speedway` entry, and add a Plaza portal `to-speedway`. If `feat/city-core` has merged by then, add a city door or gate instead.
- Test: `src/game/rooms.test.ts`. Add a case.

**Interfaces:**
- Produces:
  - `ROOMS.speedway`: walkable grandstand, pit lane and arena entrance.
  - Interaction spots, as data in `src/game/speedway/spots.ts`: `export const SPEEDWAY_SPOTS: readonly { id: "race-oval" | "race-boardwalk" | "bumper-cars"; position: Vec2; radius: number; label: string }[]`.

- [ ] **Step 1:** Write the tests:
  - `isRoomId("speedway")` is true.
  - The `to-speedway` portal's target spawn lies in the Speedway walkable area.
  - Every spot in `SPEEDWAY_SPOTS` lies inside the walkable area.
- [ ] **Step 2:** Run `npm test` and confirm it FAILS.
- [ ] **Step 3:** Add the room, portal and spots.
- [ ] **Step 4:** Run `npm test` and confirm it PASSES.
- [ ] **Step 5:** Commit `feat(game): add the Speedway room and entrance`.

### Task 7: Speedway scene, driving UI and camera

**Files:**
- Create: `src/client/rooms/Speedway.tsx`. Lazy-load it with `React.lazy`.
- Create: `src/client/rooms/speedway/`. Files: `Track.tsx` (instanced barriers and kerbs, lit by emissive strips), `Grandstand.tsx`, `PitGarage.tsx`, `BumperArena.tsx`, `CarMesh.tsx` (one low-poly body per `CarClass`, tinted per car), `ChaseCamera.tsx`, `DriveControls.tsx` (keys and on-screen pedals and steering), `RaceHud.tsx` (lap, position, time, best time).
- Modify: the room switch in `src/client/world/World.tsx`, with one additive case.
- Modify: `scripts/screenshots.ts`. Add the Speedway shots.
- Test: `tests/client.spec.ts`. Add a Speedway case.

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Consumes: input actions from the city action layer if it exists. Otherwise map keys locally: W/↑ is throttle, S/↓ is brake and reverse, A/D or ←/→ is steer.
- `ChaseCamera`: 6 m behind and 2.5 m above, with damping of 0.1. Under `prefers-reduced-motion` it is 9 m behind and 5 m above, with damping of 0.05 and no shake. A "Side view" toggle is always available.

- [ ] **Step 1:** Write the Playwright test "Speedway: race starts, car moves, HUD shows lap 1" at desktop and at 390×844.
  - Jump to the Speedway with `?debug=1`.
  - Tap the race spot, wait for the countdown to finish, then hold throttle for 2 s (the key on desktop, the on-screen pedal on mobile).
  - Assert that the HUD lap time is greater than 0 and that the car's position changed. Expose the position on `canvas[data-car-x]`.
  - Run axe with no new violations.
- [ ] **Step 2:** Run `taskset -c 6-11 npx playwright test -c playwright.config.ts --workers=2 -g Speedway` and confirm it FAILS.
- [ ] **Step 3:** Build the scene: a night track under floodlight-coloured emissive strips, a neon grandstand and a bumper arena with a glowing floor. Rendering samples the race state from Tasks 4–5 through `advance` with interpolation. Use no allocation in `useFrame`.
- [ ] **Step 4:** Run the Playwright test and confirm it PASSES. Run `taskset -c 6-11 npm run verify` and confirm it is green.
- [ ] **Step 5:** Take the screenshots:
  - `docs/screenshots/speedway-grid.png`
  - `docs/screenshots/speedway-racing.png`
  - `docs/screenshots/speedway-bumper.png`
  - `docs/screenshots/speedway-mobile.png` (390×844)
  Look at each one, and fix anything blank or dark.
- [ ] **Step 6:** Commit `feat(client): add the Speedway scene, driving controls and race HUD`.

### Task 8: Pit crew and Speedway NPCs

**Files:**
- Create: `src/client/rooms/speedway/Locals.tsx`
- Modify: `src/game/dialogue/` banks. Only add `event-ride-ended` and race-specific lines to the `pit-crew` and `ride-operator` roles if the bank is thin.
- Test: the existing dialogue bank tests cover the new lines.

**Interfaces:**
- Consumes: the dialogue picker from `src/game/dialogue/pick.ts` and the doll from `src/client/avatar/Doll.tsx`.

- [ ] **Step 1:** Add a test case to the dialogue tests: `pit-crew` has at least 10 `event-ride-ended` lines.
- [ ] **Step 2:** Run `npm test` and confirm it FAILS if the lines are missing.
- [ ] **Step 3:** Add the lines. Place the NPCs: a pit crew of two, a ticket cashier, a ride operator at the bumper arena, and grandstand fans. Tapping an NPC shows a line from the picker. A finished race triggers a pit-crew line.
- [ ] **Step 4:** Run `npm test` and `taskset -c 6-11 npm run verify` and confirm they PASS.
- [ ] **Step 5:** Commit `feat(client): add Speedway pit crew and staff`.

## Execution notes

- Tasks 1–5 are pure TypeScript and safe to run in a worktree in parallel with the scene work. Tasks 6–8 depend on Tasks 1–5.
- Start after `feat/water-park`, `feat/npc-lines` and `feat/amusement-park` have merged, and rebase onto main first. Task 2's banned-brand list and Task 8's dialogue depend on `feat/npc-lines`.
