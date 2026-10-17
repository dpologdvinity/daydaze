// Siren Song at Mermaid Cove: the mermaids sing a phrase on the four shells
// and you sing it back, one note longer each round. A wrong note ends the
// song. Pure and deterministic: a song's seed fixes its notes.

export const SHELLS = 4;

function rand(n: number): number {
  const v = Math.sin(n * 78.233 + 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

/** The first `length` notes of song `seed`, each a shell 0..3. */
export function phrase(seed: number, length: number): number[] {
  return Array.from({ length }, (_, i) =>
    Math.floor(rand(seed * 101 + i) * SHELLS),
  );
}

export type Song = {
  seed: number;
  /** Rounds sung back right; round r asks for r + 1 notes. */
  rounds: number;
  /** Notes sung back so far this round. */
  sung: number;
  over: boolean;
};

export function newSong(seed: number): Song {
  return { seed, rounds: 0, sung: 0, over: false };
}

/** The phrase the mermaids sing this round. */
export function current(song: Song): number[] {
  return phrase(song.seed, song.rounds + 1);
}

/** You sing `shell`: the next note right, the round complete, or wrong. */
export function sing(
  song: Song,
  shell: number,
): { song: Song; result: "note" | "round" | "wrong" } {
  if (song.over) return { song, result: "wrong" };
  const notes = current(song);
  if (notes[song.sung] !== shell)
    return { song: { ...song, over: true }, result: "wrong" };
  if (song.sung + 1 < notes.length)
    return { song: { ...song, sung: song.sung + 1 }, result: "note" };
  return {
    song: { ...song, rounds: song.rounds + 1, sung: 0 },
    result: "round",
  };
}
