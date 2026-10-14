// shortcut: local copy of the guest-name generator; unify with src/game/save.ts once it lands.
const WORDS = [
  "Mango",
  "Peach",
  "Kiwi",
  "Plum",
  "Lime",
  "Berry",
  "Melon",
  "Lemon",
  "Cherry",
  "Coco",
  "Mochi",
  "Boba",
  "Taffy",
  "Pixel",
  "Comet",
  "Disco",
  "Velvet",
  "Neon",
  "Sunny",
  "Sorbet",
];

/** Index in [0, length) even when `random` misbehaves (1, negative, NaN). */
function pick(random: () => number, length: number): number {
  return Math.min(length - 1, Math.max(0, Math.floor(random() * length))) || 0;
}

/** For example `MangoGuest4821`. */
export function generateGuestName(random: () => number): string {
  return `${WORDS[pick(random, WORDS.length)]}Guest${1000 + pick(random, 9000)}`;
}
