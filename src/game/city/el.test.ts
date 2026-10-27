import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EL_CYCLE,
  EL_DWELL,
  EL_STATIONS,
  EL_X0,
  EL_X1,
  elBoxes,
  elStopsFrom,
  elTrainAt,
  planTrip,
  trestleColumns,
} from "./el.ts";

const [manila, downtown, chinatown] = EL_STATIONS;

test("the timetable repeats every cycle and the train stays on the line", () => {
  for (let t = 0; t < EL_CYCLE; t += 1.7) {
    const a = elTrainAt(t);
    const b = elTrainAt(t + EL_CYCLE);
    assert.ok(Math.abs(a.x - b.x) < 1e-6 && a.dir === b.dir);
    assert.ok(a.x >= EL_X0 - 1e-6 && a.x <= EL_X1 + 1e-6, `x ${a.x}`);
  }
});

test("the train moves without jumps", () => {
  let last = elTrainAt(0).x;
  for (let t = 0.1; t < EL_CYCLE * 1.2; t += 0.1) {
    const x = elTrainAt(t).x;
    assert.ok(Math.abs(x - last) < 3, `a ${Math.abs(x - last)} m jump at ${t}`);
    last = x;
  }
});

test("it stands at a station with its doors open for the dwell, in both directions", () => {
  const stops = elStopsFrom(0, 6);
  assert.deepEqual(
    stops.map((s) => `${s.station.id}${s.dir}`),
    [
      "manila1",
      "downtown1",
      "chinatown1",
      "chinatown-1",
      "downtown-1",
      "manila-1",
    ],
  );
  for (const s of stops) {
    const mid = elTrainAt((s.arrive + s.depart) / 2);
    assert.equal(mid.at?.id, s.station.id);
    assert.equal(mid.speed, 0);
    assert.ok(Math.abs(mid.x - s.station.x) < 1e-6);
    assert.ok(Math.abs(s.depart - s.arrive - EL_DWELL) < 1e-6);
  }
});

test("a trip boards a train heading the right way and arrives after it leaves", () => {
  for (const [from, to] of [
    [manila, chinatown],
    [chinatown, manila],
    [downtown, chinatown],
    [downtown, manila],
  ] as const) {
    for (const t of [0, 31, 77, 140, 333]) {
      const trip = planTrip(from, to, t);
      assert.ok(trip.leave - t >= 3, "still time to board");
      assert.ok(trip.arrive > trip.leave);
      assert.equal(elTrainAt((trip.board + trip.leave) / 2).at?.id, from.id);
      assert.equal(elTrainAt(trip.arrive + 1).at?.id, to.id);
      assert.equal(
        Math.sign(elTrainAt(trip.board + 1).dir),
        Math.sign(to.x - from.x),
      );
    }
  }
  assert.throws(() => planTrip(manila, manila, 0));
});

test("trestle columns keep clear of the cross streets", () => {
  const gaps = [-64, 64];
  const cols = trestleColumns(gaps);
  assert.ok(cols.length > 30);
  for (const c of cols)
    for (const g of gaps) assert.ok(Math.abs(c - g) >= 8.9, `${c} near ${g}`);
  for (let i = 1; i < cols.length; i++) assert.ok(cols[i] - cols[i - 1] >= 2);
});

test("the line has a deck, rails, columns and, at each station, a platform, a roof and stairs", () => {
  const boxes = elBoxes([-64, 64]);
  for (const kind of ["steel", "stone", "rail", "roof"] as const)
    assert.ok(
      boxes.some((b) => b.kind === kind),
      kind,
    );
  assert.equal(
    boxes.filter((b) => b.kind === "roof").length,
    EL_STATIONS.length,
  );
  for (const b of boxes) {
    assert.ok(b.sx > 0 && b.sy > 0 && b.sz > 0);
    assert.ok(b.y - b.sy / 2 >= -0.2, "nothing under the ground");
  }
});
