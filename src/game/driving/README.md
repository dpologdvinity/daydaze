# src/game/driving

Car physics, the car roster and racing data. The city's drive mode (`src/client/city/`) and the Speedway room (`src/client/rooms/speedway/`) read these; the Speedway's own track and session rules are in [`../speedway/`](../speedway/README.md).

## Files

| File                                     | What it does                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `car.ts` (+ `car.test.ts`)               | Arcade car physics: car specs, inputs, state and `stepCar`, one fixed tick of a bicycle model that keeps the car out of solid wall polygons.     |
| `fixedStep.ts` (+ `fixedStep.test.ts`)   | Fixed-timestep clock for the physics: turns frame times into whole ticks at `TICK_HZ`, capped so a pause does not run a burst of catch-up ticks. |
| `tuning.ts` (+ `tuning.test.ts`)         | Car tuning: engine, grip and nitrous levels as modifiers on a `CarSpec`. An untuned car gets its own spec back.                                  |
| `roster.ts` (+ `roster.test.ts`)         | The fictional car roster (names, bodies, stats) and the banned-brand list the test checks every name and note against.                           |
| `bodies.ts` (+ `bodies.test.ts`)         | The downloaded car bodies in `public/models/cars/` and which roster car wears which.                                                             |
| `wheels.ts` (+ `wheels.test.ts`)         | Where each body's wheels sit and how they turn.                                                                                                  |
| `lamps.ts` (+ `lamps.test.ts`)           | Where each body's head and tail lamps are, for the night glow.                                                                                   |
| `carBody.ts` (+ `carBody.test.ts`)       | Car bodies lofted from a side profile.                                                                                                           |
| `raceLeague.ts` (+ `raceLeague.test.ts`) | Race league: seasons of races, points per finish and standings with tiebreaks.                                                                   |
| `timeTrial.ts` (+ `timeTrial.test.ts`)   | Time trials: a best time per runner per route, the route record and the ghost of each best run.                                                  |

## Notes

- Pure data and math with no three.js, so the traffic code can import it. Car names must never use real brands (the roster test enforces it).
