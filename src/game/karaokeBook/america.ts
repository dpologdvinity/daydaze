// The karaoke songbook, part: American songs: spirituals and gospel, old-time and cowboy country, Foster and the parlor, the Civil War, patriotic songs, school and college songs, party and sing-along songs.
// Every song is in the US public domain (published in 1929 or earlier, melody
// and words both, or traditional), names its composer and publication year,
// and is written in the note-string format of src/game/karaokeSongs.ts. The
// melodies are transcribed from public-domain notation (ABC tune archives,
// compared across independent transcriptions), moved to a singable key and
// cut at a cadence; the `source:` comments name where each came from.

import type { KaraokeSong } from "../karaokeSongs.ts";

export const AMERICA: readonly KaraokeSong[] = [
  // source: trillian.mit.edu/~jc/music/abc/mirror/mindspring.com/~thornton.rose/SwingLowSweetChariot/0000
  {
    id: "swing-low",
    title: "Swing Low, Sweet Chariot",
    credit: "Traditional spiritual",
    composer: "Traditional spiritual",
    year: 1927,
    genre: "gospel",
    bpm: 84,
    melody:
      "F#4/1 D4/2 F#4/1 D4/1 D4/1 B3/1 A3/1 D4/0.5 D4/0.5 D4/0.5 D4/0.5 F#4/0.5 " +
      "F#4/0.5 A4/1 A4/4 B4/0.5 A4/0.5 F#4/2 A4/1 D4/1 D4/1 B3/1 A3/1 D4/0.5 D4/0.5 " +
      "D4/0.5 D4/0.5 F#4/0.5 F#4/0.5 E4/1 D4/3 F#4/1 A4/1 D4/0.5 A3/0.5 D4/1 D4/0.5 " +
      "D4/0.5 D4/0.5 D4/0.5 D4/1 B3/1 A3/1 D4/0.5 D4/0.5 D4/0.5 D4/0.5 F#4/0.5 " +
      "F#4/0.5 A4/1 A4/3 A4/1 B4/0.5 A4/0.5 F#4/1 F#4/1 D4/1 D4/0.5 D4/0.5 D4/0.5 " +
      "D4/0.5 B3/1 A3/1 D4/0.5 D4/0.5 D4/0.5 D4/0.5 F#4/0.5 F#4/0.5 E4/1 D4/4",
  },
  // source: www.joe-offer.com/folkinfo/songs/abc/694/0000
  {
    id: "go-down-moses",
    title: "Go Down, Moses",
    credit: "Traditional spiritual",
    composer: "Traditional spiritual",
    year: 1927,
    genre: "gospel",
    bpm: 84,
    pickup: 3,
    key: { tonic: 7, minor: false },
    melody:
      "B3/1 G4/1 G4/1 F#4/1 F#4/1 G4/1 G4/1 E4/2 B3/1 B3/1 D#4/0.5 D#4/1.5 E4/2 r/1 " +
      "B3/1 G4/1 G4/1 F#4/1 F#4/1 G4/1 G4/1 E4/2 B3/1 B3/1 D#4/0.5 D#4/1.5 E4/4 " +
      "E4/0.5 E4/3.5 A4/0.5 A4/3.5 B4/1.5 A4/0.5 B4/1.5 A4/0.5 B4/1 B4/1 A4/0.25 " +
      "G4/0.25 E4/0.25 E4/1 F#4/0.5 E4/1.5 E4/0.5 G4/1.5 E4/0.5 D4/0.5 B3/0.5 B3/2 " +
      "B3/0.5 B3/0.5 B3/1.5 D#4/0.5 D#4/1.5 E4/2",
  },
  // source: pghardy.net/tunebooks/pgh_songs_tunebook/0004
  {
    id: "camptown-races",
    title: "Camptown Races",
    credit: "Stephen Foster, 1850",
    composer: "Stephen Foster",
    year: 1850,
    genre: "folk",
    bpm: 132,
    pickup: 3,
    melody:
      "A4/1 A4/1 A4/1 F#4/1 A4/1 B4/1 A4/1 F#4/2 F#4/1 E4/3 F#4/1 E4/2 A4/1 A4/1 " +
      "A4/1 F#4/1 A4/1 B4/1 A4/1 F#4/2 E4/2 F#4/1 E4/1 D4/3 r/1 D4/1 D4/1 F#4/1 A4/1 " +
      "D5/3 r/1 B4/1 B4/1 D5/1 B4/1 A4/3 F#4/1 A4/1 A4/1 F#4/1 A4/1 B4/1 A4/1 F#4/2 " +
      "E4/1 F#4/0.5 G4/0.5 F#4/1 E4/0.5 E4/0.5 D4/3",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/back.numachi.com/Beautiful_Dreamer/0000
  {
    id: "beautiful-dreamer",
    title: "Beautiful Dreamer",
    credit: "Stephen Foster, 1864",
    composer: "Stephen Foster",
    year: 1864,
    genre: "folk",
    bpm: 84,
    meter: 3,
    melody:
      "C5/3 B4/3 C5/3 G4/1 E4/1 D4/3 C#4/3 D4/3 A4/2 G4/3 B4/3 A4/3 A4/3 G4/3 F4/3 " +
      "F4/3 E4/3 D4/3 E4/3 C5/3 B4/3 C5/3 G4/1 E4/1 D4/3 C#4/3 D4/3 A4/2 G4/3 B4/3 " +
      "A4/3 A4/3 G4/3 F4/3 F4/3 E4/3 D4/3 C4/3 G4/3 F4/3 D4/3 B3/1 A4/1 A4/3 G4/3 " +
      "E4/3 C4/2 C5/3 B4/3 C5/3 A4/1 D5/3 D5/3 D5/3 C5/3 B4/3 C5/3 A4/3 G4/2 C5/3 " +
      "B4/3 C5/3",
  },
  // source: colinhume.com/ABC.txt/1135
  {
    id: "red-river-valley",
    title: "Red River Valley",
    credit: "Traditional cowboy song",
    composer: "Traditional",
    year: 1925,
    genre: "country",
    bpm: 88,
    pickup: 2,
    melody:
      "D4/1 G4/1 B4/2 B4/2 B4/2 A4/1 B4/1 A4/1 G4/5 D4/1 G4/1 B4/2 G4/1 B4/1 D5/2 " +
      "C5/1 B4/1 A4/6 D5/1 C5/1 B4/2 B4/1 A4/1 G4/2 A4/1 B4/1 D5/1 C5/5 E4/1 E4/1 " +
      "D4/2 F#4/1 G4/1 A4/2 B4/1 A4/1 G4/6",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/folkinfo.org/Streets_of_Laredo/0000
  {
    id: "streets-of-laredo",
    title: "The Streets of Laredo",
    credit: "Traditional cowboy song",
    composer: "Traditional",
    year: 1910,
    genre: "country",
    bpm: 88,
    meter: 3,
    pickup: 2,
    melody:
      "D5/1 D5/1.5 C5/0.5 B4/1 C5/1 D5/1 C5/1 B4/1.5 A4/0.5 G4/1 F#4/1 D4/1 D4/1 " +
      "G4/2 G4/1 A4/1 B4/1 C5/1 B4/1 A4/1 G4/1 A4/2 D5/1 D5/1.5 C5/0.5 B4/1 C5/1 " +
      "D5/1 C5/1 B4/1.5 A4/0.5 G4/1 F#4/1 D4/1 D4/1 G4/1.5 G4/0.5 G4/1 A4/1 B4/1 " +
      "C5/1 B4/1 G4/1 A4/1 G4/2",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/YELLOWTX/0000
  {
    id: "yellow-rose",
    title: "The Yellow Rose of Texas",
    credit: "Traditional, 1858",
    composer: "Traditional",
    year: 1858,
    genre: "country",
    bpm: 112,
    pickup: 3,
    melody:
      "E4/0.5 D4/0.5 C#4/1 E4/1 E4/1.5 E4/0.5 F#4/1 E4/2 E4/0.5 D4/0.5 C#4/1 E4/1 " +
      "A4/1.5 B4/0.5 C#5/3 C#5/1 C#5/1 E4/1 E4/1.5 C#5/0.5 C#5/1 B4/2 A4/1 G#4/1.5 " +
      "A4/0.5 B4/1 C#5/1 B4/3 E4/0.5 D4/0.5 C#4/1 E4/1 E4/1.5 E4/0.5 F#4/1 E4/2 " +
      "C#4/1 C#4/1 E4/1 A4/1.5 B4/0.5 C#5/3 C#5/1 C#5/1 E4/1 E4/1.5 C#5/0.5 C#5/1 " +
      "B4/2 C#5/0.5 B4/0.5 A4/1 E4/1 C#5/1.5 B4/0.5 A4/3",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/folkinfo.org/Casey_Jones/0000
  {
    id: "casey-jones",
    title: "Casey Jones",
    credit: "T. Lawrence Seibert and Eddie Newton, 1909",
    composer: "T. Lawrence Seibert and Eddie Newton",
    year: 1909,
    genre: "country",
    bpm: 130,
    melody:
      "C5/0.5 C5/1 C5/0.5 C5/0.5 B4/0.5 A4/0.5 G4/0.5 C5/0.5 B4/0.5 C5/0.5 G4/1.5 " +
      "r/0.5 G4/0.5 C5/0.5 C5/1 C5/0.5 C5/0.5 B4/0.5 A4/0.5 G4/0.5 A4/0.5 G#4/0.5 " +
      "A4/0.5 B4/2 r/0.5 C5/1 C5/1 C5/0.5 B4/0.5 A4/0.5 G4/0.5 D5/0.5 B4/0.5 C5/0.5 " +
      "G4/1 r/0.5 E4/0.5 E4/0.5 G4/1 G4/1 G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4/0.5 C4/0.5 " +
      "D4/1 C4/2",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/FRMRDELL/0000
  {
    id: "farmer-dell",
    title: "The Farmer in the Dell",
    credit: "Traditional, Germany",
    composer: "Traditional",
    year: 1883,
    genre: "party",
    bpm: 120,
    meter: 3,
    pickup: 2.5,
    melody:
      "D4/0.5 G4/1 G4/0.5 G4/1 G4/0.5 G4/2.5 A4/0.5 B4/1 B4/0.5 B4/1 B4/0.5 B4/2.5 " +
      "r/0.5 D5/1.5 D5/1 E5/0.5 D5/1 B4/0.5 G4/1 A4/0.5 B4/1 B4/0.5 A4/1 A4/0.5 " +
      "G4/2.5",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/JHNMARCH/0000
  {
    id: "johnny-marching",
    title: "When Johnny Comes Marching Home",
    credit: "Patrick Gilmore, 1863",
    composer: "Patrick Gilmore",
    year: 1863,
    genre: "patriotic",
    bpm: 120,
    meter: 3,
    key: { tonic: 0, minor: false },
    melody:
      "E4/0.5 E4/0.5 A4/0.5 A4/0.5 A4/1 B4/0.5 C5/1 B4/0.5 C5/1 A4/0.5 G4/2.5 E4/0.5 " +
      "G4/2.5 A4/0.5 E4/0.5 A4/0.5 A4/0.5 A4/1 B4/0.5 C5/1 B4/0.5 C5/1 D5/0.5 E5/2.5 " +
      "C5/0.5 E5/2.5 C5/0.5 E5/1 E5/0.5 E5/0.5 D5/0.5 C5/0.5 D5/1 D5/0.5 D5/1 B4/0.5 " +
      "C5/1 C5/0.5 C5/0.5 B4/0.5 A4/0.5 B4/1 B4/0.5 B4/0.5 C5/0.5 D5/0.5 E5/1.5 " +
      "D5/1.5 C5/1.5 B4/1 E4/0.5 E4/0.5 A4/0.5 A4/0.5 A4/1 G4/0.5 A4/2.5",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/GATHRIVR/0000
  {
    id: "shall-we-gather",
    title: "Shall We Gather at the River",
    credit: "Robert Lowry, 1864",
    composer: "Robert Lowry",
    year: 1864,
    genre: "gospel",
    bpm: 100,
    melody:
      "E4/1 E4/1 E4/0.75 D4/0.25 E4/0.75 F4/0.25 G4/2 E4/2 F4/1 F4/1 F4/0.75 G4/0.25 " +
      "F4/0.75 E4/0.25 D4/2 G4/2 E4/1 E4/1 E4/0.75 D4/0.25 E4/0.75 F4/0.25 G4/2 E4/1 " +
      "E4/0.5 F4/0.5 D4/1 D4/0.5 E4/0.5 F4/1 E4/0.5 D4/0.5 C4/4 A4/1 A4/1 C5/0.75 " +
      "B4/0.25 C5/0.75 A4/0.25 G4/2 E4/1.5 E4/0.5 F4/0.75 E4/0.25 F4/0.75 E4/0.25 " +
      "F4/0.75 E4/0.25 F4/0.75 D4/0.25 E4/2 G4/2 A4/0.75 A4/0.25 A4/0.75 A4/0.25 " +
      "C5/0.75 B4/0.25 C5/0.75 A4/0.25 G4/2 E4/1 E4/1 D4/1 D4/0.75 E4/0.25 F4/1 " +
      "E4/0.5 D4/0.5 C4/4",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/CAISONS/0000
  {
    id: "caissons",
    title: "The Caissons Go Rolling Along",
    credit: "Edmund L. Gruber, 1908",
    composer: "Edmund L. Gruber",
    year: 1908,
    genre: "patriotic",
    bpm: 120,
    pickup: 3,
    key: { tonic: 5, minor: false },
    melody:
      "G4/0.5 E4/0.5 G4/1 G4/0.5 E4/0.5 G4/1 G4/0.5 E4/0.5 G4/0.75 A4/0.25 G4/0.5 " +
      "E4/0.5 G4/1 E4/0.5 F4/0.5 G4/0.5 F4/1 D4/0.5 G4/0.5 F4/1 D4/0.5 C4/3 G4/0.5 " +
      "E4/0.5 G4/1 G4/0.5 E4/0.5 G4/1 G4/0.5 E4/0.5 G4/0.75 A4/0.25 G4/0.5 E4/0.5 " +
      "G4/1 E4/0.5 F4/0.5 G4/0.5 F4/1 D4/0.5 G4/0.5 F4/1 D4/0.5 C4/3 G4/0.5 G4/0.5 " +
      "C5/1 C5/1 B4/1 G4/0.75 G4/0.25 A4/0.5 B4/0.5 C5/0.5 A4/0.5 G4/2 C5/0.5 C5/1 " +
      "B4/0.5 A4/0.5 B4/0.5 C5/0.5 A4/0.5 D5/3 G4/0.5 G4/0.5 C5/1 C5/1",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/ANCHRAWA/0000
  {
    id: "anchors-aweigh",
    title: "Anchors Aweigh",
    credit: "Charles A. Zimmermann, 1906",
    composer: "Charles A. Zimmermann",
    year: 1906,
    genre: "patriotic",
    bpm: 112,
    melody:
      "C4/2 E4/1 G4/1 A4/1.5 E4/0.5 A4/2 C5/2 D5/1 G4/1 C5/4 A4/2 C5/1 A4/1 G4/1 " +
      "A4/1 B4/1 C5/1 F#4/1 A4/1 D5/1 C5/1 B4/1 G4/1 F4/1 D4/1 C4/2 E4/1 G4/1 A4/1.5 " +
      "E4/0.5 A4/2 C5/2 D5/1 G4/1 C5/4 A4/2 C5/1 A4/1 G4/1 A4/1 B4/1 C5/1 E5/0.5 " +
      "G4/0.5 F#4/0.5 G4/0.5 D5/0.5 G4/0.5 F#4/0.5 G4/0.5 C5/4",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/AMBEAUT1/0000
  {
    id: "america-beautiful",
    title: "America the Beautiful",
    credit: "Samuel A. Ward, 1910",
    composer: "Samuel A. Ward",
    year: 1910,
    genre: "patriotic",
    bpm: 84,
    pickup: 3,
    melody:
      "D4/1 G4/1.5 F#4/0.5 G4/1 A4/1 B4/0.5 C5/0.5 D5/2 C5/1 B4/1.5 A4/0.5 G4/1 " +
      "F#4/1 G4/3 D5/1 G4/1.5 F#4/0.5 G4/1 A4/1 B4/0.5 C5/0.5 D5/2 B4/1 A4/1.5 " +
      "G4/0.5 F#4/1 E4/1 D4/3 D4/1 C5/1.5 C5/0.5 B4/1 G4/1 F#4/0.5 G4/0.5 A4/2 D4/1 " +
      "C5/1.5 C5/0.5 B4/1 G4/1 A4/3 D4/1 G4/1.5 F#4/0.5 G4/1 A4/1 B4/0.5 C5/0.5 D5/2 " +
      "C5/1 B4/1.5 A4/0.5 G4/1 F#4/1 G4/3 D4/1 G4/1.5 F#4/0.5 G4/1 A4/1 B4/0.5 " +
      "C5/0.5 D5/2 E5/1 D5/1.5 C5/0.5 B4/1 A4/1 G4/3",
  },
  // source: ifdo.ca/~seymour/runabc/esac/boehme10/0013
  {
    id: "gaudeamus",
    title: "Gaudeamus Igitur",
    credit: "Traditional student song",
    composer: "Traditional",
    year: 1782,
    genre: "school",
    bpm: 96,
    meter: 3,
    melody:
      "C4/0.75 G3/0.25 G3/1 C4/1 A3/0.75 A3/0.25 A3/2 B3/0.5 C4/0.5 D4/1 B3/1 C4/0.5 " +
      "E4/0.5 C4/1 r/1 B3/0.75 C4/0.25 D4/1 D4/1 E4/0.75 C4/0.25 D4/1 D4/1 B3/0.75 " +
      "C4/0.25 D4/1 D4/1 E4/0.5 C4/0.5 D4/1 D4/1 C4/0.75 B3/0.25 A3/0.5 F4/0.5 " +
      "E4/0.5 D4/0.5 E4/1 D4/1 C4/2 C4/0.75 B3/0.25 A3/0.5 F4/0.5 E4/0.5 D4/0.5 E4/1 " +
      "D4/1 C4/1",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/homepages.inf.ed.ac.uk/s0570628/Marines_Hymn/0000
  {
    id: "marines-hymn",
    title: "The Marines' Hymn",
    credit: "Jacques Offenbach, 1859; words 1919",
    composer: "Jacques Offenbach",
    year: 1919,
    genre: "patriotic",
    bpm: 112,
    pickup: 2,
    melody:
      "G3/1 B3/1 D4/2 D4/2 D4/2 D4/2 D4/3 G4/1 D4/2 B3/1 C4/1 D4/2 D4/2 C4/2 A3/2 " +
      "G3/6 G3/1 B3/1 G3/6 G4/1 F#4/1 E4/2 C4/2 E4/2 C4/2 D4/3 E4/1 D4/2 G4/1 F#4/1 " +
      "E4/2 C4/2 E4/2 G4/2 D4/6 G3/1 B3/1 D4/2 D4/2 D4/2 D4/2 D4/3 G4/1 D4/2 B3/1 " +
      "C4/1 D4/2 D4/2 C4/2 A3/2 G3/5",
  },
  {
    id: "row-boat",
    title: "Row, Row, Row Your Boat",
    credit: "Eliphalet Oram Lyte, 1881",
    composer: "Eliphalet Oram Lyte",
    year: 1881,
    genre: "party",
    bpm: 120,
    meter: 3,
    melody:
      "C4/1.5 C4/1.5 C4/1 D4/0.5 E4/1.5 E4/1 D4/0.5 E4/1 F4/0.5 G4/3 " +
      "C5/0.5 C5/0.5 C5/0.5 G4/0.5 G4/0.5 G4/0.5 E4/0.5 E4/0.5 E4/0.5 C4/0.5 C4/0.5 C4/0.5 " +
      "G4/1 F4/0.5 E4/1 D4/0.5 C4/3",
  },
];
