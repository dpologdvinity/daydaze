// The karaoke songbook, part: the wider world: Irish, Scottish and Welsh songs, sea shanties, Latin songs (tango, Mexican), and folk songs of Korea, Russia, Israel, the Philippines, Italy, France, Australia and more.
// Every song is in the US public domain (published in 1929 or earlier, melody
// and words both, or traditional), names its composer and publication year,
// and is written in the note-string format of src/game/karaokeSongs.ts. The
// melodies are transcribed from public-domain notation (ABC tune archives,
// compared across independent transcriptions), moved to a singable key and
// cut at a cadence; the `source:` comments name where each came from.

import type { KaraokeSong } from "../karaokeSongs.ts";

export const WORLD: readonly KaraokeSong[] = [
  // source: tunearch.org/wiki/Bonnie_Banks_o%27_Loch_Lomond_(The).no-ext/0001
  {
    id: "loch-lomond",
    title: "Loch Lomond",
    credit: "Traditional, Scotland",
    composer: "Traditional",
    year: 1841,
    genre: "celtic",
    bpm: 84,
    pickup: 3,
    melody:
      "D4/1 G4/1 G4/0.5 A4/0.5 B4/1 A4/0.5 G4/0.5 A4/1 A4/0.5 G4/0.5 E4/1 D4/1 G4/1 " +
      "G4/1 G4/1 B4/0.5 D5/0.5 E5/2 D5/1 D5/1 E5/1 E5/0.5 D5/0.5 B4/1 B4/0.5 D5/0.5 " +
      "C5/0.5 B4/0.5 A4/0.5 G4/0.5 E4/1 D4/0.5 E4/0.5 G4/1 B4/0.5 D5/0.5 E5/1 D5/0.5 " +
      "B4/0.5 A4/2 G4/1 D4/1 G4/1 G4/0.5 A4/0.5 B4/1 A4/0.5 G4/0.5 A4/0.5 B4/0.5 " +
      "A4/0.5 G4/0.5 E4/1 D4/0.5 E4/0.5 G4/1 G4/1",
  },
  // source: tunearch.org/wiki/Highland_Minstrel_Boy_(The).no-ext/0001
  {
    id: "minstrel-boy",
    title: "The Minstrel Boy",
    credit: "Thomas Moore, 1813",
    composer: "Thomas Moore",
    year: 1813,
    genre: "celtic",
    bpm: 100,
    pickup: 3,
    melody:
      "G4/0.5 A4/0.5 B4/0.5 G4/0.5 D4/0.5 G4/0.5 E4/0.5 G4/0.5 D4/0.5 G4/0.5 E4/0.5 " +
      "A4/0.5 A4/0.5 G4/0.5 F#4/0.5 A4/0.5 D5/0.5 C5/0.5 B4/0.5 G4/0.5 D4/0.5 G4/0.5 " +
      "E4/0.5 G4/0.5 D4/0.5 G4/0.5 D4/0.5 G4/0.5 B4/0.5 A4/0.5 G4/1 G4/0.5 A4/0.5 " +
      "B4/0.5 C5/0.5 D5/0.5 B4/0.5 A4/0.5 G4/0.5 E4/0.5 D4/0.5 E4/0.5 A4/0.5 A4/0.5 " +
      "G4/0.5 F#4/0.5 A4/0.5 D5/0.5 C5/0.5 C5/0.5 B4/0.5 A4/0.5 G4/0.5 G4/0.5 E4/0.5 " +
      "D4/0.5 E4/0.5 D4/0.5 G4/0.5 B4/0.5 A4/0.5 G4/1",
  },
  // source: pghardy.net/tunebooks/pgh_songs_tunebook/0021
  {
    id: "molly-malone",
    title: "Molly Malone",
    credit: "James Yorkston, 1883",
    composer: "James Yorkston",
    year: 1883,
    genre: "celtic",
    bpm: 100,
    meter: 3,
    pickup: 2,
    melody:
      "D4/1 G4/0.5 G4/1.5 G4/1 G4/0.5 B4/1.5 G4/1 A4/1 A4/1.5 A4/0.5 A4/0.5 C5/1.5 " +
      "A4/1 B4/1 A4/1 G4/1 D5/1 C5/1 B4/1 B4/1 A4/1.5 G4/0.5 A4/2 D4/0.5 D4/0.5 G4/1 " +
      "G4/1.5 G4/0.5 G4/0.5 B4/1.5 G4/1 A4/1 A4/1.5 A4/0.5 A4/0.5 C5/1.5 A4/0.5 " +
      "A4/0.5 B4/0.5 D5/1.5 C5/1 B4/0.5 D5/1.5 C5/1 B4/1.5 G4/0.5 A4/1 G4/2 D4/1 " +
      "G4/1.5 G4/0.5 G4/1 G4/0.5 B4/1.5 G4/1 A4/1.5 A4/0.5 A4/1 A4/0.5 C5/1.5 A4/0.5 " +
      "A4/0.5 B4/0.5 D5/1.5 C5/1 B4/0.5 D5/1.5 C5/1 B4/1.5 G4/0.5 A4/1 G4/2",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/LASTROSE/0000
  {
    id: "last-rose",
    title: "The Last Rose of Summer",
    credit: "Thomas Moore, 1813",
    composer: "Thomas Moore",
    year: 1813,
    genre: "celtic",
    bpm: 72,
    meter: 3,
    pickup: 2,
    melody:
      "C4/0.5 D4/0.5 E4/3 C5/2 B4/0.5 A4/0.5 G4/1 E4/4 C4/0.5 D4/0.5 E4/1 G4/1 E4/1 " +
      "D4/2 C4/1 C4/5 C4/0.5 D4/0.5 E4/3 C5/2 B4/0.5 A4/0.5 G4/1 E4/4 C4/0.5 D4/0.5 " +
      "E4/1 G4/1 E4/1 D4/2 C4/1 C4/5 G4/0.5 E4/0.5 C5/2 B4/1 A4/2 G4/1 G4/1 E4/4 " +
      "G4/0.5 E4/0.5 C5/2 B4/1 A4/0.5 G#4/0.5 A4/1 B4/1 C5/2 C4/0.5 D4/0.5 E4/3 C5/2 " +
      "B4/0.5 A4/0.5 G4/1 E4/4 C4/0.5 D4/0.5 E4/1 G4/1 E4/1 D4/2 C4/1 C4/5",
  },
  // source: tunearch.org/wiki/Ye_Banks_and_Braes.no-ext/0001
  {
    id: "ye-banks",
    title: "Ye Banks and Braes",
    credit: "Robert Burns, 1792",
    composer: "Robert Burns",
    year: 1792,
    genre: "celtic",
    bpm: 76,
    meter: 3,
    pickup: 2.5,
    melody:
      "A3/0.5 D4/1 D4/0.5 E4/0.5 D4/0.5 E4/0.5 F#4/0.5 A4/0.5 F#4/0.5 E4/0.5 D4/0.5 " +
      "E4/0.5 F#4/0.5 E4/0.5 D4/0.5 D4/0.5 B3/0.5 A3/0.5 A3/0.5 D4/0.5 F#4/0.5 " +
      "B4/0.25 A4/0.25 G#4/0.25 A4/0.25 G4/0.25 E4/0.25 D4/1 D4/0.5 E4/0.5 D4/0.5 " +
      "E4/0.5 F#4/0.5 A4/0.5 F#4/0.5 E4/0.5 D4/0.5 E4/0.5 F#4/0.5 E4/0.5 D4/0.5 " +
      "D4/0.5",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/SKYEBOAT/0000
  {
    id: "skye-boat",
    title: "Skye Boat Song",
    credit: "Anne Campbell MacLeod, 1884",
    composer: "Anne Campbell MacLeod",
    year: 1884,
    genre: "celtic",
    bpm: 72,
    meter: 3,
    key: { tonic: 10, minor: false },
    melody:
      "F4/0.75 G4/0.25 F4/0.5 A#4/1 A4/0.25 A#4/0.25 C5/0.75 D5/0.25 C5/0.5 F5/1.5 " +
      "D5/1 C5/0.25 D5/0.25 G4/1 G4/0.5 F4/2.5 r/0.5 F4/1 G4/0.25 F4/0.25 A#4/1 " +
      "A#4/0.5 C5/0.75 D5/0.25 C5/0.5 F5/1.5 D5/1 C5/0.25 D5/0.25 G4/1 G4/0.5 F4/1.5 " +
      "r/1.5 D5/0.75 A#4/0.25 D5/0.5 D5/1.5 C5/0.75 G4/0.25 C5/0.5 C5/1.5 A#4/0.25 " +
      "G4/0.75 A#4/0.5 A#4/1 A#4/0.5 G4/2.5 r/0.5 D5/0.75 A#4/0.25 D5/0.5 D5/1.5 " +
      "C5/0.75 G4/0.25 C5/0.5 C5/1.5 A#4/0.25 G4/0.75 A#4/0.5 A#4/1 A#4/0.5 G4/1.5",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/sfco.puckette.com/reel/IRISH_ROVER_WEARING_OF_THE_GREEN_4/0000
  {
    id: "wearing-green",
    title: "The Wearing of the Green",
    credit: "Traditional, Ireland",
    composer: "Traditional",
    year: 1864,
    genre: "celtic",
    bpm: 100,
    pickup: 3.5,
    melody:
      "D4/0.25 E4/0.25 F#4/0.5 F#4/0.5 F#4/0.5 F#4/0.5 F#4/0.5 A4/0.5 A4/0.5 F#4/0.5 " +
      "F#4/0.5 E4/0.5 E4/0.5 F#4/0.5 E4/1.5 A4/0.5 D5/0.25 C#5/0.25 B4/0.5 A4/0.5 " +
      "A4/0.5 F#4/0.5 A4/0.5 A4/0.5 D4/0.5 E4/0.5 F#4/0.5 E4/0.5 F#4/0.5 G4/0.5 " +
      "F#4/1 D5/0.5 C#5/0.5 F#4/0.5 F#4/0.5 F#4/0.5 F#4/0.5 F#4/0.5 A4/1 F#4/0.5 " +
      "F#4/0.5 E4/0.5 E4/0.5 F#4/0.5 E4/1.5 A4/0.5 B4/0.5 G4/0.5 D5/0.5 C#5/0.5 " +
      "B4/0.5 A4/0.5 F#4/0.5 D4/0.5 E4/0.5 D4/0.5 D4/0.5 E4/0.5 D4/1.5",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/SHENDOAH/0000
  {
    id: "shenandoah",
    title: "Shenandoah",
    credit: "Traditional sea shanty",
    composer: "Traditional",
    year: 1882,
    genre: "shanty",
    bpm: 76,
    meter: 3,
    pickup: 2,
    melody:
      "A3/1 D4/0.75 D4/0.25 D4/1.5 E4/0.5 F#4/0.5 G4/0.5 A4/0.5 F#4/1.5 D5/1 B4/1.5 " +
      "A4/0.5 B4/0.5 A4/0.5 F#4/0.5 A4/1.5 A4/1 B4/0.5 B4/0.5 A4/1.5 F#4/0.5 A4/0.5 " +
      "F#4/0.5 E4/0.5 D4/1.5 E4/1 F#4/1.5 D4/0.5 F#4/0.75 G4/0.25 A4/3 D4/0.75 " +
      "E4/0.25 F#4/1.5 D4/0.5 E4/0.5 D4/1.5",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/BLOWDOWN/0000
  {
    id: "blow-man-down",
    title: "Blow the Man Down",
    credit: "Traditional sea shanty",
    composer: "Traditional",
    year: 1900,
    genre: "shanty",
    bpm: 100,
    meter: 3,
    pickup: 2.5,
    melody:
      "F#4/0.5 A4/0.5 B4/0.5 A4/0.5 F#4/0.5 D4/0.5 F#4/0.5 A4/0.5 B4/0.5 A4/0.5 " +
      "F#4/1 D4/0.25 F#4/0.25 A4/1.5 B4/1.5 G4/0.75 F#4/0.25 G4/0.5 E4/1 F#4/0.5 " +
      "G4/0.5 A4/0.5 G4/0.5 E4/0.5 C#4/0.5 E4/0.5 G4/0.5 F#4/0.5 E4/0.5 B4/1.5 " +
      "A4/0.5 A4/0.5 A4/0.5 A4/1 G4/0.5 F#4/0.75 E4/0.25 F#4/0.5 D4/1",
  },
  // source: colinhume.com/ABC.txt/0619
  {
    id: "early-morning",
    title: "Early in the Morning (Sea Shanty)",
    credit: "Traditional sea shanty",
    composer: "Traditional",
    year: 1900,
    genre: "shanty",
    bpm: 132,
    melody:
      "B4/1 B4/0.5 B4/0.5 B4/1 B4/0.5 B4/0.5 B4/1 E4/1 G4/1 B4/1 A4/1 A4/0.5 A4/0.5 " +
      "A4/1 A4/0.5 A4/0.5 A4/1 D4/1 F#4/1 A4/1 B4/1 B4/0.5 B4/0.5 B4/1 B4/0.5 B4/0.5 " +
      "B4/1 C#5/1 D5/1 E5/1 D5/1 B4/1 A4/1 F#4/1 E4/2 E4/1 r/1 B4/2 B4/1.5 B4/0.5 " +
      "B4/1 E4/1 G4/1 B4/1 A4/2 A4/1.5 A4/0.5 A4/1 D4/1 F#4/1 A4/1 B4/2 B4/1.5 " +
      "B4/0.5 B4/1 C#5/1 D5/1 E5/1 D5/1 B4/1 A4/1 F#4/1 E4/2 E4/1",
  },
  // source: trillian.mit.edu/~jc/music/abc/Mexico/song/Cielito_Lindo-C-32-/0000
  {
    id: "cielito",
    title: "Cielito Lindo",
    credit: "Quirino Mendoza y Cortés, 1882",
    composer: "Quirino Mendoza y Cortés",
    year: 1882,
    genre: "latin",
    bpm: 110,
    meter: 3,
    key: { tonic: 0, minor: false },
    melody:
      "C5/1 C5/1 A4/2 B4/1 G4/1 C5/1 C5/1 A4/2 B4/1 G4/1 C5/1 C5/1 A4/2 B4/1 G4/1 " +
      "F4/1 D4/5 D5/0.5 E5/1 B5/0.5 A5/1 D5/0.5 B4/1 B4/1 B4/1 B4/1 A4/1 G4/1 F4/1 " +
      "D4/1 D4/2 E4/1 F4/1 G4/1 G4/1 G4/2 G4/1.5 F4/0.5 E4/0.5 D4/0.5 C4/5 D5/0.5 " +
      "D5/0.5 E5/0.5 C5/0.5 A5/0.5 B5/0.5 A5/0.5 D5/0.5 E5/3 D5/2 C5/1 A4/6 D5/3 " +
      "D5/2 C5/0.5 C5/0.5 E5/1 C5/4 G4/1 C4/0.5 A5/0.5 A5/0.5 E5/0.5 A4/2 G4/1 A4/1 " +
      "A4/1 G4/0.5",
  },
  // source: trillian.mit.edu/~jc/music/abc/Argentina/tango/Choclo_Am/0000
  {
    id: "el-choclo",
    title: "El Choclo",
    credit: "Ángel Villoldo, 1903",
    composer: "Ángel Villoldo",
    year: 1903,
    genre: "latin",
    bpm: 66,
    meter: 2,
    pickup: 1.25,
    key: { tonic: 9, minor: true },
    melody:
      "E4/0.25 E4/0.25 F4/0.25 F4/0.25 E4/0.25 E4/0.25 A4/0.25 A4/0.25 C5/0.25 " +
      "C5/0.25 F5/0.25 F5/0.5 E5/0.5 r/0.25 E5/0.25 E5/0.25 A5/0.25 A5/0.25 E5/0.25 " +
      "E5/0.25 C5/0.25 C5/0.25 D5/0.25 D5/0.25 C5/0.25 C5/0.5 B4/0.5 r/0.25 E4/0.25 " +
      "E4/0.25 F4/0.25 F4/0.25 E4/0.25 E4/0.25 G#4/0.25 G#4/0.25 B4/0.25 B4/0.25 " +
      "F5/0.25 F5/0.5 E5/0.5 r/0.25 E5/0.25 D#5/0.25 E5/0.25 B5/0.25 G#5/0.25 " +
      "G#5/0.25 E5/0.25 E5/0.25 D5/0.25 D5/0.25 C5/0.25 B4/0.5 A4/0.5 r/0.25 E4/0.25 " +
      "E4/0.25 F4/0.25 F4/0.25 E4/0.25 E4/0.25 A4/0.25 A4/0.25 C5/0.25 C5/0.25 " +
      "F5/0.25 F5/0.5 E5/0.5 r/0.25 E5/0.25 E5/0.25 A5/0.25 A5/0.25 E5/0.25",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/musicaviva.com/france/jalousie-est-cause/0000
  {
    id: "jalousie",
    title: "Jalousie",
    credit: "Jacob Gade, 1925",
    composer: "Jacob Gade",
    year: 1925,
    genre: "latin",
    bpm: 66,
    meter: 2,
    pickup: 1.5,
    melody:
      "F4/0.5 A#4/1 A#4/0.5 C5/1 C5/0.5 C#5/1 C5/1 C5/0.5 A#4/1 A#4/0.5 C5/1 C#5/0.5 " +
      "C5/1.5 F4/0.5 A#4/1 A#4/0.5 C5/1 C5/0.5 C#5/1 C5/1 C5/0.5 A#4/1 A#4/0.5 C5/1 " +
      "C#5/0.5 C5/1.5 C5/0.5 F5/1 D#5/0.5 C#5/1 C5/0.5 A#4/1 A#4/1 A#4/0.5 D#5/1 " +
      "C#5/0.5 C5/1 A#4/0.5 F4/1.5 F4/0.5 A#4/1 A#4/0.5 C5/1 C#5/0.5 G#4/1 G#4/0.5 " +
      "C#5/1 C5/1 A#4/0.5 A#4/1 A4/0.5 A#4/1.5 F4/0.5 A#4/1 A#4/0.5 C5/1 C#5/0.5 " +
      "G#4/1 G#4/0.5 C#5/1 C5/1 A#4/0.5 A#4/1 A4/0.5 A#4/1.5",
  },
  // source: ifdo.ca/~seymour/runabc/esac/dva0/0143
  {
    id: "paloma",
    title: "La Paloma",
    credit: "Sebastián Iradier, 1863",
    composer: "Sebastián Iradier",
    year: 1863,
    genre: "latin",
    bpm: 96,
    meter: 2,
    pickup: 1.5,
    melody:
      "G4/0.5 G4/2 G4/0.25 E4/0.5 F4/0.25 G4/0.5 A4/0.5 B4/0.25 C5/0.5 A4/0.25 " +
      "B4/0.5 G4/0.5 F4/3 r/0.5 G4/0.5 D5/2.5 E5/0.5 C5/0.25 D5/0.25 B4/0.5 C5/0.25 " +
      "B4/0.5 A4/0.25 G4/0.5 F4/0.5 E4/3 r/0.5 G4/0.5 G4/2.25 E4/0.5 F4/0.25 G4/0.5 " +
      "A4/0.5 B4/0.25 C5/0.5 A4/0.25 B4/0.5 G4/0.5 F4/3 r/0.5 G4/0.5 D5/2.25 E5/0.5 " +
      "C5/0.25 D5/0.5 B4/0.5 C5/0.25 B4/0.5 A4/0.25 G4/0.5 F4/0.5 E4/2 C5/0.25 " +
      "C5/0.5 C5/0.25 C5/0.5 B4/0.5 D5/0.25 D5/0.5 C5/0.25",
  },
  // source: trillian.mit.edu/~jc/music/abc/Korea/Arirang_G/0000
  {
    id: "arirang",
    title: "Arirang",
    credit: "Traditional, Korea",
    composer: "Traditional",
    year: 1896,
    genre: "world",
    bpm: 84,
    meter: 3,
    melody:
      "D4/1.5 E4/0.5 D4/0.5 E4/0.5 G4/1.5 A4/0.5 G4/0.5 A4/0.5 B4/1 A4/0.5 B4/0.5 " +
      "A4/0.5 G4/0.5 E4/0.5 D4/1.5 E4/0.5 D4/0.5 E4/0.5 G4/1.5 A4/0.5 G4/0.5 A4/0.5 " +
      "B4/0.5 A4/0.5 G4/0.5 E4/0.5 D4/0.5 E4/0.5 G4/1.5 A4/0.5 G4/1 G4/3 D5/2 D5/1 " +
      "D5/1 B4/1 A4/1 B4/1 A4/0.5 B4/0.5 A4/0.5 G4/0.5 E4/0.5 D4/1.5 E4/0.5 D4/0.5 " +
      "E4/0.5 G4/1.5 A4/0.5 G4/0.5 A4/0.5 B4/0.5 A4/0.5 G4/0.5 E4/0.5 D4/0.5 E4/0.5 " +
      "G4/1.5 A4/0.5 G4/1 G4/3",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/folkinfo.org/Kalinka/0000
  {
    id: "kalinka",
    title: "Kalinka",
    credit: "Ivan Larionov, 1860",
    composer: "Ivan Larionov",
    year: 1860,
    genre: "world",
    bpm: 120,
    meter: 2,
    melody:
      "B4/1 B4/1 A4/1 F#4/0.5 G4/0.5 A4/1 F#4/0.5 G4/0.5 A4/1 G4/0.5 F#4/0.5 E4/1 " +
      "B4/1 A4/0.75 G4/0.25 F#4/0.5 G4/0.5 A4/1 F#4/0.5 G4/0.5 A4/1 G4/0.5 F#4/0.5 " +
      "E4/1 B4/1 A4/1 F#4/0.5 G4/0.5 A4/1 F#4/0.5 G4/0.5 A4/1 G4/0.5 F#4/0.5 E4/1 " +
      "B4/1 A4/0.75 G4/0.25 F#4/0.5 G4/0.5 A4/1 F#4/0.5 G4/0.5 A4/1 G4/0.5 F#4/0.5 " +
      "E4/2 E5/2 D5/2 B4/0.5 D5/0.5 C5/0.5 B4/0.25 G4/0.25",
  },
  // source: trillian.mit.edu/~jc/music/abc/Contra/KC/KF_B/0018
  {
    id: "hava-nagila",
    title: "Hava Nagila",
    credit: "Abraham Zvi Idelsohn, 1918",
    composer: "Abraham Zvi Idelsohn",
    year: 1918,
    genre: "world",
    bpm: 132,
    melody:
      "E4/1 E4/1.5 G#4/0.5 F4/0.5 E4/0.5 G#4/1 G#4/1.5 B4/0.5 A4/0.5 G#4/0.5 A4/1 " +
      "A4/1.5 C5/0.5 B4/0.5 A4/0.5 G#4/1 F4/0.25 E4/0.25 F4/0.5 G#4/2 G#4/1 F4/0.25 " +
      "E4/0.25 F4/0.5 E4/2 G#4/0.5 G#4/1 F4/0.5 E4/0.5 E4/0.5 E4/1 F4/0.5 F4/1 " +
      "E4/0.5 D4/0.5 D4/0.5 D4/1 D4/1 F4/1.5 E4/0.5 D4/0.5 D4/0.5 A4/1 G#4/1 F4/0.25 " +
      "E4/0.25 F4/0.5 G#4/2 G#4/1 F4/0.25 E4/0.25 F4/0.5 E4/2 A4/2 C5/2 A4/1 C5/1 " +
      "A4/1",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/flanders.blackmill.net/folk-dances/0073
  {
    id: "leron",
    title: "Leron, Leron Sinta",
    credit: "Traditional, Philippines",
    composer: "Traditional",
    year: 1920,
    genre: "world",
    bpm: 120,
    meter: 3,
    melody:
      "A#3/1 D4/1 D#4/1 F4/1 G#4/1 F#4/1 D#4/1 F#4/0.5 F4/0.5 D#4/0.5 D4/0.5 D#4/1 " +
      "D4/1 A#3/1 A#3/1 D4/1 D#4/1 F4/1 G#4/1 F#4/1 D#4/1 F#4/0.5 F4/0.5 D#4/0.5 " +
      "D4/0.5 D#4/1 D#4/2 A#4/1 G#4/1 F4/1 G#4/1 F4/1 F#4/1 F#4/1 A#4/1 G#4/1 F4/1 " +
      "G#4/0.5 F4/0.5 F#4/1 D#4/1 F#4/1 F4/1 D#4/3",
  },
  // source: colinhume.com/ABC.txt/1477
  {
    id: "waltzing-matilda",
    title: "Waltzing Matilda",
    credit: "Christina Macpherson, 1895",
    composer: "Christina Macpherson",
    year: 1895,
    genre: "world",
    bpm: 100,
    melody:
      "B4/1 B4/1 A4/1 A4/1 G4/0.5 A4/0.5 B4/0.5 G4/0.5 E4/0.5 F#4/0.5 G4/1 D4/1 " +
      "G4/0.5 B4/0.5 D5/1 D5/0.5 D5/0.5 D5/1 D5/1 D5/1 G4/0.5 A4/0.5 B4/1 B4/1 A4/1 " +
      "A4/1 G4/0.5 A4/0.5 B4/0.5 G4/0.5 E4/0.5 F#4/0.5 G4/1 D4/1 G4/0.5 B4/0.5 D5/1 " +
      "C5/0.5 B4/0.5 A4/1 A4/1 G4/2",
  },
  // source: trillian.mit.edu/~jc/music/abc/Italy/program/20120505/OSoleMio/0000
  {
    id: "o-sole-mio",
    title: "O Sole Mio",
    credit: "Eduardo di Capua, 1898",
    composer: "Eduardo di Capua",
    year: 1898,
    genre: "world",
    bpm: 76,
    melody:
      "D5/1 C5/1 B4/1 A4/2 G4/2 G4/1 A4/1 B4/1 G4/1 F#4/2 E4/2 r/1 F#4/1 G4/1 A4/1 " +
      "F#4/1 E4/1 E4/3 F#4/1 G4/1 A4/1 E4/1 D4/1 D4/2 r/1 D5/1 C5/1 B4/1 A4/2 G4/2 " +
      "G4/1",
  },
  // source: trillian.mit.edu/~jc/music/abc/Scand/song/SantaLucia_Aw/0000
  {
    id: "santa-lucia",
    title: "Santa Lucia",
    credit: "Teodoro Cottrau, 1849",
    composer: "Teodoro Cottrau",
    year: 1849,
    genre: "world",
    bpm: 84,
    meter: 3,
    melody:
      "E4/1 E4/1.5 A4/0.5 A4/0.5 G#4/0.5 G#4/2 D4/1 D4/1.5 F#4/0.5 F#4/1 E4/2 C#4/1 " +
      "F#4/1 E4/1 E4/0.5 D#4/0.5 D4/2 D4/1 C#4/1 B3/1 F#4/1 E4/2 C#5/1 B4/1 A4/1 " +
      "G#4/0.5 F#4/0.5 B4/2 B4/1 A4/1 F#4/1 D#4/0.5 E4/0.5 A4/2 C#5/0.5 A4/0.5 " +
      "A4/0.5 E4/0.5 E4/0.5 C#4/0.5 D4/0.5 B4/0.5 B4/2 B4/1 F#4/1.5 G#4/0.5 B4/1 " +
      "A4/2 B4/1 C#5/1.5 B4/0.5 B4/1 A4/2",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/folkinfo.org/Frere_Jacques/0000
  {
    id: "frere-jacques",
    title: "Frère Jacques",
    credit: "Traditional, France",
    composer: "Traditional",
    year: 1811,
    genre: "world",
    bpm: 112,
    melody:
      "G4/1 A4/1 B4/1 G4/1 G4/1 A4/1 B4/1 G4/1 B4/1 C5/1 D5/2 B4/1 C5/1 D5/2 D5/0.5 " +
      "E5/0.5 D5/0.5 C5/0.5 B4/1 G4/1 D5/0.5 E5/0.5 D5/0.5 C5/0.5 B4/1 G4/1 G4/1 " +
      "D4/1 G4/2 G4/1 D4/1 G4/2",
  },
];
