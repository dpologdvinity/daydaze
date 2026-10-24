// The Directory's pure rule for room copies: given each copy's head count, list
// the copies a player can choose from and pick the one to join. Copies are
// numbered from 1; copy 1 is always listed.

/** How many players one room copy reported. */
export type CopyCount = { copy: number; count: number };
/**
 * The copies to show, each flagged full at capacity, and the copy number to
 * join by default.
 */
export type CopyListing = {
  copies: (CopyCount & { full: boolean })[];
  pick: number;
};

/** Lists live copies and picks the least-full one with space, or opens a new one. */
export function listCopies(
  reports: readonly CopyCount[],
  capacity: number,
): CopyListing {
  const sorted = [...reports].sort((a, b) => a.copy - b.copy);
  const open = sorted.filter((report) => report.count < capacity);
  const pick =
    open.reduce<CopyCount | null>(
      (best, report) => (!best || report.count < best.count ? report : best),
      null,
    )?.copy ?? Math.max(0, ...sorted.map((report) => report.copy)) + 1;
  const copies = sorted
    .filter(({ copy, count }) => count > 0 || copy === 1 || copy === pick)
    .map((report) => ({ ...report, full: report.count >= capacity }));
  // A newly opened copy has no report yet; it is always the highest number.
  if (!copies.some(({ copy }) => copy === pick))
    copies.push({ copy: pick, count: 0, full: false });
  return { copies, pick };
}
