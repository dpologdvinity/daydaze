export type CopyCount = { copy: number; count: number };
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
