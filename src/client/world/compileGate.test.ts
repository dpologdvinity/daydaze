import assert from "node:assert/strict";
import { test } from "node:test";
import { CompileGate } from "./compileGate.ts";

test("nothing new, nothing to compile", () => {
  const gate = new CompileGate(1);
  assert.equal(gate.check(0, 0), false);
  assert.equal(gate.check(0, 5), false);
});

test("new objects trigger one compile, then wait for done", () => {
  const gate = new CompileGate(1);
  assert.equal(gate.check(10, 0), true);
  // still running: more objects wait
  assert.equal(gate.check(20, 5), false);
  gate.done();
  assert.equal(gate.check(20, 5), true);
  gate.done();
  assert.equal(gate.check(20, 9), false);
});

test("compiles are spaced by the interval", () => {
  const gate = new CompileGate(2);
  assert.equal(gate.check(5, 10), true);
  gate.done();
  assert.equal(gate.check(6, 11), false);
  assert.equal(gate.check(6, 12), true);
});

test("objects that left make room, so re-added ones count as new", () => {
  const gate = new CompileGate(0);
  assert.equal(gate.check(10, 0), true);
  gate.done();
  assert.equal(gate.check(4, 1), false);
  assert.equal(gate.check(8, 2), true);
});
