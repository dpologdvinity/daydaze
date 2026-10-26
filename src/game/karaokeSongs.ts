// The Karaoke Loft's songbook: real songs, every one in the US public domain
// (published before 1931, or traditional). Only the melody is used: the game
// shows no lyrics and plays no recording; the backing is the game's own
// procedural music. Pure data plus the parser that reads the note strings.
//
// Melodies are written as space-separated `<pitch>/<beats>` tokens, the
// pitch in scientific notation (C4 = middle C, sharps `#`, flats `b`) or `r`
// for a rest, and the length in beats of the song's tempo: "E4/1 E4/0.5 r/1".
//
// A song sings on the band's beat (the backing track's tempo, so notes and
// music never drift), its own tempo snapped to half, once or twice the
// band's, whichever is nearest; each note's lane follows the melody's contour
// (the low, middle and high thirds of its range), and each note carries its
// pitch, which the jukebox sings.
//
// No genre that only exists after 1930 can be here: there is no public-domain
// pop, rock, hip-hop, R&B, K-pop, EDM or modern country to sing.

import { LANES, LEAD_IN, type Note } from "./karaokeGame.ts";

export const GENRES = [
  "classical",
  "folk",
  "country",
  "gospel",
  "jazz",
  "ragtime",
  "tin-pan-alley",
  "latin",
  "world",
  "holiday",
  "party",
] as const;
export type Genre = (typeof GENRES)[number];

export type KaraokeSong = {
  id: string;
  title: string;
  /** Composer or source, and the year (or "trad."). */
  credit: string;
  genre: Genre;
  /** Beats a minute: the beat is the unit the melody's lengths count in. */
  bpm: number;
  /** Beats a bar (default 4); the band changes chord once a bar. */
  meter?: number;
  /** Beats before the first downbeat (a pickup), default 0. */
  pickup?: number;
  melody: string;
};

