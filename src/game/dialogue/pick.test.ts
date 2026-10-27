import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RECENT_WINDOW,
  fillPlaceholders,
  loadDialogue,
  pickLine,
  seededRng,
  type RecentLines,
} from "./pick.ts";
import type { RoleBank } from "./types.ts";

// the banks are a separate chunk: everything below speaks real lines
await loadDialogue();

const tenLines = Array.from({ length: 10 }, (_, index) => `line ${index}`);

function runPicks(
  count: number,
  options: Parameters<typeof pickLine>[0],
): string[] {
  const texts: string[] = [];
  let recent: RecentLines = [];
  for (let index = 0; index < count; index += 1) {
    const result = pickLine({ ...options, recent });
    texts.push(result.text);
    recent = result.recent;
  }
  return texts;
}

test("the same seed gives the same sequence on the real banks", () => {
  const options = {
    role: "bartender",
    situation: "idle",
    context: { name: "Dana" },
  } as const;
  const first = runPicks(30, { ...options, rng: seededRng(7) });
  const second = runPicks(30, { ...options, rng: seededRng(7) });
  assert.deepEqual(first, second);
  assert.ok(new Set(first).size > 1, "expected some variety");
});

test("a line is not repeated inside the recent window", () => {
  const bank: RoleBank = { idle: tenLines };
  const texts = runPicks(200, {
    role: "bartender",
    situation: "idle",
    rng: seededRng(3),
    bank,
  });
  for (let index = RECENT_WINDOW; index < texts.length; index += 1) {
    const window = texts.slice(index - RECENT_WINDOW, index);
    assert.equal(
      window.includes(texts[index]),
      false,
      `repeat at ${index}: ${texts[index]}`,
    );
  }
});

test("when every line was used recently, the least recent comes back", () => {
  const bank: RoleBank = { idle: ["a", "b", "c"] };
  const texts = runPicks(6, {
    role: "bartender",
    situation: "idle",
    rng: seededRng(1),
    bank,
  });
  assert.equal(new Set(texts.slice(0, 3)).size, 3);
  assert.deepEqual(texts.slice(3), texts.slice(0, 3));
});

test("weights make heavier lines come up more often", () => {
  const bank: RoleBank = {
    idle: [
      { text: "common", weight: 9 },
      { text: "rare", weight: 1 },
    ],
  };
  const rng = seededRng(11);
  let common = 0;
  for (let index = 0; index < 1000; index += 1) {
    if (
      pickLine({ role: "bartender", situation: "idle", rng, bank }).text ===
      "common"
    )
      common += 1;
  }
  assert.ok(common > 850 && common < 950, `common picked ${common} times`);
});

test("conditions decide which lines are eligible", () => {
  const bank: RoleBank = {
    idle: [
      { text: "downtown only", when: { neighborhood: "downtown" } },
      { text: "velvet only", when: { venue: "velvet-room" } },
      { text: "late only", when: { time: ["late-night"] } },
      "anywhere",
    ],
  };
  const downtown = runPicks(40, {
    role: "bartender",
    situation: "idle",
    context: { neighborhood: "downtown" },
    rng: seededRng(5),
    bank,
  });
  assert.ok(
    downtown.every((text) => text === "downtown only" || text === "anywhere"),
  );
  assert.ok(downtown.includes("downtown only"));

  const none = runPicks(20, {
    role: "bartender",
    situation: "idle",
    rng: seededRng(5),
    bank,
  });
  assert.deepEqual([...new Set(none)], ["anywhere"]);

  const late = pickLine({
    role: "bartender",
    situation: "idle",
    context: { time: "late-night" },
    rng: seededRng(2),
    bank,
  });
  assert.ok(late.text === "late only" || late.text === "anywhere");
});

