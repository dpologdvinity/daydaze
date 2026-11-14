import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EL_CYCLE,
  EL_DWELL,
  EL_PLATFORM,
  EL_STATIONS,
  EL_X0,
  EL_X1,
  elBoxes,
  elStopsFrom,
  elTrainAt,
  hasArrived,
  hasBoarded,
  nearestStation,
  planTrip,
  stairsFoot,
  stairsRect,
  stairsSpan,
  trestleColumns,
} from "./el.ts";
import { doorZone } from "./districts.ts";
import { planView } from "./budget.ts";
import { ROAD_EDGES, roadRect } from "./layout.ts";

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

test("a trip can be planned between every pair of stations, in both directions", () => {
  for (const from of EL_STATIONS)
    for (const to of EL_STATIONS) {
      if (from.id === to.id) continue;
      for (let t = 0; t < EL_CYCLE * 2; t += 7.3) {
        const trip = planTrip(from, to, t);
        assert.equal(trip.from.id, from.id);
        assert.equal(trip.to.id, to.id);
        assert.ok(trip.board < trip.leave && trip.leave < trip.arrive);
        assert.ok(trip.leave - t >= 3, `${from.id}>${to.id} at ${t}`);
        const there = elTrainAt(trip.arrive + 0.5);
        assert.equal(there.at?.id, to.id);
        assert.equal(there.dir, Math.sign(to.x - from.x));
      }
    }
});

test("a rider steps off at the stop, or after its dwell if the tab skipped it", () => {
  const trip = planTrip(manila, chinatown, 0);
  const train = (t: number) => elTrainAt(t);
  assert.equal(
    hasArrived(trip, train(trip.arrive - 1), trip.arrive - 1),
    false,
  );
  assert.equal(hasArrived(trip, train(trip.arrive + 1), trip.arrive + 1), true);
  // the train has left again by the time a throttled tab wakes up
  const late = trip.arrive + EL_DWELL + 5;
  assert.notEqual(train(late).at?.id, chinatown.id);
  assert.equal(hasArrived(trip, train(late), late), true);
});

test("a rider waiting on the platform boards even if a slow frame skipped the dwell", () => {
  const trip = planTrip(downtown, chinatown, 0);
  assert.equal(hasBoarded(trip, trip.board - 1), false);
  assert.equal(hasBoarded(trip, trip.board), true);
  // the train has already pulled out by the next frame: she is on it anyway
  const late = trip.leave + 5;
  assert.notEqual(elTrainAt(late).at?.id, downtown.id);
  assert.equal(hasBoarded(trip, late), true);
});

test("leaving mid-ride drops her at the nearest station", () => {
  assert.equal(nearestStation(-400).id, "manila");
  assert.equal(nearestStation(120).id, "downtown");
  assert.equal(nearestStation(200).id, "chinatown");
});

test("no trestle column stands in a station's stairs", () => {
  const cols = trestleColumns([]);
  for (const s of EL_STATIONS) {
    const [x0, x1] = stairsSpan(s);
    for (const c of cols)
      assert.ok(!(c > x0 && c < x1), `column ${c} in the stairs of ${s.id}`);
  }
});

test("every stair flight joins its platform and ends on the avenue's sidewalk", () => {
  for (const s of EL_STATIONS) {
    const [x0, z0, x1, z1] = stairsRect(s);
    // the landing is within the platform's length, the flight runs on past it
    assert.ok(x0 >= s.x - EL_PLATFORM / 2 && x0 <= s.x + EL_PLATFORM / 2, s.id);
    // along the south curb: the road's edge is z = 7, the sidewalk ends at 11
    assert.ok(z0 >= 6 && z1 <= 11, s.id);
    // the foot is past the bottom step, on the sidewalk, in reach of the El's panel
    const [fx, fz] = stairsFoot(s);
    assert.ok(fx > x1 && fx - x1 < 4, `${s.id} foot ${fx}`);
    assert.ok(fz > 7 && fz < 11, `${s.id} foot z ${fz}`);
  }
});

test("no stair flight stands in front of a shop door or in a cross street", () => {
  // every lot near a station, as the plan places them
  const roads = ROAD_EDGES.filter((e) => e.width <= 10).map(roadRect);
  for (const s of EL_STATIONS) {
    const [x0, z0, x1, z1] = stairsRect(s);
    for (const lot of planView([s.x, 10], "high").lots) {
      const [a, b, c, d] = doorZone(lot);
      assert.ok(
        !(a < x1 && x0 < c && b < z1 && z0 < d),
        `${s.id}: ${lot.sign ?? lot.model} at ${lot.x},${lot.z} is behind the stairs`,
      );
    }
    // the cross streets (single lane, 10 m) run down through the avenue's sidewalk
    for (const r of roads) {
      const xs = r.map(([x]) => x);
      const zs = r.map(([, z]) => z);
      assert.ok(
        !(
          Math.min(...xs) < x1 &&
          x0 < Math.max(...xs) &&
          Math.min(...zs) < z1 &&
          z0 < Math.max(...zs)
        ),
        `${s.id}: the stairs stand in a street`,
      );
    }
  }
});
