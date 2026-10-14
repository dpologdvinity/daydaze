import { test } from "node:test";
import assert from "node:assert/strict";
import { listCopies } from "./directoryCore.ts";

test("an empty room lists copy 1 and picks it", () => {
  assert.deepEqual(listCopies([], 60), {
    copies: [{ copy: 1, count: 0, full: false }],
    pick: 1,
  });
});

test("the least-full copy with space is picked, lowest number on ties", () => {
  const reports = [
    { copy: 2, count: 10 },
    { copy: 1, count: 40 },
    { copy: 3, count: 10 },
  ];
  assert.deepEqual(listCopies(reports, 60), {
    copies: [
      { copy: 1, count: 40, full: false },
      { copy: 2, count: 10, full: false },
      { copy: 3, count: 10, full: false },
    ],
    pick: 2,
  });
});

test("when every copy is full a new copy is opened", () => {
  const result = listCopies(
    [
      { copy: 1, count: 60 },
      { copy: 2, count: 61 },
    ],
    60,
  );
  assert.deepEqual(result, {
    copies: [
      { copy: 1, count: 60, full: true },
      { copy: 2, count: 61, full: true },
      { copy: 3, count: 0, full: false },
    ],
    pick: 3,
  });
});

test("empty copies are hidden unless they are copy 1 or the pick", () => {
  assert.deepEqual(
    listCopies(
      [
        { copy: 1, count: 60 },
        { copy: 2, count: 0 },
        { copy: 3, count: 0 },
        { copy: 4, count: 5 },
      ],
      60,
    ),
    {
      copies: [
        { copy: 1, count: 60, full: true },
        { copy: 2, count: 0, full: false },
        { copy: 4, count: 5, full: false },
      ],
      pick: 2,
    },
  );
});
