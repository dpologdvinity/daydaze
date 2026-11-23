# src/game/speedway

Rules for the Speedway room: race tracks, bots, bumper cars and driving sessions. They build on the car physics in [`../driving/`](../driving/README.md); the room scene is `src/client/rooms/speedway/`.

## Files

| File                                     | What it does                                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `track.ts` (+ `track.test.ts`)           | Track geometry: the race tracks and the Marina's jet-ski course, each built from a closed centerline into checkpoints, a starting grid and barrier walls. |
| `layout.ts` (+ `layout.test.ts`)         | Where the bumper arena and race tracks sit in the room.                                                                                                   |
| `spots.ts`                               | The floor spots where the player taps to start a race or ride the bumper cars.                                                                            |
| `race.ts` (+ `race.test.ts`)             | Race rules: a grid of the player and bots, a countdown, fixed-tick driving, lap counting and live standings. Immutable; each step returns a new `Race`.   |
| `laps.ts` (+ `laps.test.ts`)             | Lap timing: checkpoints must be crossed in order and forward.                                                                                             |
| `bots.ts` (+ `bots.test.ts`)             | Race bots: pure-pursuit steering along the centerline with a speed cap per skill.                                                                         |
| `drafting.ts` (+ `drafting.test.ts`)     | Slipstream mechanics: trailing cars in a wake gain acceleration and top speed.                                                                            |
| `pit.ts` (+ `pit.test.ts`)               | Pit stops: holding at low speed in a pit box refuels and resets tire wear.                                                                                |
| `bumper.ts` (+ `bumper.test.ts`)         | Bumper cars: a walled arena, chasing bots and equal-mass bounces with a hit count.                                                                        |
| `friendRace.ts` (+ `friendRace.test.ts`) | Racing a friend: asked over the `game` relay, started with a shared wall-clock time.                                                                      |
| `session.ts` (+ `session.test.ts`)       | Driving sessions the client runs at a fixed tick: a race, a bumper game or your own car on the city streets. Mutated in place by `stepSession`.           |
