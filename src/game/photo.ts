// Snapshots: what a saved photo is called and what's written under it.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** A file name like `daydaze-the-coconut-grove-2026-10-18-1930.png`. */
export function photoFileName(place: string, at: Date): string {
  const slug = place
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const day = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}`;
  return `daydaze-${slug || "photo"}-${day}-${time}.png`;
}

/** The caption on the photo's border: the place and the date. */
export function photoCaption(place: string, at: Date): string {
  return `${place} · ${MONTHS[at.getMonth()]} ${at.getDate()}, ${at.getFullYear()}`;
}
