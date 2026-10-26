// Asset attribution stays in sync with the human-maintained source ledger.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CREDITS } from "./credits.ts";
import { MOCAP_CLIPS } from "./dance/mocap.ts";

/** All pipe-table rows are assets; prose and headings can change freely. */
function assetRows(markdown: string): string[][] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.includes("|"))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)))
    .filter((cells) => cells.join("|") !== "Title|Author|License|URL|Used for");
}

const rows = () =>
  CREDITS.flatMap((group) =>
    group.entries.map((entry) => [
      entry.title,
      entry.author,
      entry.license,
      entry.url,
      entry.usedFor,
    ]),
  );
const sorted = (entries: string[][]) =>
  entries.map((row) => JSON.stringify(row)).sort();

test("credits include all four groups and complete CC-BY attribution", () => {
  assert.deepEqual(
    CREDITS.map((group) => group.title),
    ["3D models", "Textures", "Animations", "Code libraries"],
  );
  for (const entry of CREDITS.flatMap((group) => group.entries)) {
    assert.ok(entry.title.trim());
    assert.ok(entry.usedFor.trim());
    assert.ok(entry.author.trim(), `${entry.title}: missing author`);
    assert.ok(entry.license.trim(), `${entry.title}: missing license`);
    assert.match(
      entry.url,
      /^https?:\/\//,
      `${entry.title}: missing source URL`,
    );
  }
});

test("every documented asset agrees with its in-game credit", () => {
  const documented = assetRows(
    readFileSync(new URL("../../docs/assets.md", import.meta.url), "utf8"),
  );
  assert.ok(documented.length > 0, "asset ledger must not be empty");
  for (const row of documented)
    assert.equal(row.length, 5, `invalid asset row: ${row}`);
  assert.deepEqual(sorted(rows()), sorted(documented));
});

test("asset tables accept alignment, multiple tables and CRLF without dropping new rows", () => {
  const table =
    "| Title | Author | License | URL | Used for |\r\n| :--- | ---: | --- | --- | --- |\r\n| Tree | Artist | CC-BY 4.0 | https://example.com/tree | Park |";
  assert.deepEqual(assetRows(`${table}\n\n## More\n${table}`), [
    ["Tree", "Artist", "CC-BY 4.0", "https://example.com/tree", "Park"],
    ["Tree", "Artist", "CC-BY 4.0", "https://example.com/tree", "Park"],
  ]);
});

test("every shipped motion capture provider has a credit", () => {
  const titles: Record<string, string> = {
    CMU: "CMU motion capture",
    Mixamo: "Mixamo animations",
  };
  const credited = CREDITS.flatMap((group) =>
    group.entries.map((entry) => entry.title),
  );
  for (const clip of MOCAP_CLIPS) {
    const provider = clip.source.split(" ")[0];
    assert.ok(
      credited.includes(titles[provider]),
      `missing attribution for ${clip.source}`,
    );
  }
});
