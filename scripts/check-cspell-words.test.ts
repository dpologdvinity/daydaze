// Unit tests for validateCspellWords in scripts/check-cspell-words.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCspellWords } from "./check-cspell-words.ts";

test("validateCspellWords passes on sorted unique words with trailing newline", () => {
  const content = "apple\nbanana\ncherry\n";
  const errors = validateCspellWords(content);
  assert.deepEqual(errors, []);
});

test("validateCspellWords ignores empty lines and comments", () => {
  const content = "# comment\napple\n\nbanana\n# another comment\ncherry\n";
  const errors = validateCspellWords(content);
  assert.deepEqual(errors, []);
});

test("validateCspellWords detects duplicates", () => {
  const content = "apple\nbanana\napple\ncherry\n";
  const errors = validateCspellWords(content);
  assert.ok(errors.some((e) => e.includes("Duplicate word 'apple'")));
});

test("validateCspellWords detects case-insensitive duplicates", () => {
  const content = "Apple\napple\n";
  const errors = validateCspellWords(content);
  assert.ok(errors.some((e) => e.toLowerCase().includes("duplicate")));
});

test("validateCspellWords detects unsorted entries", () => {
  const content = "banana\napple\n";
  const errors = validateCspellWords(content);
  assert.ok(
    errors.some(
      (e) =>
        e.includes("Unsorted words") ||
        e.includes("'apple' should appear before 'banana'"),
    ),
  );
});
