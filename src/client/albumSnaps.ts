// The photo album's snapshots: a small thumbnail of each "Take a photo",
// newest first, the latest SNAP_LIMIT kept in localStorage on this device.
// Images are too big for the save (and its 64 KB cloud copy), so they stay
// here; the album's places visited are in the save (collections.ts).

import { createStore } from "./rooms/shared/store.ts";

/** One snapshot: a JPEG or PNG data URL, where it was taken, and when. */
export type Snap = { src: string; place: string; at: number };

/** How many snapshots the album keeps. */
export const SNAP_LIMIT = 12;
const KEY = "daydaze-album-v1";

const isSnap = (v: unknown): v is Snap =>
  typeof v === "object" &&
  v !== null &&
  "src" in v &&
  typeof v.src === "string" &&
  /^data:image\/(jpeg|png);base64,/.test(v.src) &&
  "place" in v &&
  typeof v.place === "string" &&
  "at" in v &&
  typeof v.at === "number";

/** Stored snapshots, keeping only well-formed ones (images we made). */
export function parseSnaps(raw: string | null): Snap[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSnap) : [];
  } catch {
    return [];
  }
}

/** The album with `snap` added first, trimmed to SNAP_LIMIT. */
export const addSnap = (album: readonly Snap[], snap: Snap): Snap[] =>
  [snap, ...album].slice(0, SNAP_LIMIT);

function read(): Snap[] {
  try {
    return parseSnaps(localStorage.getItem(KEY));
  } catch {
    return []; // no storage (private mode): an empty album
  }
}

/** The snapshots, for the album panel. */
export const snaps = createStore({ list: [] as Snap[], loaded: false });

/** Loads the stored snapshots once. */
export function loadSnaps(): void {
  if (!snaps.get().loaded) snaps.set({ list: read(), loaded: true });
}

/** Files a new snapshot in the album (and on this device). */
export function keepSnap(snap: Snap): void {
  const list = addSnap(snaps.get().loaded ? snaps.get().list : read(), snap);
  snaps.set({ list, loaded: true });
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // full or blocked storage: the album keeps it for this visit only
  }
}
