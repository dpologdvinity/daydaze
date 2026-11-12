import assert from "node:assert/strict";
import { test } from "node:test";
import { MOVING, clipOf } from "./clips.ts";
import {
  START_STILL,
  STOP_AFTER,
  TURN_SWING,
  createLoco,
  stepLoco,
  type LocoInput,
  type LocoPlay,
} from "./locomotion.ts";

const DT = 1 / 30;
const base: LocoInput = {
  dt: DT,
  speed: 0,
  yaw: 0,
  hurry: false,
  man: false,
  busy: false,
};

/** Runs `seconds` of frames of `input`, returning every play that fired. */
function run(
  l: ReturnType<typeof createLoco>,
  seconds: number,
  input: Partial<LocoInput> | ((t: number) => Partial<LocoInput>),
): LocoPlay[] {
  const plays: LocoPlay[] = [];
  for (let t = 0; t < seconds; t += DT) {
    const play = stepLoco(l, {
      ...base,
      ...(typeof input === "function" ? input(t) : input),
    });
    if (play) plays.push(play);
  }
  return plays;
}

test("setting off from standing plays the start clip once, short", () => {
  const l = createLoco();
  run(l, START_STILL + 0.2, {});
  const plays = run(l, 2, { speed: 1.2 });
  assert.equal(plays.length, 1);
  assert.equal(plays[0].id, "start-walk-f");
  assert.equal(plays[0].pack, "moves");
  // short: the walk's own loop takes over within a third of a second
  assert.ok(plays[0].seconds > 0.1 && plays[0].seconds <= 0.4);
});

test("the man gets his own take, a hurry the sprint start", () => {
  const man = createLoco();
  run(man, 1, {});
  assert.equal(run(man, 1, { speed: 1.2, man: true })[0]?.id, "start-walk");
  const fast = createLoco();
  run(fast, 1, {});
  assert.equal(
    run(fast, 1, { speed: 2.6, hurry: true })[0]?.id,
    "start-sprint",
  );
});

test("a quick re-click while moving, or a start right after stopping, plays no start", () => {
  const l = createLoco();
  run(l, 1, {});
  run(l, 1, { speed: 1.2 });
  // already moving: nothing fires as the target changes
  assert.deepEqual(run(l, 1, { speed: 1.2 }), []);
  // she stops and sets off again within a blink: no start clip
  run(l, STOP_AFTER / 2, {});
  assert.deepEqual(run(l, 1, { speed: 1.2 }), []);
});

test("arriving plays the stop clip once, after a real walk, not after a step", () => {
  const l = createLoco();
  run(l, 1, {});
  run(l, 2, { speed: 1.2 });
  const stop = run(l, 1, {});
  assert.equal(stop.length, 1);
  assert.equal(stop[0].id, "stop-walk-f");
  assert.ok(stop[0].seconds <= 0.6);
  // a single shuffle then stop: no stop clip
  const s = createLoco();
  run(s, 1, {});
  run(s, STOP_AFTER / 3, { speed: 1.2 });
  assert.deepEqual(run(s, 1, {}), []);
});

test("the arrival clip starts as the body brakes, not once it has stopped", () => {
  const l = createLoco();
  run(l, 1, {});
  run(l, 2, { speed: 1.2 });
  // the doll's speed damps towards zero, fast (PlayerController)
  const plays = run(l, 0.6, (t) => ({ speed: 1.2 * Math.exp(-18 * t) }));
  assert.equal(plays.length, 1);
  assert.equal(plays[0].id, "stop-walk-f");
  // a dip while still walking (wading, a sharp turn) is not an arrival
  const w = createLoco();
  run(w, 1, {});
  run(w, 2, { speed: 2.6 });
  assert.deepEqual(run(w, 1, { speed: 1.2 }), []);
});

test("a sharp turn from standing plays turn-left or turn-right", () => {
  const left = createLoco();
  run(left, 1, {});
  const l = run(left, 1, (t) => ({ yaw: Math.min(Math.PI, t * 12) }));
  assert.equal(l.at(-1)?.id, "turn-left");
  const right = createLoco();
  run(right, 1, {});
  const r = run(right, 1, (t) => ({ yaw: -Math.min(Math.PI, t * 12) }));
  assert.equal(r.at(-1)?.id, "turn-right");
  // a gentle drift never turns
  const drift = createLoco();
  assert.deepEqual(
    run(drift, 3, (t) => ({ yaw: t * 0.3 })),
    [],
  );
  assert.ok(TURN_SWING > 1);
});

test("turning back while walking plays turn-180, once, then waits", () => {
  const l = createLoco();
  run(l, 1, {});
  run(l, 2, { speed: 1.5 });
  const plays = run(l, 1.2, (t) => ({
    speed: 1.2,
    yaw: Math.min(Math.PI, t * 10),
  }));
  assert.equal(plays.length, 1);
  assert.equal(plays[0].id, "turn-180");
});

test("busy dolls (seated, swimming) never fire; bad input is harmless", () => {
  const l = createLoco();
  assert.deepEqual(run(l, 1, { busy: true }), []);
  assert.deepEqual(run(l, 1, { busy: true, speed: 2 }), []);
  assert.equal(
    stepLoco(l, { ...base, dt: Number.NaN, speed: 2, yaw: Number.NaN }),
    null,
  );
  assert.equal(stepLoco(l, { ...base, dt: 0 }), null);
  assert.ok(MOVING > 0);
});

test("every clip it can play is baked, in the pack it names", () => {
  const l = createLoco();
  const ids = new Set<string>();
  run(l, 1, {});
  for (const input of [
    { speed: 1.2, man: false },
    { speed: 1.2, man: true },
    { speed: 2.6, hurry: true },
  ]) {
    const x = createLoco();
    run(x, 1, {});
    for (const p of run(x, 1, input)) ids.add(p.id);
    for (const p of run(x, 1, { speed: 0, man: input.man })) ids.add(p.id);
  }
  for (const yaw of [1, -1]) {
    const x = createLoco();
    run(x, 1, {});
    for (const p of run(x, 1, (t) => ({ yaw: yaw * Math.min(3, t * 10) })))
      ids.add(p.id);
  }
  ids.add("turn-180");
  assert.ok(ids.size >= 7, [...ids].join());
  for (const id of ids) assert.equal(clipOf(id)?.pack, "moves", id);
});