export const SONGS: readonly KaraokeSong[] = [
  {
    id: "ode-to-joy",
    title: "Ode to Joy",
    credit: "Beethoven, 1824",
    genre: "classical",
    bpm: 108,
    melody:
      "E4/1 E4/1 F4/1 G4/1 G4/1 F4/1 E4/1 D4/1 C4/1 C4/1 D4/1 E4/1 E4/1.5 D4/0.5 D4/2 " +
      "E4/1 E4/1 F4/1 G4/1 G4/1 F4/1 E4/1 D4/1 C4/1 C4/1 D4/1 E4/1 D4/1.5 C4/0.5 C4/2",
  },
  {
    id: "fur-elise",
    title: "Für Elise",
    credit: "Beethoven, 1810",
    genre: "classical",
    bpm: 66,
    meter: 1.5,
    pickup: 1,
    melody:
      "E5/0.5 D#5/0.5 E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 A4/1.5 " +
      "C4/0.5 E4/0.5 A4/0.5 B4/1.5 E4/0.5 G#4/0.5 B4/0.5 C5/1.5 " +
      "E4/0.5 E5/0.5 D#5/0.5 E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 A4/1.5 " +
      "C4/0.5 E4/0.5 A4/0.5 B4/1.5 E4/0.5 C5/0.5 B4/0.5 A4/2",
  },
  {
    id: "habanera",
    title: "Habanera",
    credit: "Bizet, Carmen, 1875",
    genre: "classical",
    bpm: 72,
    meter: 2,
    melody:
      "D5/1.5 C#5/0.5 C5/1 C5/1 B4/1.5 Bb4/0.5 A4/1 A4/1 G#4/1 G4/1 F4/1.5 E4/0.5 F4/1 E4/2 r/1 " +
      "D5/1.5 C#5/0.5 C5/1 C5/1 B4/1.5 Bb4/0.5 A4/1 A4/1 G#4/1 G4/1 F4/1.5 E4/0.5 F4/1 E4/2",
  },
  {
    id: "brahms-lullaby",
    title: "Lullaby (Wiegenlied)",
    credit: "Brahms, 1868",
    genre: "classical",
    bpm: 84,
    meter: 3,
    pickup: 1,
    melody:
      "E4/0.5 E4/0.5 G4/2 E4/0.5 E4/0.5 G4/2 E4/0.5 G4/0.5 C5/1 B4/1.5 A4/0.5 A4/1 G4/1 " +
      "D4/0.5 E4/0.5 F4/1 D4/1 D4/0.5 E4/0.5 F4/2 D4/0.5 F4/0.5 B4/0.5 A4/0.5 G4/1 B4/1 C5/2",
  },
  {
    id: "oh-susanna",
    title: "Oh! Susanna",
    credit: "Stephen Foster, 1848",
    genre: "country",
    bpm: 120,
    pickup: 1,
    melody:
      "C4/0.5 D4/0.5 E4/1 G4/1 G4/1.5 A4/0.5 G4/1 E4/1 C4/1.5 D4/0.5 E4/1 E4/1 D4/1 C4/1 D4/3 " +
      "C4/0.5 D4/0.5 E4/1 G4/1 G4/1.5 A4/0.5 G4/1 E4/1 C4/1.5 D4/0.5 E4/1 E4/1 D4/1 D4/1 C4/3 r/1 " +
      "F4/2 F4/2 A4/1 A4/2 A4/1 G4/1 G4/1 E4/1 C4/1 D4/3 " +
      "C4/0.5 D4/0.5 E4/1 G4/1 G4/1.5 A4/0.5 G4/1 E4/1 C4/1.5 D4/0.5 E4/1 E4/1 D4/1 D4/1 C4/3",
  },
  {
    id: "clementine",
    title: "Oh My Darling, Clementine",
    credit: "Traditional, 1884",
    genre: "country",
    bpm: 132,
    meter: 3,
    pickup: 2,
    melody:
      "F4/1 F4/1 F4/1 C4/2 A4/1 A4/1 A4/1 F4/2 F4/1 A4/1.5 C5/0.5 C5/2 Bb4/1 A4/1 G4/3 r/1 " +
      "G4/1 A4/1 Bb4/1 Bb4/2 A4/1 G4/1 A4/1 F4/2 F4/1 A4/1.5 G4/0.5 C4/2 E4/1 G4/1 F4/3",
  },
  {
    id: "round-the-mountain",
    title: "She'll Be Coming 'Round the Mountain",
    credit: "Traditional",
    genre: "country",
    bpm: 144,
    pickup: 1,
    melody:
      "G4/0.5 A4/0.5 C5/1 C5/1 C5/1 C5/1 A4/1 G4/1 E4/1 G4/1 C5/3 r/1 " +
      "C5/0.5 D5/0.5 E5/1 E5/1 E5/1 E5/1 G5/1 E5/1 D5/1 C5/1 D5/3 r/1 " +
      "G5/0.5 F5/0.5 E5/1 E5/1 E5/1 E5/1 D5/1 C5/1 A4/1 A4/1 G4/2 " +
      "G4/0.5 A4/0.5 C5/1 C5/1 D5/1 C5/1 B4/1 A4/1 B4/1 C5/3",
  },
  {
    id: "greensleeves",
    title: "Greensleeves",
    credit: "Traditional, 16th century",
    genre: "folk",
    bpm: 168,
    meter: 6,
    pickup: 1,
    melody:
      "A4/1 C5/2 D5/1 E5/1.5 F5/0.5 E5/1 D5/2 B4/1 G4/1.5 A4/0.5 B4/1 C5/2 A4/1 " +
      "A4/1.5 G#4/0.5 A4/1 B4/2 G#4/1 E4/2 A4/1 C5/2 D5/1 E5/1.5 F5/0.5 E5/1 D5/2 B4/1 " +
      "G4/1.5 A4/0.5 B4/1 C5/1.5 B4/0.5 A4/1 G#4/1.5 F#4/0.5 G#4/1 A4/3",
  },
  {
    id: "scarborough-fair",
    title: "Scarborough Fair",
    credit: "Traditional",
    genre: "folk",
    bpm: 112,
    meter: 3,
    melody:
      "D4/2 D4/1 A4/2 A4/1 E4/1.5 F4/0.5 E4/1 D4/3 r/2 A4/1 C5/2 D5/1 C5/2 A4/1 B4/1 G4/1 A4/4 r/2 " +
      "D4/2 D4/1 A4/2 A4/1 E4/1.5 F4/0.5 E4/1 D4/3 r/2 A4/1 C5/2 D5/1 C5/2 A4/1 B4/1 G4/1 A4/4",
  },
  {
    id: "my-bonnie",
    title: "My Bonnie Lies over the Ocean",
    credit: "Traditional",
    genre: "folk",
    bpm: 126,
    meter: 3,
    pickup: 1,
    melody:
      "G4/1 E5/1.5 D5/0.5 C5/1 D5/1 C5/1 A4/1 G4/1 E4/2 r/1 " +
      "G4/1 E5/1.5 D5/0.5 C5/1 C5/1 B4/1 C5/1 D5/3 r/2 " +
      "G4/1 E5/1.5 D5/0.5 C5/1 D5/1 C5/1 A4/1 G4/1 E4/2 r/1 " +
      "G4/1 A4/1 D5/1 C5/1 B4/1 A4/1 B4/1 C5/3",
  },
  {
    id: "amazing-grace",
    title: "Amazing Grace",
    credit: "John Newton, 1779; tune New Britain, 1829",
    genre: "gospel",
    bpm: 84,
    meter: 3,
    pickup: 1,
    melody:
      "D4/1 G4/2 B4/0.5 G4/0.5 B4/2 A4/1 G4/2 E4/1 D4/2 D4/1 G4/2 B4/0.5 G4/0.5 B4/2 A4/1 D5/3 r/2 " +
      "B4/1 D5/1.5 B4/0.5 D5/0.5 B4/0.5 G4/2 D4/1 E4/1.5 G4/0.5 G4/0.5 E4/0.5 D4/2 " +
      "D4/1 G4/2 B4/0.5 G4/0.5 B4/2 A4/1 G4/3",
  },
  {
    id: "michael-row",
    title: "Michael, Row the Boat Ashore",
    credit: "Traditional spiritual",
    genre: "gospel",
    bpm: 100,
    pickup: 1,
    melody:
      "C4/1 E4/1 G4/2 E4/1 G4/1 A4/2 G4/2 r/1 E4/1 G4/2 A4/1 G4/3 r/2 " +
      "E4/1 G4/1 G4/2 E4/1 F4/1 E4/2 D4/2 r/1 C4/1 D4/2 E4/1 D4/1 C4/3",
  },
  {
    id: "saints",
    title: "When the Saints Go Marching In",
    credit: "Traditional",
    genre: "jazz",
    bpm: 152,
    pickup: 3,
    melody:
      "C4/1 E4/1 F4/1 G4/4 r/1 C4/1 E4/1 F4/1 G4/4 r/1 C4/1 E4/1 F4/1 G4/2 E4/2 C4/2 E4/2 D4/4 r/2 " +
      "E4/1 E4/1 D4/2 C4/2 C4/2 E4/2 G4/2 G4/1 F4/3 r/1 E4/1 F4/1 G4/2 E4/2 C4/2 D4/2 C4/4",
  },
  {
    id: "the-entertainer",
    title: "The Entertainer",
    credit: "Scott Joplin, 1902",
    genre: "ragtime",
    bpm: 52,
    meter: 2,
    pickup: 0.75,
    melody:
      "D4/0.25 D#4/0.25 E4/0.25 C5/0.5 E4/0.25 C5/0.5 E4/0.25 C5/1.25 " +
      "C5/0.25 D5/0.25 D#5/0.25 E5/0.25 C5/0.25 D5/0.25 E5/0.5 B4/0.25 D5/0.5 C5/1.5 " +
      "D4/0.25 D#4/0.25 E4/0.25 C5/0.5 E4/0.25 C5/0.5 E4/0.25 C5/1.25 " +
      "A4/0.25 G4/0.25 F#4/0.25 A4/0.25 C5/0.25 E5/0.5 D5/0.25 C5/0.25 A4/0.25 D5/1.5",
  },
  {
    id: "daisy-bell",
    title: "Daisy Bell (Bicycle Built for Two)",
    credit: "Harry Dacre, 1892",
    genre: "tin-pan-alley",
    bpm: 168,
    meter: 3,
    melody:
      "G5/3 E5/3 C5/3 G4/3 A4/1 B4/1 C5/1 A4/2 C5/1 G4/6 " +
      "D5/3 G5/3 E5/3 C5/3 A4/1 B4/1 C5/1 D5/2 E5/1 D5/6",
  },
  {
    id: "ball-game",
    title: "Take Me Out to the Ball Game",
    credit: "Albert Von Tilzer, 1908",
    genre: "tin-pan-alley",
    bpm: 168,
    meter: 3,
    melody:
      "C4/2 C5/1 A4/1 G4/1 E4/1 G4/3 D4/3 C4/2 C5/1 A4/1 G4/1 E4/1 G4/6 r/3 " +
      "C4/2 C5/1 A4/1 G4/1 E4/1 G4/3 D4/3 C4/2 C5/1 A4/1 G4/1 E4/1 G4/6",
  },
  {
    id: "la-cucaracha",
    title: "La Cucaracha",
    credit: "Traditional, Mexico",
    genre: "latin",
    bpm: 168,
    pickup: 1.5,
    melody:
      "C4/0.5 C4/0.5 C4/0.5 F4/1.5 A4/1 r/1 C4/0.5 C4/0.5 C4/0.5 F4/1.5 A4/1 r/1 " +
      "F4/1 F4/0.5 E4/0.5 E4/0.5 D4/0.5 D4/0.5 C4/3 r/1 " +
      "C4/0.5 C4/0.5 C4/0.5 E4/1.5 G4/1 r/1 C4/0.5 C4/0.5 C4/0.5 E4/1.5 G4/1 r/1 " +
      "C5/1 D5/0.5 C5/0.5 Bb4/0.5 A4/0.5 G4/0.5 F4/3",
  },
  {
    id: "sakura",
    title: "Sakura Sakura",
    credit: "Traditional, Japan",
    genre: "world",
    bpm: 72,
    melody:
      "A4/1 A4/1 B4/2 A4/1 A4/1 B4/2 A4/1 B4/1 C5/1 B4/1 A4/1 B4/0.5 A4/0.5 F4/2 " +
      "E4/1 C4/1 E4/1 F4/1 E4/1 E4/0.5 C4/0.5 B3/2 " +
      "A4/1 B4/1 C5/1 B4/1 A4/1 B4/0.5 A4/0.5 F4/2 E4/1 C4/1 E4/1 F4/1 E4/1 E4/0.5 C4/0.5 B3/2",
  },
  {
    id: "mo-li-hua",
    title: "Mo Li Hua (Jasmine Flower)",
    credit: "Traditional, China",
    genre: "world",
    bpm: 72,
    melody:
      "E4/1 E4/0.5 G4/0.5 A4/0.5 C5/0.5 C5/0.5 A4/0.5 G4/1 G4/0.5 A4/0.5 G4/2 " +
      "E4/1 E4/0.5 G4/0.5 A4/0.5 C5/0.5 C5/0.5 A4/0.5 G4/1 G4/0.5 A4/0.5 G4/2 " +
      "G4/1 G4/1 G4/1 E4/0.5 G4/0.5 A4/1 A4/1 G4/2 " +
      "E4/1 D4/0.5 E4/0.5 G4/1 E4/0.5 D4/0.5 C4/1 C4/0.5 D4/0.5 C4/2",
  },
  {
    id: "jingle-bells",
    title: "Jingle Bells",
    credit: "James Lord Pierpont, 1857",
    genre: "holiday",
    bpm: 132,
    melody:
      "E4/1 E4/1 E4/2 E4/1 E4/1 E4/2 E4/1 G4/1 C4/1.5 D4/0.5 E4/4 " +
      "F4/1 F4/1 F4/1.5 F4/0.5 F4/1 E4/1 E4/1 E4/0.5 E4/0.5 E4/1 D4/1 D4/1 E4/1 D4/2 G4/2 " +
      "E4/1 E4/1 E4/2 E4/1 E4/1 E4/2 E4/1 G4/1 C4/1.5 D4/0.5 E4/4 " +
      "F4/1 F4/1 F4/1.5 F4/0.5 F4/1 E4/1 E4/1 E4/0.5 E4/0.5 G4/1 G4/1 F4/1 D4/1 C4/4",
  },
  {
    id: "deck-the-halls",
    title: "Deck the Halls",
    credit: "Traditional, Wales",
    genre: "holiday",
    bpm: 132,
    melody:
      "G4/1.5 F4/0.5 E4/1 D4/1 C4/1 D4/1 E4/1 C4/1 D4/0.5 E4/0.5 F4/0.5 D4/0.5 E4/1.5 D4/0.5 C4/1 B3/1 C4/2 " +
      "G4/1.5 F4/0.5 E4/1 D4/1 C4/1 D4/1 E4/1 C4/1 D4/0.5 E4/0.5 F4/0.5 D4/0.5 E4/1.5 D4/0.5 C4/1 B3/1 C4/2",
  },
  {
    id: "merry-christmas",
    title: "We Wish You a Merry Christmas",
    credit: "Traditional, England",
    genre: "holiday",
    bpm: 144,
    meter: 3,
    pickup: 1,
    melody:
      "D4/1 G4/1 G4/0.5 A4/0.5 G4/0.5 F#4/0.5 E4/1 E4/1 E4/1 A4/1 A4/0.5 B4/0.5 A4/0.5 G4/0.5 F#4/1 D4/1 " +
      "D4/1 B4/1 B4/0.5 C5/0.5 B4/0.5 A4/0.5 G4/1 E4/1 D4/0.5 D4/0.5 E4/1 A4/1 F#4/1 G4/2",
  },
  {
    id: "silent-night",
    title: "Silent Night",
    credit: "Franz Gruber, 1818",
    genre: "holiday",
    bpm: 150,
    meter: 6,
    melody:
      "G4/3 A4/1 G4/2 E4/6 G4/3 A4/1 G4/2 E4/6 D5/4 D5/2 B4/6 C5/4 C5/2 G4/6 " +
      "A4/4 A4/2 C5/3 B4/1 A4/2 G4/3 A4/1 G4/2 E4/6",
  },
  {
    id: "auld-lang-syne",
    title: "Auld Lang Syne",
    credit: "Robert Burns, 1788; traditional tune",
    genre: "holiday",
    bpm: 92,
    pickup: 1,
    melody:
      "G4/1 C5/1.5 C5/0.5 C5/1 E5/1 D5/1.5 C5/0.5 D5/1 E5/0.5 D5/0.5 C5/1.5 C5/0.5 E5/1 G5/1 A5/3 " +
      "A5/1 G5/1.5 E5/0.5 E5/1 C5/1 D5/1.5 C5/0.5 D5/1 E5/0.5 D5/0.5 C5/1.5 A4/0.5 A4/1 G4/1 C5/3",
  },
  {
    id: "happy-birthday",
    title: "Happy Birthday to You",
    credit: "Mildred and Patty Hill, 1893",
    genre: "party",
    bpm: 108,
    meter: 3,
    pickup: 1,
    melody:
      "G4/0.75 G4/0.25 A4/1 G4/1 C5/1 B4/2 G4/0.75 G4/0.25 A4/1 G4/1 D5/1 C5/2 " +
      "G4/0.75 G4/0.25 G5/1 E5/1 C5/1 B4/1 A4/2 F5/0.75 F5/0.25 E5/1 C5/1 D5/1 C5/2",
  },
];

