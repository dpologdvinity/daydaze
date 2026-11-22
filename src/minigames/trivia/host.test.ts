// The trivia night host's patter: every moment has ten or more handwritten
// lines, none repeats within a bank, and a pick of any index finds a line.
import assert from "node:assert/strict";
import test from "node:test";
import { HOST_LINES, HOST_MOMENTS, hostLine, hostMoment } from "./host.ts";

test("each host moment has ten or more distinct lines", () => {
  for (const moment of HOST_MOMENTS) {
    const bank = HOST_LINES[moment];
    assert.ok(bank.length >= 10, moment);
    assert.equal(new Set(bank).size, bank.length, moment);
    for (const line of bank) assert.ok(line.trim().length > 0, moment);
  }
});

test("hostLine cycles a bank and accepts any whole number", () => {
  const bank = HOST_LINES.right;
  assert.equal(hostLine("right", 0), bank[0]);
  assert.equal(hostLine("right", bank.length + 2), bank[2]);
  assert.equal(hostLine("right", -1), bank[bank.length - 1]);
});

test("consecutive questions get different reactions", () => {
  for (const moment of ["right", "wrong"] as const)
    for (let n = 0; n < 12; n++)
      assert.notEqual(hostLine(moment, n), hostLine(moment, n + 1), moment);
});

test("the final word depends on the score", () => {
  assert.equal(hostMoment(10), "high");
  assert.equal(hostMoment(7), "high");
  assert.equal(hostMoment(6), "low");
  assert.equal(hostMoment(0), "low");
});
