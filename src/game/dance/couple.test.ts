import { test } from "node:test";
import assert from "node:assert/strict";
import { coupleSpots, couplePoseAt } from "./couple.ts";
import {
  ALL_DANCE_MOVES,
  createPose,
  danceMove,
  loadMocap,
  poseAt,
} from "./moves.ts";

await loadMocap();

const dist = (a: [number, number], b: [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

test("a couple stands gap meters apart, centered on the given point", () => {
  const cases: [[number, number], number][] = [
    [[0, 0], 0],
    [[10, -4], 0.7],
    [[-3, 2], Math.PI],
  ];
  for (const [center, facing] of cases) {
    const [lead, follow] = coupleSpots(center, facing, 0.8);
    assert.ok(Math.abs(dist(lead.at, follow.at) - 0.8) < 1e-9);
    const mid = [
      (lead.at[0] + follow.at[0]) / 2,
      (lead.at[1] + follow.at[1]) / 2,
    ];
    assert.ok(dist([mid[0] ?? 0, mid[1] ?? 0], center) < 1e-9);
  }
});

test("the two partners face each other", () => {
  for (const facing of [0, 0.7, Math.PI, -2]) {
    const [lead, follow] = coupleSpots([0, 0], facing, 1);
    // each partner's forward vector points at the other
    const fwd = (yaw: number) => [Math.sin(yaw), Math.cos(yaw)];
    const toFollow = [follow.at[0] - lead.at[0], follow.at[1] - lead.at[1]];
    const toLead = [-toFollow[0]!, -toFollow[1]!];
    const [lx, lz] = fwd(lead.yaw);
    const [fx, fz] = fwd(follow.yaw);
    assert.ok(Math.abs(lx! * toFollow[0]! + lz! * toFollow[1]!) > 0.999);
    assert.ok(Math.abs(fx! * toLead[0]! + fz! * toLead[1]!) > 0.999);
  }
});

test("the lead is listed first, then the follow", () => {
  const roles = coupleSpots([0, 0], 0, 1).map((s) => s.role);
  assert.deepEqual(roles, ["lead", "follow"]);
});

test("the lead's pose is the move itself", () => {
  const m = danceMove("body-roll");
  const out = createPose();
  assert.deepEqual(couplePoseAt(m, "lead", 0.9, out), poseAt(m, 0.9));
});

test("the follow is half a loop behind with the arms mirrored", () => {
  const m = danceMove("slow-dance");
  const follow = couplePoseAt(m, "follow", 0.4, createPose());
  const lead = poseAt(m, 0.4 + m.period / 2);
  assert.deepEqual(follow.joints.lArm, lead.joints.rArm);
  assert.deepEqual(follow.joints.rFore, lead.joints.lFore);
});

test("every move gives the partners different poses", () => {
  for (const m of ALL_DANCE_MOVES) {
    const lead = poseAt(m, 0.2);
    const follow = couplePoseAt(m, "follow", 0.2, createPose());
    assert.notDeepEqual(lead.joints, follow.joints, m.id);
  }
});