/** One sung note of a melody: its start (beats from the top) and pitch. */
export type MelodyNote = { beat: number; midi: number };

const STEPS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Reads a melody string (see the top of this file); throws on a bad token,
 * so a typo fails the songbook's test rather than a song. */
export function parseMelody(melody: string): MelodyNote[] {
  const notes: MelodyNote[] = [];
  let beat = 0;
  for (const token of melody.trim().split(/\s+/)) {
    const m = /^(?:r|([A-G])(#|b)?(\d))\/(\d+(?:\.\d+)?)$/.exec(token);
    const beats = Number(m?.[4]);
    if (!m || !(beats > 0)) throw new Error(`bad melody token "${token}"`);
    const [, letter, accidental, octave] = m;
    if (letter && octave) {
      const shift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
      notes.push({
        beat,
        midi: 12 * (Number(octave) + 1) + (STEPS[letter] ?? 0) + shift,
      });
    }
    beat += beats;
  }
  return notes;
}

/** The longest song's note count: the most a sung part can hold. */
export const MAX_SONG_NOTES = 80;

export const songById = (id: string): KaraokeSong | undefined =>
  SONGS.find((s) => s.id === id);

/** How many band beats one of the song's beats takes: 0.5, 1 or 2, so its
 * tempo lands nearest its own. */
export function beatScale(songBpm: number, bandBpm: number): number {
  const off = (k: number) => Math.abs(Math.log(bandBpm / k / songBpm));
  return [0.5, 1, 2].reduce((best, k) => (off(k) < off(best) ? k : best));
}

/**
 * The song's chart on a band at `bpm` that started at clock time `startAt`:
 * the first note `LEAD_IN` band beats after the next beat from `from` (now),
 * the rest on the melody's rhythm.
 */
export function songChart(
  song: KaraokeSong,
  bpm: number,
  startAt: number,
  from = startAt,
): Note[] {
  const melody = parseMelody(song.melody);
  const span = 60 / bpm;
  const scale = beatScale(song.bpm, bpm);
  const first = Math.ceil((from - startAt) / span - 1e-9) + LEAD_IN;
  const pitches = melody.map((n) => n.midi);
  const low = Math.min(...pitches);
  const range = Math.max(...pitches) - low + 1;
  return melody.map((n) => {
    const beat = first + n.beat * scale;
    return {
      at: startAt + beat * span,
      lane: Math.min(LANES - 1, Math.floor(((n.midi - low) / range) * LANES)),
      beat,
      pitch: n.midi,
    };
  });
}

/** What the band plays under a song: its tonic (MIDI of the last note,
 * where nearly every song comes home), whether it's minor (a minor third
 * over the tonic and no major one), the bar length, the pickup, and one triad
 * a bar as pitch classes (0 = C), root first. */
export type BandPlan = {
  tonic: number;
  minor: boolean;
  beatsPerBar: number;
  pickup: number;
  chords: number[][];
};

// The chords a bar may take, as (root, third, fifth) steps over the tonic;
// the first is home, which wins a tie.
const MAJOR_CHORDS = [
  [0, 4, 7],
  [5, 9, 0],
  [7, 11, 2],
  [9, 0, 4],
];
const MINOR_CHORDS = [
  [0, 3, 7],
  [5, 8, 0],
  [7, 11, 2],
  [3, 7, 10],
  [10, 2, 5],
];

/** Harmonizes a song: for each bar, the chord holding the most of that
 * bar's melody, by length. */
export function bandPlan(song: KaraokeSong): BandPlan {
  const melody = parseMelody(song.melody);
  const last = melody[melody.length - 1];
  const tonic = last?.midi ?? 60;
  const classes = new Set(melody.map((n) => (n.midi - tonic + 120) % 12));
  const minor = classes.has(3) && !classes.has(4);
  const beatsPerBar = song.meter ?? 4;
  const pickup = song.pickup ?? 0;
  const tokens = song.melody.trim().split(/\s+/);
  const total = tokens.reduce((t, tok) => t + Number(tok.split("/")[1]), 0);
  const bars = Math.max(1, Math.ceil((total - pickup) / beatsPerBar));
  const weights = Array.from({ length: bars }, () => new Map<number, number>());
  melody.forEach((n, i) => {
    const next = melody[i + 1]?.beat ?? total;
    const at = n.beat - pickup;
    const bar = Math.min(bars - 1, Math.max(0, Math.floor(at / beatsPerBar)));
    const w = next - n.beat;
    const pc = (n.midi - tonic + 120) % 12;
    const map = weights[bar];
    if (map) map.set(pc, (map.get(pc) ?? 0) + w);
  });
  const choices = minor ? MINOR_CHORDS : MAJOR_CHORDS;
  const home = choices[0] ?? [0, 4, 7];
  const chords = weights.map((map) => {
    let best = home;
    let bestScore = -1;
    for (const c of choices) {
      const score = c.reduce((t, step) => t + (map.get(step) ?? 0), 0);
      if (score > bestScore) [best, bestScore] = [c, score];
    }
    return best.map((step) => (tonic + step) % 12);
  });
  return { tonic, minor, beatsPerBar, pickup, chords };
}
