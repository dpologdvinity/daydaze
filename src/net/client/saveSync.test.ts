import assert from "node:assert/strict";
import { test } from "node:test";
import { createSaveSync, mayPush } from "./saveSync.ts";

function fakeTimers() {
  let now = 0;
  const due: { at: number; fn: () => void; id: number }[] = [];
  let next = 1;
  return {
    set: (fn: () => void, ms: number) => {
      due.push({ at: now + ms, fn, id: next });
      return next++;
    },
    clear: (id: number) => {
      const i = due.findIndex((d) => d.id === id);
      if (i >= 0) due.splice(i, 1);
    },
    advance(ms: number) {
      now += ms;
      for (const d of [...due].filter((d) => d.at <= now)) {
        due.splice(due.indexOf(d), 1);
        d.fn();
      }
    },
  };
}

test("a burst of changes goes up once, the latest, after the quiet spell", () => {
  const sent: number[] = [];
  const timers = fakeTimers();
  const sync = createSaveSync<number>({
    put: (v) => void sent.push(v),
    delayMs: 3000,
    timers,
  });
  sync.push(1);
  timers.advance(1000);
  sync.push(2);
  timers.advance(2999);
  assert.deepEqual(sent, []);
  timers.advance(1);
  assert.deepEqual(sent, [2]);
});

test("flush sends what's waiting now; cancel drops it", () => {
  const sent: number[] = [];
  const timers = fakeTimers();
  const sync = createSaveSync<number>({
    put: (v) => void sent.push(v),
    delayMs: 3000,
    timers,
  });
  sync.push(5);
  sync.flush();
  assert.deepEqual(sent, [5]);
  sync.flush();
  assert.deepEqual(sent, [5]);
  sync.push(6);
  sync.cancel();
  timers.advance(5000);
  assert.deepEqual(sent, [5]);
});

test("saves go up only for an account whose cloud save has loaded", () => {
  const account = { id: "u_a", name: "Kai", isGuest: false, isAdmin: false };
  assert.equal(mayPush(null, true), false);
  assert.equal(mayPush({ ...account, isGuest: true }, true), false);
  // signed in, but the account's own save hasn't come down yet
  assert.equal(mayPush(account, false), false);
  assert.equal(mayPush(account, true), true);
});
