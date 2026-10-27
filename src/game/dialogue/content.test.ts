import { test } from "node:test";
import assert from "node:assert/strict";
import { LINE_BANKS } from "./index.ts";
import { pitCrewBank } from "./pit-crew.ts";
import {
  ROLE_IDS,
  SITUATION_IDS,
  type DialogueSituation,
  type LineEntry,
  type RoleBank,
} from "./types.ts";

const REQUIRED_SITUATIONS: DialogueSituation[] = [
  "greeting-first",
  "tapped",
  "idle",
  "goodbye",
];
const ALLOWED_PLACEHOLDERS = new Set(["name", "item", "place", "drink"]);
const MIN_LINES_PER_SITUATION = 10;
const MIN_TOTAL_LINES = 1500;
// Drug words may appear only in these situations.
const DRUG_SITUATIONS = new Set<DialogueSituation>([
  "state-high",
  "state-tripping",
]);

// Patterns avoid spelling out slurs and brand names in full where a stem works.
const BANNED_PATTERNS: Array<[string, RegExp]> = [
  [
    "fast-food brand",
    /\bmc\s?donald'?s\b|\bburger king\b|\bwendy'?s\b|\bkfc\b|\btaco bell\b|\bpopeyes\b|\bjollibee\b/i,
  ],
  [
    "fast-food brand",
    /\bdunkin\b|\bchick-?fil-?a\b|\bdairy queen\b|\bsubway sandwich/i,
  ],
  [
    "cosmetics brand",
    /\bsephora\b|\bmaybelline\b|\bl'?or[eé]al\b|\brevlon\b|\bclinique\b|\bestee lauder\b/i,
  ],
  [
    "cosmetics brand",
    /\bglossier\b|\bfenty\b|\burban decay\b|\bmilani\b|\bh ?& ?m\b/i,
  ],
  [
    "car brand",
    /\btoyota\b|\bhonda\b|\bbmw\b|\bmercedes\b|\btesla\b|\bferrari\b|\blamborghini\b/i,
  ],
  [
    "car brand",
    /\bporsche\b|\bchevrolet\b|\bvolkswagen\b|\bhyundai\b|\bnissan\b|\bsubaru\b|\bjeep\b/i,
  ],
  ["car brand", /\bFord\b/],
  [
    "brand",
    /\bnike\b|\badidas\b|\bgucci\b|\bprada\b|\bchanel\b|\blouis vuitton\b|\bsanrio\b|\bhello kitty\b/i,
  ],
  [
    "brand",
    /\bcoca-?cola\b|\bpepsi\b|\bstarbucks\b|\bred bull\b|\bspotify\b|\bnetflix\b|\buber\b/i,
  ],
  [
    "brand",
    /\bgoogle\b|\binstagram\b|\btik ?tok\b|\bamazon\b|\bwalmart\b|\bdisney\b|\bclub penguin\b/i,
  ],
  [
    "brand",
    /\bseafood city\b|\bh ?mart\b|\bjameson\b|\bjack daniel|\bhennessy\b|\bsmirnoff\b|\bheineken\b|\bbud light\b/i,
  ],
  ["doll brand", /\bb[a@4]r\W?b[i1!l]e\b/i],
  [
    "slur",
    /\bn[i1!]+g+(?:a|er|ah|uh)?s?\b|\bf[a@4]+g+(?:s|ot|ots|y)?\b|\bdyke/i,
  ],
  [
    "slur",
    /\bkikes?\b|\bchinks?\b|\bspics?\b|\bwetback|\btrann(?:y|ies)\b|\bretard(?:s|ed)?\b|\bspaz\b|\bgooks?\b|\bbeaners?\b|\bcoons?\b/i,
  ],
];

const DRUG_PATTERN =
  /\b(weed|marijuana|cannabis|joints?|blunts?|edibles?|shrooms?|mushrooms?|molly|cocaine|coke|lsd|acid|pills?|dope|stoned|420|high|trippy|tripping)\b/i;

// Alcohol talk is for 18+ servers; at 13+ it must be tagged `tier: "adult"`.
// The drunk situations never come up at 13+ (buzz cannot rise).
const ALCOHOL_PATTERN =
  /\b(beers?|wines?|cocktails?|whisk(e)?y|vodka|tequila|soju|sake|champagne|prosecco|mojitos?|margaritas?|martinis?|rum|gin|lager|bourbon|spritz|sangria|liquor|alcohol\w*|tipsy|booze|boozy|hangover|sommelier|something strong|nightcap)\b|\bshots? of\b|\b(no more|take a|do a|a) shots?\b/i;
