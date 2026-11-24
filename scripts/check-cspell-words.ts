// Validates that cspell-words.txt is alphabetically sorted and free of duplicates.
// Run via `npm run lint:spelling:words` or lefthook pre-commit.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Validates word list contents for sorting and duplicates.
 * Returns an array of error messages (empty if valid).
 */
export function validateCspellWords(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const words: string[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const lineNum = i + 1;
    const lower = trimmed.toLowerCase();

    if (seen.has(lower)) {
      errors.push(
        `Duplicate word '${trimmed}' at line ${lineNum} (previously seen at line ${seen.get(lower)})`,
      );
    } else {
      seen.set(lower, lineNum);
    }

    words.push(trimmed);
  }

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i] ?? "";
    const next = words[i + 1] ?? "";
    // Standard ASCII code point comparison (same as Array.prototype.sort() / LC_ALL=C sort)
    if (current > next) {
      errors.push(`Unsorted words: '${current}' must appear after '${next}'`);
    }
  }

  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const file = process.argv[2] ?? "cspell-words.txt";
  const content = readFileSync(file, "utf8");
  const errors = validateCspellWords(content);

  if (errors.length > 0) {
    console.error(`${file} failed validation (${errors.length} error(s)):`);
    for (const err of errors) {
      console.error(`  ${err}`);
    }
    process.exit(1);
  }

  console.log(`${file} is correctly sorted with no duplicates.`);
}
