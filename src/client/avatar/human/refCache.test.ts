import assert from "node:assert/strict";
import { test } from "node:test";
import { RefCache } from "./refCache.ts";

function make(keep: number) {
  const made: string[] = [];
  const disposed: string[] = [];
  const cache = new RefCache<string>(
    (key) => {
      made.push(key);
      return `v:${key}`;
    },
    (value) => disposed.push(value),
    keep,
  );
  return { cache, made, disposed };
}

test("holders of one key share one value, made once", () => {
  const { cache, made } = make(2);
  assert.equal(cache.acquire("a", undefined), "v:a");
  assert.equal(cache.acquire("a", undefined), "v:a");
  assert.deepEqual(made, ["a"]);
  assert.deepEqual(cache.size, { live: 1, idle: 0 });
});

test("a value idles after its last release and is revived without a rebuild", () => {
  const { cache, made, disposed } = make(2);
  cache.acquire("a", undefined);
  cache.acquire("a", undefined);
  cache.release("a");
  assert.deepEqual(cache.size, { live: 1, idle: 0 });
  cache.release("a");
  assert.deepEqual(cache.size, { live: 0, idle: 1 });
  assert.equal(cache.acquire("a", undefined), "v:a");
  assert.deepEqual(made, ["a"]);
  assert.deepEqual(disposed, []);
});

test("the oldest idle value beyond the keep limit is disposed", () => {
  const { cache, disposed } = make(2);
  for (const k of ["a", "b", "c"]) {
    cache.acquire(k, undefined);
    cache.release(k);
  }
  assert.deepEqual(disposed, ["v:a"]);
  assert.deepEqual(cache.size, { live: 0, idle: 2 });
});

test("a held value is never disposed, and a stray release is ignored", () => {
  const { cache, disposed } = make(0);
  cache.acquire("a", undefined);
  cache.release("zzz");
  assert.deepEqual(disposed, []);
  cache.release("a");
  assert.deepEqual(disposed, ["v:a"]);
  cache.release("a");
  assert.deepEqual(disposed, ["v:a"]);
});