const DRUNK_SITUATIONS = new Set<DialogueSituation>(["state-drunk"]);

function textOf(entry: LineEntry): string {
  return typeof entry === "string" ? entry : entry.text;
}

function entriesOf(
  bank: RoleBank,
): Array<[DialogueSituation, readonly LineEntry[]]> {
  return Object.entries(bank) as Array<
    [DialogueSituation, readonly LineEntry[]]
  >;
}

test("every role has a line bank and no extra banks exist", () => {
  assert.deepEqual(Object.keys(LINE_BANKS).sort(), [...ROLE_IDS].sort());
});

for (const role of ROLE_IDS) {
  test(`${role} has the required situations with enough lines each`, () => {
    const bank = LINE_BANKS[role];
    for (const situation of REQUIRED_SITUATIONS) {
      assert.ok(bank[situation], `${role} is missing ${situation}`);
    }
    for (const [situation, entries] of entriesOf(bank)) {
      assert.ok(
        entries.length >= MIN_LINES_PER_SITUATION,
        `${role}/${situation} has ${entries.length} lines`,
      );
    }
  });

  test(`${role} uses only known situations, with no duplicate lines`, () => {
    const seen = new Set<string>();
    for (const [situation, entries] of entriesOf(LINE_BANKS[role])) {
      assert.ok(
        (SITUATION_IDS as readonly string[]).includes(situation),
        `${role} has unknown ${situation}`,
      );
      for (const entry of entries) {
        const text = textOf(entry);
        assert.ok(
          text.trim().length > 0,
          `${role}/${situation} has an empty line`,
        );
        assert.ok(
          text.length <= 140,
          `${role}/${situation} line too long: ${text}`,
        );
        assert.equal(seen.has(text), false, `${role} repeats: ${text}`);
        seen.add(text);
      }
    }
  });

  test(`${role} uses only allowed placeholders and no stray braces`, () => {
    for (const [situation, entries] of entriesOf(LINE_BANKS[role])) {
      for (const entry of entries) {
        const text = textOf(entry);
        for (const match of text.matchAll(/\{([^}]*)\}/g)) {
          assert.ok(
            ALLOWED_PLACEHOLDERS.has(match[1]),
            `${role}/${situation} has {${match[1]}}`,
          );
        }
        const withoutPlaceholders = text.replace(
          /\{(name|item|place|drink)\}/g,
          "",
        );
        assert.doesNotMatch(
          withoutPlaceholders,
          /[{}]/,
          `${role}/${situation}: ${text}`,
        );
      }
    }
  });

  test(`${role} avoids banned brands, slurs and drug words outside the high and tripping situations`, () => {
    for (const [situation, entries] of entriesOf(LINE_BANKS[role])) {
      for (const entry of entries) {
        const text = textOf(entry);
        for (const [label, pattern] of BANNED_PATTERNS) {
          assert.doesNotMatch(
            text,
            pattern,
            `${role}/${situation} has a ${label}: ${text}`,
          );
        }
        if (!DRUG_SITUATIONS.has(situation)) {
          assert.doesNotMatch(
            text,
            DRUG_PATTERN,
            `${role}/${situation} has a drug word: ${text}`,
          );
        }
      }
    }
  });
}

for (const role of ROLE_IDS) {
  test(`${role} has no alcohol talk at 13+ and enough lines left`, () => {
    const offenders: string[] = [];
    for (const [situation, entries] of entriesOf(LINE_BANKS[role])) {
      const teen = entries.filter(
        (e) => typeof e === "string" || e.when?.tier !== "adult",
      );
      assert.ok(
        teen.length >= MIN_LINES_PER_SITUATION,
        `${role}/${situation} has ${teen.length} 13+ lines`,
      );
      if (DRUNK_SITUATIONS.has(situation)) continue;
      for (const entry of teen) {
        if (ALCOHOL_PATTERN.test(textOf(entry)))
          offenders.push(`${role}/${situation}: ${textOf(entry)}`);
      }
    }
    assert.deepEqual(offenders, []);
  });
}

test("the bank meets the target size", () => {
  const total = ROLE_IDS.reduce(
    (sum, role) =>
      sum +
      entriesOf(LINE_BANKS[role]).reduce(
        (count, [, entries]) => count + entries.length,
        0,
      ),
    0,
  );
  assert.ok(total >= MIN_TOTAL_LINES, `only ${total} lines`);
});

test("the pit crew has at least 10 lines for a finished race", () => {
  assert.ok((pitCrewBank["event-ride-ended"] ?? []).length >= 10);
});
