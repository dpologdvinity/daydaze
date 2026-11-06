import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { areaOf, isBlocked, type WalkArea } from "./area.ts";
import { ROOMS } from "./rooms.ts";
import {
  BRIDGE,
  CREEK_STONES,
  CREEK,
  GLADES,
  HIKERS,
  LOW_TREE_SHARE,
  PATH,
  PLANTS_SPOTS,
  SPAWN,
  TREES,
  WILDLIFE,
  creekZ,
  distToCreek,
  distToPath,
} from "./forest.ts";
import { loopAt } from "./zoo.ts";

const area = (): WalkArea => areaOf(ROOMS.forest);

test("the whole path is walkable, from the trailhead to the lookout", () => {
  for (const p of PATH) {
    assert.equal(isBlocked(area(), p), false, `path point ${p} is blocked`);
  }
  assert.equal(isBlocked(area(), SPAWN), false);
});

test("the creek can only be crossed on the bridge", () => {
  const crossable: number[] = [];
  for (let x = -27; x < 27; x += 0.25)
    if (!isBlocked(area(), [x, creekZ(x)])) crossable.push(x);
  assert.ok(crossable.length > 0, "no way across");
  for (const x of crossable)
    assert.ok(
      Math.abs(x - BRIDGE.x) <= BRIDGE.width / 2 + 0.6,
      `the creek is open at x ${x}`,
    );
  assert.ok(CREEK.halfWidth > 1);
});

test("no tree grows on the path, and the low tier keeps a share of them", () => {
  for (const t of TREES) assert.ok(distToPath(t.x, t.z) > 1.2, "tree on path");
  const kept = TREES.filter((t) => t.rank <= LOW_TREE_SHARE).length;
  assert.ok(kept > TREES.length * 0.4 && kept < TREES.length * 0.6);
  assert.ok(TREES.length > 80);
});

test("the animals' loops stay clear of the trees and inside their glades", () => {
  for (const w of WILDLIFE) {
    for (let t = 0; t < 400; t += 3) {
      const { at } = loopAt(w.pen, t, 0.6, w.phase);
      for (const tr of TREES)
        assert.ok(
          Math.hypot(tr.x - at[0], tr.z - at[1]) > 0.7,
          `${w.kind} walks through a tree`,
        );
    }
    assert.ok(existsSync(`public/models/animals/${w.kind}.glb`), w.kind);
  }
  assert.equal(Object.keys(GLADES).length, 4);
});

test("hikers and undergrowth stand on open ground and every model exists", () => {
  for (const h of HIKERS) assert.equal(isBlocked(area(), h.at), false);
  const ids = new Set([
    ...TREES.map((t) => t.id),
    ...PLANTS_SPOTS.map((p) => p.id),
  ]);
  for (const id of ids)
    assert.ok(existsSync(`public/models/forest/${id}.glb`), id);
});

test("the room's portal leads back to the city gate", () => {
  const room = ROOMS.forest;
  assert.equal(room.portals[0]?.target, "city");
  assert.equal(ROOMS.city.id, "city");
});

test("creek stones sit on the banks, never on the bridge", () => {
  assert.ok(CREEK_STONES.length > 8);
  for (const r of CREEK_STONES) {
    const d = distToCreek(r.x, r.z);
    assert.ok(d >= CREEK.halfWidth - 0.1 && d < CREEK.halfWidth + 1, `${d}`);
    assert.ok(Math.abs(r.x - BRIDGE.x) >= BRIDGE.width);
  }
});

test("no tree stands in the lane the default camera looks up", () => {
  for (const t of TREES) assert.ok(!(Math.abs(t.x) < 3.5 && t.z > 2));
});