test("a missing situation falls back to tapped, then idle", () => {
  const bank: RoleBank = { tapped: ["tapped line"], idle: ["idle line"] };
  const fromTapped = pickLine({
    role: "bartender",
    situation: "goodbye",
    rng: seededRng(1),
    bank,
  });
  assert.equal(fromTapped.text, "tapped line");

  const idleBank: RoleBank = { idle: ["idle line"] };
  const fromIdle = pickLine({
    role: "bartender",
    situation: "goodbye",
    rng: seededRng(1),
    bank: idleBank,
  });
  assert.equal(fromIdle.text, "idle line");
});

test("placeholders are filled from the context", () => {
  const bank: RoleBank = {
    idle: ["Love the {item}, {name}! {place} rules with {drink}."],
  };
  const result = pickLine({
    role: "bartender",
    situation: "idle",
    context: {
      name: "Dana",
      item: "jacket",
      place: "The Velvet Room",
      drink: "mezcal",
    },
    rng: seededRng(1),
    bank,
  });
  assert.equal(
    result.text,
    "Love the jacket, Dana! The Velvet Room rules with mezcal.",
  );
});

test("missing placeholder values fall back to neutral words and never show a brace", () => {
  assert.equal(
    fillPlaceholders("Hey {name}, nice {item} at {place} with a {drink}", {}),
    "Hey friend, nice fit at the place with a drink",
  );
  assert.equal(fillPlaceholders("Hi {name}", { name: "   " }), "Hi friend");
  assert.doesNotMatch(fillPlaceholders("x {unknown} y {name}", {}), /[{}]/);
});

test("braces inside a context value are stripped", () => {
  assert.equal(fillPlaceholders("Hi {name}", { name: "{evil}" }), "Hi evil");
});

test("before the banks load, NPCs say '...'; after, real lines", () => {
  // a fresh process, so no other test has loaded the banks yet
  const pick = fileURLToPath(new URL("./pick.ts", import.meta.url));
  const script = `
    const { pickLine, loadDialogue, seededRng } = await import(${JSON.stringify(pick)});
    const say = () => pickLine({ role: "bartender", situation: "idle", rng: seededRng(1) }).text;
    const before = say();
    await loadDialogue();
    console.log(JSON.stringify([before, say()]));
  `;
  const out = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    { encoding: "utf8" },
  );
  const [before, after]: unknown[] = JSON.parse(out);
  assert.equal(before, "...");
  assert.ok(typeof after === "string" && after !== "..." && after.length > 3);
});

test("a failed bank load is retried on the next call, not cached", async () => {
  const pick = fileURLToPath(new URL("./pick.ts", import.meta.url));
  const script = `
    const { pickLine, loadDialogue, seededRng } = await import(${JSON.stringify(pick)});
    const say = () => pickLine({ role: "bartender", situation: "idle", rng: seededRng(1) }).text;
    let failed = false;
    await loadDialogue(() => Promise.reject(new Error("chunk gone"))).catch(() => { failed = true; });
    await loadDialogue();
    console.log(JSON.stringify([failed, say()]));
  `;
  const out = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    { encoding: "utf8" },
  );
  const [failed, line]: unknown[] = JSON.parse(out);
  assert.equal(failed, true);
  assert.ok(typeof line === "string" && line !== "...");
});

test("tier-tagged lines show only at their tier", () => {
  const bank = {
    tapped: [
      "plain",
      { text: "beer talk", when: { tier: "adult" as const } },
      { text: "soda talk", when: { tier: "teen" as const } },
    ],
  };
  const seen = (tier: "teen" | "adult") => {
    const out = new Set<string>();
    for (let seed = 0; seed < 40; seed++)
      out.add(
        pickLine({
          role: "bartender",
          situation: "tapped",
          rng: seededRng(seed),
          bank,
          tier,
        }).text,
      );
    return [...out].sort();
  };
  assert.deepEqual(seen("teen"), ["plain", "soda talk"]);
  assert.deepEqual(seen("adult"), ["beer talk", "plain"]);
});
