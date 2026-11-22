# Online city sync: pedestrians, lights and traffic (#9)

## Why

Two players in the same city copy should see the same pedestrians, the same
signal lights and (as far as a game with local dodging allows) the same cars.
PR #193 pinned pedestrians and lights to the wall clock. Two gaps remain:

1. The wall clock is each player's own `Date.now()`, so a phone that is a
   minute off sees different lights and walkers.
2. NPC cars are stepped per client from their own start time, and each car
   also dodges its own player, so cars differ between players.

## Approach: shared clock, shared seed, snap when unseen

Streaming every NPC is out (64 KB packets, free-tier Durable Object limits).
Everything the city simulates is already a function of a seed and a clock, so
the fix is to make the clock and the starting state shared.

### 1. A server-owned clock

- The `snapshot` frame the server sends on every join gets an optional `time`
  (server `Date.now()`, ms). `decodeServerMessage` accepts it only as a finite
  non-negative integer within the `Date` range; anything else drops the field
  (older servers send none).
- `OnlineSession` turns it into an offset (`time - local now`) and hands it to
  `setClockOffset` in `src/game/clock.ts`. `wallSeconds()` is
  `(Date.now() + offset) / 1000`, so pedestrians, lights, dance-offs, fireworks
  and the parade all read server time with no other change. Offline the offset
  stays 0 and `clockSynced()` is false: the single-player path is untouched.
- A later snapshot moves the offset only when it differs by more than 250 ms,
  so changing rooms never makes the sky and the walkers jump by network jitter.
- Known error: the stamp is the server's send time, so every client runs one
  network trip (tens of ms) behind it, and clients differ by their latencies.
  A walker moves 1.4 m/s and a car up to ~14 m/s, so that is under a meter.

### 2. A deterministic reference fleet

`src/game/city/trafficSync.ts` runs a player-less copy of the traffic
(`createTraffic(TRAFFIC_COUNT.high, TRAFFIC_SEED)`, the largest fleet, so every
quality tier's cars are a prefix of it) at the fixed 50 Hz tick, aligned to
the shared clock:

- Time is cut into eras of `TRAFFIC_ERA` (180 s). Each era restarts the fleet
  from `createTraffic` at the era's start and steps it tick by tick to "now",
  with the signal clock set from the tick index, so any two clients with the
  same shared time hold the same fleet (same code, same inputs).
- A client that joins mid-era catches up at most `CATCH_UP_TICKS` ticks per
  frame (about 9000 ticks in total), so there is no hitch. Until it has caught
  up it keeps its local fleet.
- The reference ignores the player, the bus, the food truck and the hailed
  taxi, which are local. It only runs when the clock is synced (online).

### 3. Local cars keep dodging, and snap back when nobody can see

The visible fleet is still the local simulation (it brakes for the local
player, the bus and the taxi, so driving and hits feel the same as offline).
About twice a second `reconcileTraffic` compares it with the reference: a car
that is out of step is copied from the reference (lane, position, speed, next
turn) only when both its local and its reference position are beyond the draw
range of the player, so a correction is never seen. The first time the
reference is caught up every car is adopted at once (the join is the moment
nobody has seen the city yet). Cars with a trip (the taxi) are never touched.

Result: two players on the same corner see the same car at the same place
(to within what the interaction with a local player changes), and a car that
one player brakes for rejoins the shared schedule as soon as it leaves view.

## Known gaps (not in this PR)

- Cars brake for the local player only, so player A's car may drive "through"
  player B on A's screen. Fix: pass the remote players' positions to
  `stepTraffic` as walkers (cost: an array of vec2; no protocol change).
- Quality tiers: a low-tier client has 8 cars, a high-tier one 22, so a low
  car's headroom differs from the same car on a high client until the snap.
- #205 knockdowns and dodges (`streetKnocks.ts`, `carHits.ts`) stay local.
  To sync them: send one small `knock` game message (`{ id, t }`) when the
  local player is hit and let peers play the same fall from the shared
  clock; the car's halt would ride on the same message.
- `Math.sin` in `hash` and `Math.cos` in `carPose` are engine-defined to the
  last bit; across browser engines a car could differ by a rounding error,
  which the snap-back corrects.
- No Playwright test of two engines side by side beyond the existing online
  e2e: `tests/online.spec.ts` gets one assertion that both players read the
  same traffic phase.
