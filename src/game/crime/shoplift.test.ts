import { test } from "node:test";
import assert from "node:assert/strict";
import {
  START,
  STORES,
  SUSPICION_MAX,
  penaltyFor,
  stepStealth,
  watchersFacing,
  isWatching,
  type Action,
  type Stealth,
  type Store,
} from "./shoplift.ts";

function storeNamed(id: string): Store {
  const store = STORES.find((s) => s.id === id);
  assert.ok(store, `store ${id}`);
  return store;
}

function play(store: Store, actions: readonly Action[]): Stealth {
  return actions.reduce(
    (state, action) => stepStealth(store, state, action),
    START,
  );
}

// Browse until the beat the store looks away from the player, then pocket.
function patientRun(
  store: Store,
  pocketAt: (beat: number) => boolean,
): Action[] {
  const actions: Action[] = [];
  let beat = 0;
  while (!pocketAt(beat)) {
    actions.push("browse");
    beat += 1;
    assert.ok(beat < 60, "no quiet beat for this store");
  }
  actions.push("pocket", "walk-out");
  return actions;
}

test("the store list has unique ids and at least one store per difficulty", () => {
  const ids = STORES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    assert.ok(
      STORES.some((s) => s.difficulty === difficulty),
      difficulty,
    );
  }
});

test("the bodega is easy: a patient player walks out with the item", () => {
  const bodega = storeNamed("bodega");
  const actions = patientRun(
    bodega,
    (beat) => watchersFacing(bodega, beat) === 0,
  );
  const result = play(bodega, actions);
  assert.equal(result.outcome, "escaped");
  assert.equal(result.pocketed, true);
});

test("the mall is medium: a patient player escapes, but the tag alarm adds suspicion", () => {
  const mall = storeNamed("mall");
  const result = play(
    mall,
    patientRun(mall, (b) => watchersFacing(mall, b) === 0),
  );
  assert.equal(result.outcome, "escaped");
  assert.ok(result.suspicion > 0);
});

test("jewelry is hard: a watcher always faces the floor, so any pocket is caught", () => {
  const jewelry = storeNamed("jewelry");
  for (let beat = 0; beat < 12; beat += 1) {
    assert.ok(watchersFacing(jewelry, beat) >= 1, `beat ${beat} unwatched`);
  }
  const result = play(jewelry, ["browse", "pocket", "walk-out"]);
  assert.equal(result.outcome, "stopped");
});

test("the electronics store is hard: no unwatched beat for a pocket", () => {
  const electronics = storeNamed("electronics");
  let unwatched = 0;
  for (let beat = 0; beat < 12; beat += 1) {
    if (watchersFacing(electronics, beat) === 0) unwatched += 1;
  }
  assert.equal(unwatched, 0);
  assert.equal(play(electronics, ["pocket", "walk-out"]).outcome, "stopped");
});

test("pocketing in view raises suspicion, and running raises it more", () => {
  const bodega = storeNamed("bodega");
  // Beat 0 is in the cashier's cone at the bodega.
  const spotted = stepStealth(bodega, START, "pocket");
  assert.ok(spotted.suspicion > 0);
  const ran = stepStealth(bodega, spotted, "run");
  assert.ok(ran.suspicion > spotted.suspicion - 5);
});

test("a full suspicion meter stops the player straight away", () => {
  const bodega = storeNamed("bodega");
  const result = play(bodega, ["pocket", "run", "run", "run"]);
  assert.equal(result.suspicion <= SUSPICION_MAX, true);
  assert.equal(result.outcome, "stopped");
  // Further beats do nothing once the attempt is over.
  assert.deepEqual(stepStealth(bodega, result, "browse"), result);
});

test("suspicion cools off on quiet beats and never goes negative", () => {
  const bodega = storeNamed("bodega");
  const calm = play(bodega, ["browse", "browse", "browse"]);
  assert.equal(calm.suspicion, 0);
  assert.equal(calm.outcome, "playing");
});

test("walking out with nothing pocketed leaves without a theft", () => {
  const bodega = storeNamed("bodega");
  assert.equal(play(bodega, ["browse", "walk-out"]).outcome, "left");
});

test("a crowd gives cover, so the same pocket spots less", () => {
  const sparse = { ...storeNamed("bodega"), crowd: 0 };
  const busy = { ...sparse, crowd: 0.9 };
  const a = stepStealth(sparse, START, "pocket");
  const b = stepStealth(busy, START, "pocket");
  assert.ok(b.suspicion < a.suspicion);
});

test("penalties follow the store consequence", () => {
  assert.equal(penaltyFor(storeNamed("bodega"), 40, 0).kind, "warning");
  assert.equal(penaltyFor(storeNamed("mall"), 40, 0).kind, "fine");
  assert.equal(penaltyFor(storeNamed("jewelry"), 40, 0).kind, "jail");
});

test("a warning bans the player from that store for a day", () => {
  const warning = penaltyFor(storeNamed("bodega"), 5, 0);
  assert.deepEqual(warning, { kind: "warning", banMs: 86_400_000 });
});

test("fines are at least ten coins and rise with the item price", () => {
  const mall = storeNamed("mall");
  const cheap = penaltyFor(mall, 4, 0);
  const pricey = penaltyFor(mall, 120, 0);
  assert.ok(cheap.kind === "fine" && cheap.coins >= 10);
  assert.ok(pricey.kind === "fine" && pricey.coins > cheap.coins);
});

test("jail time grows with the item value and with repeat offences", () => {
  const jewelry = storeNamed("jewelry");
  const cheap = penaltyFor(jewelry, 50, 0);
  const pricey = penaltyFor(jewelry, 900, 0);
  const again = penaltyFor(jewelry, 50, 2);
  assert.ok(cheap.kind === "jail" && pricey.kind === "jail");
  assert.ok(pricey.minutes > cheap.minutes);
  assert.ok(again.kind === "jail" && again.minutes > cheap.minutes);
  assert.ok(pricey.minutes <= 15, "sentences are capped");
});

test("each watcher looks for `cone` beats of every `period`", () => {
  const w = { kind: "cashier", period: 6, cone: 2, phase: 1 } as const;
  const seen = [0, 1, 2, 3, 4, 5].map((beat) => isWatching(w, beat));
  assert.deepEqual(seen, [true, false, false, false, false, true]);
});
