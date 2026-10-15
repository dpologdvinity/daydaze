import { test } from "node:test";
import assert from "node:assert/strict";
import type { Vec2 } from "../walk.ts";
import { ARENA } from "./bumper.ts";
import { ARENA_ORIGIN, TRACK_ORIGINS } from "./layout.ts";
import { TRACKS, trackWalls } from "./track.ts";

type Box = { min: Vec2; max: Vec2 };

function boxOf(walls: readonly (readonly Vec2[])[], origin: Vec2): Box {
  const points = walls.flat();
  return {
    min: [
      origin[0] + Math.min(...points.map((p) => p[0])),
      origin[1] + Math.min(...points.map((p) => p[1])),
    ],
    max: [
      origin[0] + Math.max(...points.map((p) => p[0])),
      origin[1] + Math.max(...points.map((p) => p[1])),
    ],
  };
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.min[0] < b.max[0] &&
    b.min[0] < a.max[0] &&
    a.min[1] < b.max[1] &&
    b.min[1] < a.max[1]
  );
}

test("the race tracks and the bumper arena occupy separate space in the room", () => {
  const boxes: [string, Box][] = [
    ["bumper arena", boxOf(ARENA.walls, ARENA_ORIGIN)],
    ...Object.entries(TRACK_ORIGINS).map(
      ([id, origin]): [string, Box] => {
        const track = TRACKS.find((t) => t.id === id);
        if (!track) throw new Error(`missing track ${id}`);
        return [id, boxOf(trackWalls(track), origin)];
      },
    ),
  ];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      assert.equal(
        overlaps(boxes[i][1], boxes[j][1]),
        false,
        `${boxes[i][0]} overlaps ${boxes[j][0]}`,
      );
    }
  }
});
