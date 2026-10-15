import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FURNITURE_CATALOG,
  HOME_GRID,
  moveFurniture,
  pieceAt,
  placeFurniture,
  removeFurniture,
  rotateFurniture,
  validateFurniture,
  type Furniture,
} from "./decor.ts";

test("the starter catalog has named pieces with sizes in grid cells", () => {
  const ids = Object.keys(FURNITURE_CATALOG);
  assert.ok(ids.length >= 6, "at least six starter pieces");
  for (const id of ids) {
    const item = FURNITURE_CATALOG[id as keyof typeof FURNITURE_CATALOG];
    assert.ok(item.name.length > 0);
    assert.ok(item.width >= 1 && item.depth >= 1);
  }
});

test("placing a piece adds it on the grid and leaves the input untouched", () => {
  const before: Furniture[] = [];
  const after = placeFurniture(before, "sofa", [1, 1], 0);
  assert.ok(after);
  assert.equal(after.length, 1);
  assert.deepEqual(after[0], { id: "sofa", cell: [1, 1], rotation: 0 });
  assert.equal(before.length, 0);
});

test("a piece cannot leave the grid", () => {
  assert.equal(placeFurniture([], "bed", [HOME_GRID.columns, 0], 0), null);
  assert.equal(placeFurniture([], "bed", [-1, 0], 0), null);
  const { width } = FURNITURE_CATALOG.bed;
  assert.equal(
    placeFurniture([], "bed", [HOME_GRID.columns - width + 1, 0], 0),
    null,
  );
});

test("pieces cannot overlap, but may touch", () => {
  const sofa = placeFurniture([], "sofa", [0, 0], 0);
  assert.ok(sofa);
  assert.equal(placeFurniture(sofa, "lamp", [0, 0], 0), null);
  const beside = placeFurniture(sofa, "lamp", [FURNITURE_CATALOG.sofa.width, 0], 0);
  assert.ok(beside);
  assert.equal(beside.length, 2);
});

test("rotation swaps the footprint, so a piece must fit the grid turned", () => {
  const wide = FURNITURE_CATALOG.sofa;
  assert.ok(wide.width > wide.depth, "test needs a wider-than-deep piece");
  // The sofa is 3 wide and 1 deep: it fits in the bottom right corner, but
  // turned it is 1 wide and 3 deep and runs off the bottom edge.
  const corner: [number, number] = [
    HOME_GRID.columns - wide.width,
    HOME_GRID.rows - wide.depth,
  ];
  assert.ok(placeFurniture([], "sofa", corner, 0));
  assert.equal(placeFurniture([], "sofa", corner, 1), null);
});

test("moving to a free cell keeps the rotation; moving onto a piece fails", () => {
  let items = placeFurniture([], "sofa", [0, 0], 1);
  assert.ok(items);
  items = placeFurniture(items, "lamp", [5, 5], 0);
  assert.ok(items);
  const moved = moveFurniture(items, 0, [2, 2]);
  assert.ok(moved);
  assert.deepEqual(moved[0], { id: "sofa", cell: [2, 2], rotation: 1 });
  assert.equal(moveFurniture(items, 0, [5, 5]), null);
});

test("rotating checks the grid and other pieces", () => {
  const items = placeFurniture([], "sofa", [0, 0], 0);
  assert.ok(items);
  const turned = rotateFurniture(items, 0);
  assert.ok(turned);
  assert.equal(turned[0].rotation, 1);
  assert.equal(rotateFurniture(turned, 0)?.[0].rotation, 2);
  const blocked = placeFurniture(items, "lamp", [0, 1], 0);
  assert.ok(blocked);
  assert.equal(rotateFurniture(blocked, 0), null);
});

test("removing a piece takes it out by index", () => {
  let items = placeFurniture([], "lamp", [0, 0], 0);
  assert.ok(items);
  items = placeFurniture(items, "rug", [3, 3], 0);
  assert.ok(items);
  const left = removeFurniture(items, 0);
  assert.deepEqual(left, [{ id: "rug", cell: [3, 3], rotation: 0 }]);
  assert.equal(removeFurniture(items, 9), null);
});

test("saved furniture is validated: bad entries are dropped, not trusted", () => {
  const valid = validateFurniture([
    { id: "lamp", cell: [0, 0], rotation: 0 },
    { id: "unicorn", cell: [0, 0], rotation: 0 },
    { id: "rug", cell: [99, 0], rotation: 0 },
    { id: "rug", cell: [1, 1], rotation: 7 },
    { id: "rug", cell: "1,1", rotation: 0 },
    null,
  ]);
  assert.deepEqual(valid, [{ id: "lamp", cell: [0, 0], rotation: 0 }]);
  assert.deepEqual(validateFurniture("nope"), []);
});

test("saved furniture that overlaps is dropped after the first piece", () => {
  const valid = validateFurniture([
    { id: "lamp", cell: [0, 0], rotation: 0 },
    { id: "lamp", cell: [0, 0], rotation: 0 },
  ]);
  assert.equal(valid.length, 1);
});

test("pieceAt finds the piece covering a cell, turned or not", () => {
  let items = placeFurniture([], "sofa", [0, 0], 0);
  assert.ok(items);
  items = placeFurniture(items, "lamp", [6, 5], 0);
  assert.ok(items);
  assert.equal(pieceAt(items, 2, 0), 0);
  assert.equal(pieceAt(items, 3, 0), -1);
  assert.equal(pieceAt(items, 6, 5), 1);
  const turned = rotateFurniture(items, 0);
  assert.ok(turned);
  assert.equal(pieceAt(turned, 0, 2), 0);
  assert.equal(pieceAt(turned, 1, 0), -1);
});
