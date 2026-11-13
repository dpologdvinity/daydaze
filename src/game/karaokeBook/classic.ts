// The karaoke songbook, part: the concert hall and the nursery: classical themes, opera arias, lullabies, and the holiday songs.
// Every song is in the US public domain (published in 1929 or earlier, melody
// and words both, or traditional), names its composer and publication year,
// and is written in the note-string format of src/game/karaokeSongs.ts. The
// melodies are transcribed from public-domain notation (ABC tune archives,
// compared across independent transcriptions), moved to a singable key and
// cut at a cadence; the `source:` comments name where each came from.

import type { KaraokeSong } from "../karaokeSongs.ts";

export const CLASSIC: readonly KaraokeSong[] = [
  // source: trillian.mit.edu/~jc/music/abc/mirror/folkinfo.org/All_Through_the_Night/0000
  {
    id: "all-through-night",
    title: "All Through the Night",
    credit: "Traditional, Wales",
    composer: "Traditional",
    year: 1784,
    genre: "lullaby",
    bpm: 66,
    melody:
      "G4/1.5 F#4/0.5 E4/1 G4/1 A4/1.5 G4/0.5 F#4/1 D4/1 E4/2 F#4/1.5 F#4/0.5 G4/3 " +
      "r/1 G4/1.5 F#4/0.5 E4/1 G4/1 A4/1.5 G4/0.5 F#4/1 D4/1 E4/2 F#4/1.5 F#4/0.5 " +
      "G4/3 r/1 C5/1 B4/1 C5/1 D5/1 E5/1.5 D5/0.5 C5/1 B4/1 C5/1 B4/1 A4/1 G4/1 " +
      "B4/1.5 A4/0.5 G4/1 F#4/1 G4/1.5 F#4/0.5 E4/1 G4/1 A4/1.5 G4/0.5 F#4/1 D4/1 " +
      "E4/2 F#4/1.5 F#4/0.5 G4/3",
  },
  // source: anamnese.online.fr/site2/abc/gallia_ps/0011
  {
    id: "au-clair-lune",
    title: "Au Clair de la Lune",
    credit: "Traditional, France",
    composer: "Traditional",
    year: 1780,
    genre: "lullaby",
    bpm: 84,
    melody:
      "C4/1 C4/1 C4/1 D4/1 E4/2 D4/2 C4/1 E4/1 D4/1 D4/1 C4/4 C4/1 C4/1 C4/1 D4/1 " +
      "E4/2 D4/2 C4/1 E4/1 D4/1 D4/1 C4/4 D4/1 D4/1 D4/1 D4/1 A3/2 A3/2 D4/1 C4/1 " +
      "B3/1 A3/1 G3/4 C4/1 C4/1 C4/1 D4/1 E4/2 D4/2 C4/1 E4/1 D4/1 D4/1 C4/4",
  },
  // source: trillian.mit.edu/~jc/music/book/EverydaySongBook/009_Rock-a-bye_Baby/0000
  {
    id: "rock-a-bye",
    title: "Rock-a-Bye Baby",
    credit: "Effie I. Crockett, 1887",
    composer: "Effie I. Crockett",
    year: 1887,
    genre: "lullaby",
    bpm: 80,
    meter: 3,
    melody:
      "D4/0.5 F4/0.5 D5/0.5 C5/1 A#4/0.5 D4/0.5 F4/0.5 A#4/0.5 A4/1.5 D#4/0.5 F4/0.5 " +
      "D#5/0.5 D5/1 C5/0.5 C5/0.5 A#4/0.5 G4/0.5 F4/1.5 D4/0.5 F4/0.5 D5/0.5 C5/1 " +
      "A#4/0.5 D4/0.5 F4/0.5 A#4/0.5 A4/1 G4/0.5 F4/0.5 A#4/0.5 D#5/0.5 D5/0.5 A#4/1 " +
      "C5/0.5 G4/0.5 A4/0.5 A#4/1",
  },
  // source: www.godsongs.net/2016/12/adeste-fideles-o-come-all-ye-faithful.html/0001
  {
    id: "o-come-faithful",
    title: "O Come, All Ye Faithful",
    credit: "John Francis Wade, 1743",
    composer: "John Francis Wade",
    year: 1743,
    genre: "holiday",
    bpm: 92,
    pickup: 3,
    melody:
      "F4/1 F4/2 C4/1 F4/1 G4/2 C4/2 A4/1 G4/1 A4/1 A#4/1 A4/2 G4/1 F4/1 F4/2 E4/1 " +
      "D4/1 E4/1 F4/1 G4/1 A4/1 E4/2 D4/1 C4/1 C4/3 r/1 C5/2 A#4/1 A4/1 A#4/2 A4/2 " +
      "G4/1 A4/1 F4/1 G4/1 E4/1 D4/1 C4/1 F4/1 F4/1 E4/1 F4/1 G4/1 F4/2 C4/1 A4/1 " +
      "A4/1 G4/1 A4/1 A#4/1 A4/2 G4/1 A4/1 A#4/1 A4/1 G4/1 F4/1 E4/2 F4/1 A#4/1 A4/2 " +
      "G4/1 F4/1 F4/3",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/FRSTNOEL/0000
  {
    id: "first-noel",
    title: "The First Noel",
    credit: "Traditional, England",
    composer: "Traditional",
    year: 1823,
    genre: "holiday",
    bpm: 84,
    meter: 3,
    pickup: 2,
    key: { tonic: 0, minor: false },
    melody:
      "E4/0.5 D4/0.5 C4/1.5 D4/0.5 E4/0.5 F4/0.5 G4/2 A4/0.5 B4/0.5 C5/1 B4/1 A4/1 " +
      "G4/1.5 r/0.5 A4/0.5 B4/0.5 C5/1 B4/1 A4/1 G4/1 A4/1 B4/1 C5/1 G4/1 F4/1 E4/2 " +
      "E4/0.5 D4/0.5 C4/1.5 D4/0.5 E4/0.5 F4/0.5 G4/2 A4/0.5 B4/0.5 C5/1 B4/1 A4/1 " +
      "G4/1.5 r/0.5 A4/0.5 B4/0.5 C5/1 B4/1 A4/1 G4/1 A4/1 B4/1 C5/1 G4/1 F4/1 E4/2 " +
      "E4/0.5 D4/0.5 C4/1.5 D4/0.5 E4/0.5 F4/0.5 G4/2 C5/0.5 B4/0.5 A4/1.5 B4/0.5 " +
      "C5/0.5 A4/0.5 G4/1 A4/1 B4/1 C5/1 B4/1 A4/1 G4/1 A4/1 B4/1 C5/1 G4/1 F4/1 " +
      "E4/2",
  },
  // source: trillian.mit.edu/~jc/music/abc/Germany/xmas/OTannenbaum_G/0000
  {
    id: "o-tannenbaum",
    title: "O Christmas Tree (O Tannenbaum)",
    credit: "Traditional, Germany",
    composer: "Traditional",
    year: 1824,
    genre: "holiday",
    bpm: 88,
    meter: 3,
    pickup: 2,
    melody:
      "D4/1 G4/0.5 G4/0.5 G4/1 A4/1 B4/0.5 B4/0.5 B4/1.5 B4/0.5 A4/0.5 B4/0.5 C5/1 " +
      "F#4/1 A4/1 G4/1 r/0.5 D5/0.5 D5/0.5 B4/0.5 E5/1.5 D5/0.5 D5/0.5 C5/0.5 C5/1.5 " +
      "C5/0.5 C5/0.5 A4/0.5 D5/1.5 C5/0.5 C5/0.5 B4/0.5 B4/1 D4/1 G4/0.5 G4/0.5 G4/1 " +
      "A4/1 B4/0.5 B4/0.5 B4/1.5 B4/0.5 A4/0.5 B4/0.5 C5/1 F#4/1 A4/1 G4/1",
  },
  // source: colinhume.com/ABC.txt/0541
  {
    id: "wenceslas",
    title: "Good King Wenceslas",
    credit: "Traditional, 1853",
    composer: "Traditional",
    year: 1853,
    genre: "holiday",
    bpm: 90,
    melody:
      "G4/1 G4/1 G4/1 A4/1 G4/1 G4/1 D4/2 E4/1 D4/1 E4/1 F#4/1 G4/2 G4/2 G4/1 G4/1 " +
      "G4/1 A4/1 G4/1 G4/1 D4/2 E4/1 D4/1 E4/1 F#4/1 G4/2 G4/2 D5/1 C5/1 B4/1 A4/1 " +
      "B4/1 A4/1 G4/2 E4/1 D4/1 E4/1 F#4/1 G4/2 G4/2 D4/1 D4/1 E4/1 F#4/1 G4/1 G4/1 " +
      "A4/2 D5/1 C5/1 B4/1 A4/1 G4/2 C5/2 G4/4",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/LesterBailey/O_Little_Town_of_Bethlehem/0000
  {
    id: "little-town",
    title: "O Little Town of Bethlehem",
    credit: "Lewis Redner, 1868",
    composer: "Lewis Redner",
    year: 1868,
    genre: "holiday",
    bpm: 80,
    pickup: 3,
    melody:
      "D4/1 G4/1 G4/1 G4/1 A4/1 B4/0.5 A4/0.5 B4/0.5 C5/0.5 D5/1 B4/1 C5/1 B4/0.5 " +
      "G4/0.5 A4/1 A4/1 G4/3 G4/0.5 B4/0.5 D5/1.5 E5/0.5 D5/0.5 C5/0.5 B4/0.5 A4/0.5 " +
      "G4/0.5 A4/0.5 B4/0.5 C5/0.5 D5/1 D4/1 G4/1 B4/1 A4/1 G4/1 D4/2 r/1 D4/1 G4/1 " +
      "G4/1 G4/1 A4/1 B4/0.5 A4/0.5 B4/0.5 C5/0.5 D5/1 B4/1 C5/1 B4/0.5 G4/0.5 A4/1 " +
      "A4/1 G4/3",
  },
  // source: trillian.mit.edu/~jc/music/abc/Italy/song/LaDonnaEMobile_F/0000
  {
    id: "la-donna",
    title: "La donna è mobile",
    credit: "Giuseppe Verdi, 1851",
    composer: "Giuseppe Verdi",
    year: 1851,
    genre: "opera",
    bpm: 132,
    meter: 3,
    melody:
      "A4/1 A4/1 A4/1 C5/0.5 A#4/0.5 G4/2 G4/1 G4/1 G4/1 A#4/0.5 A4/0.5 F4/2 A4/1 " +
      "G4/1 F4/1 F4/0.5 E4/0.5 E4/2 G4/1 F4/1 D4/1 D4/0.5 C4/0.5 C4/2 A4/1 A4/1 A4/1 " +
      "C5/0.5 A#4/0.5 G4/2 G4/1 G4/1 G4/1 A#4/0.5 A4/0.5 F4/2 A4/1 G4/1 F4/1",
  },
  // source: colinhume.com/ABC.txt/1021
  {
    id: "o-mio-babbino",
    title: "O mio babbino caro",
    credit: "Giacomo Puccini, 1918",
    composer: "Giacomo Puccini",
    year: 1918,
    genre: "opera",
    bpm: 72,
    meter: 3,
    melody:
      "G4/1 G4/1 G4/1 B4/2 F#4/1 E4/3 D4/3 G4/1 A4/1 B4/1 G4/2 G5/1 D5/3 D5/2 B4/1 " +
      "D5/2 A4/1 C5/2 B4/1 G4/3 G4/3 G4/1 A4/1 B4/1 G4/2 F#4/1 A4/3 A4/2 D4/1 G4/3 " +
      "B4/1 G4/1 F#4/1 E4/3 D4/3 G4/1 A4/1 B4/1 G4/2 G5/1 D5/3 D5/2 E5/1 G5/2 E5/1 " +
      "D5/2 C5/1 D5/3 B4/3 G4/1 A4/1 B4/1 G4/2 E4/1 G4/3 G4/2 E5/1 G5/2 E5/1 D5/2 " +
      "C5/1 G5/2 D5/1 C5/2 B4/1 E5/2 C5/1 B4/2 A4/1 G4/6",
  },
  // source: trillian.mit.edu/~jc/music/book/Kerr/MM4-V1/0663
  {
    id: "anvil-chorus",
    title: "Anvil Chorus",
    credit: "Giuseppe Verdi, 1853",
    composer: "Giuseppe Verdi",
    year: 1853,
    genre: "opera",
    bpm: 110,
    melody:
      "F#4/2 F#4/1.5 F#4/0.5 F#4/1.5 E4/0.5 D4/1.5 B3/0.5 A3/1.5 C#4/0.5 E4/1.5 " +
      "G4/0.5 F#4/2 D4/1 r/1 F#4/2 F#4/1.5 F#4/0.5 F#4/1.5 E4/0.5 D4/1.5 B3/0.5 " +
      "A3/1.5 C#4/0.5 E4/1.5 G4/0.5 F#4/1 D4/1 F#4/1 r/1 D4/1 r/1 E4/1 r/1 C#4/1 " +
      "D4/1 B3/1 C#4/1 F#3/1 r/1 r/0.5 A#3/0.5 B3/0.5 C#4/0.5 D4/1 D4/1 r/0.5 " +
      "C#4/0.5 D4/0.5 E4/0.5 F#4/1 F#4/1 r/0.5 E4/0.5 F#4/0.5 G4/0.5 A4/3 C#4/1 D4/1",
  },
  // source: ifdo.ca/~seymour/runabc/esac/fink0/0346
  {
    id: "kleine",
    title: "Eine kleine Nachtmusik",
    credit: "Wolfgang Amadeus Mozart, 1787",
    composer: "Wolfgang Amadeus Mozart",
    year: 1787,
    genre: "classical",
    bpm: 132,
    pickup: 3,
    melody:
      "F4/0.5 F4/0.5 A#4/0.75 A4/0.25 A#4/0.75 A4/0.25 A#4/0.75 A4/0.25 A#4/0.75 " +
      "C5/0.25 D5/1 r/2 D#5/0.5 D5/0.5 C5/0.75 B4/0.25 C5/0.75 B4/0.25 C5/0.75 " +
      "D#5/0.25 D5/0.75 C5/0.25 A#4/1.5 A4/0.25 G4/0.25 F4/1 F4/0.5 F4/0.5 A#4/0.75 " +
      "A4/0.25 A#4/0.75 A4/0.25 A#4/0.75 A4/0.25 A#4/0.75 C5/0.25 D5/2 E5/1 F5/0.5 " +
      "F5/0.5 F5/0.75 E5/0.25 D5/0.75 C5/0.25 C5/0.75 A#4/0.25 A4/0.75 G4/0.25 F4/2 " +
      "r/1 F4/0.5 F4/0.5 F4/1 C5/1 D5/1 C5/1 A#4/1 A#4/1",
  },
  // source: colinhume.com/ABC.txt/0129
  {
    id: "blue-danube",
    title: "The Blue Danube",
    credit: "Johann Strauss II, 1867",
    composer: "Johann Strauss II",
    year: 1867,
    genre: "classical",
    bpm: 132,
    meter: 3,
    pickup: 2,
    melody:
      "C4/1 C4/1 E4/1 G4/1 G4/2 G5/1 G5/2 E5/1 E5/2 C4/1 C4/1 E4/1 G4/1 G4/2 G5/1 " +
      "G5/2 F5/1 F5/2 B3/1 B3/1 D4/1 A4/1 A4/2 A5/1 A5/2 F5/1 F5/2 B3/1 B3/1 D4/1 " +
      "A4/1 A4/2 A5/1 A5/2 E5/1 E5/2 C4/1 C4/1 E4/1 G4/1 C5/2 C6/1 C6/2 G5/1 G5/2 " +
      "C4/1 C4/1 E4/1 G4/1 C5/2 C6/1 C6/2 A5/1 A5/2 D4/1 D4/1 F4/1 A4/1 A4/4 F#4/1 " +
      "G4/1 E5/4 C5/1 E4/1 E4/2 D4/1 A4/2 G4/1 C4/1 C4/1 C4/1 C4/1",
  },
  // source: www.cs.utexas.edu/~kaufmann/kaubells/notation/harmonies/hitchcock-harmony/0001
  {
    id: "funeral-marionette",
    title: "Funeral March of a Marionette",
    credit: "Charles Gounod, 1872",
    composer: "Charles Gounod",
    year: 1872,
    genre: "classical",
    bpm: 110,
    meter: 3,
    melody:
      "D4/1.5 F4/1.5 E4/1.5 A4/0.5 A#4/0.5 A4/0.5 D4/1.5 F4/1.5 E4/1.5 A4/0.5 " +
      "A#4/0.5 A4/0.5 D4/1.5 C#4/1.5 D4/1.5 E4/1.5 F4/1.5 G#4/1.5 A4/3 D4/1.5 F4/1.5 " +
      "E4/1.5 A4/0.5 A#4/0.5 A4/0.5 D4/1.5 F4/1.5 E4/1.5 A4/0.5 A#4/0.5 A4/0.5 " +
      "D4/1.5 E4/1.5 F4/1.5 G4/1.5 A4/3 A4/1.5 D5/1.5 C#5/3 D5/3 C#5/3 D5/3 C#5/1.5 " +
      "E5/1 D5/0.5 C#5/1.5 E5/1 D5/0.5 C#5/1.5 D5/1.5 E5/1.5 A5/1.5 D4/1.5 F4/1.5 " +
      "E4/1.5 A4/0.5 A#4/0.5 A4/0.5 D4/1.5 F4/1.5 E4/1.5 A4/0.5 A#4/0.5 A4/0.5 " +
      "D4/1.5 E4/1.5 F4/1.5 G4/1.5 A4/3 A4/1.5 D5/1.5 D4/1.5 E4/1.5 F4/1.5 G4/1.5 " +
      "A4/3 A4/1 C#5/0.5 D5/1.5",
  },
  {
    id: "twinkle",
    title: "Twinkle, Twinkle, Little Star",
    credit: "Traditional, France, 1761; words Jane Taylor, 1806",
    composer: "Traditional",
    year: 1806,
    genre: "lullaby",
    bpm: 100,
    melody:
      "C4/1 C4/1 G4/1 G4/1 A4/1 A4/1 G4/2 F4/1 F4/1 E4/1 E4/1 D4/1 D4/1 C4/2 " +
      "G4/1 G4/1 F4/1 F4/1 E4/1 E4/1 D4/2 G4/1 G4/1 F4/1 F4/1 E4/1 E4/1 D4/2 " +
      "C4/1 C4/1 G4/1 G4/1 A4/1 A4/1 G4/2 F4/1 F4/1 E4/1 E4/1 D4/1 D4/1 C4/2",
  },
];
