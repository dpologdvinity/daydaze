// The karaoke songbook, part: the stage and the dance hall: blues, early jazz, ragtime, Tin Pan Alley, music hall and the Great War.
// Every song is in the US public domain (published in 1929 or earlier, melody
// and words both, or traditional), names its composer and publication year,
// and is written in the note-string format of src/game/karaokeSongs.ts. The
// melodies are transcribed from public-domain notation (ABC tune archives,
// compared across independent transcriptions), moved to a singable key and
// cut at a cadence; the `source:` comments name where each came from.

import type { KaraokeSong } from "../karaokeSongs.ts";

export const STAGE: readonly KaraokeSong[] = [
  // source: tunearch.org/wiki/Ain%27t_that_Trouble_in_Mind.no-ext/0001
  {
    id: "trouble-in-mind",
    title: "Trouble in Mind",
    credit: "Richard M. Jones, 1924",
    composer: "Richard M. Jones",
    year: 1924,
    genre: "blues",
    bpm: 84,
    pickup: 3,
    melody:
      "D4/1 E4/1 G4/0.5 A4/0.5 G4/0.5 A4/0.5 G4/1 G4/1.5 A4/0.5 B4/0.5 A4/0.5 D4/1 " +
      "E4/1 F#4/1 G4/1 A4/0.5 B4/0.5 G4/1.5 A4/0.5 G4/1 A4/0.5 B4/0.5 C5/0.5 D5/1 " +
      "D5/1 D5/1 B4/0.5 C5/0.5 D5/1 D5/2 B4/1 D5/1 F5/1 E5/1 D5/1 C5/1.5 D5/0.5 C5/1 " +
      "B4/0.5 A4/0.5 G4/1 A4/0.5 B4/0.5 C5/1 D5/1 E5/1.5 D5/0.5 E5/1 B4/0.5 C5/0.5 " +
      "D5/1 C5/1 B4/1 A4/1 G4/1.5 G4/0.5 G4/1",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/CARELOVE/0000
  {
    id: "careless-love",
    title: "Careless Love",
    credit: "Traditional blues",
    composer: "Traditional",
    year: 1927,
    genre: "blues",
    bpm: 84,
    melody:
      "A4/3 F4/1 E4/1 C4/1 E4/1 G4/1 F4/6 r/2 A4/3 A#4/1 C5/1 C5/1 D5/1 C5/1 G4/6 " +
      "A4/1 A#4/1 A4/3 A#4/1 C5/2 C5/2 D5/2 A#4/2 F4/2 G4/1 G#4/1 A4/3 F4/1 E4/1 " +
      "C4/1 E4/1 G4/1 F4/6",
  },
  // source: trillian.mit.edu/~jc/music/abc/Vintage/ragtime/Maple_Leaf_Rag-F--/0000
  {
    id: "maple-leaf",
    title: "Maple Leaf Rag",
    credit: "Scott Joplin, 1899",
    composer: "Scott Joplin",
    year: 1899,
    genre: "ragtime",
    bpm: 110,
    pickup: 3,
    melody:
      "F3/0.5 C4/0.5 F3/0.5 A3/0.5 C4/1 F3/0.5 C4/0.5 E3/0.5 G3/0.5 C4/2.5 r/0.5 " +
      "F3/0.5 C4/0.5 F3/0.5 A3/0.5 C4/1 F3/0.5 C4/0.5 E3/0.5 G3/0.5 C4/2.5 r/0.5 " +
      "F3/0.5 G#3/0.5 C#4/0.5 r/0.5 C4/1 C4/0.5 r/0.5 F3/0.5 G#3/0.5 C#4/0.5 r/0.5 " +
      "C4/1.5 F3/0.5 G#3/0.5 C4/0.5 F4/0.5 F4/0.5 G#4/0.5 C5/0.5 F5/0.5 F3/0.5 " +
      "G#3/0.5 C4/0.5 F4/0.5 F4/0.5 G#4/0.5 C5/0.5 F5/0.5 F4/1 F4/1 F4/1 F4/0.5 F4/1 " +
      "C4/0.5 D4/0.5 A3/0.5 C4/0.5 D4/1.5 F3/0.5 G3/0.5 G#3/0.5 F3/0.5 G3/0.5 A3/1 " +
      "F3/0.5 A3/0.5 F3/0.5 G3/1 F3/1 r/1 F4/1 F4/1 F4/1 F4/0.5",
  },
  // source: colinhume.com/ABC.txt/0631
  {
    id: "hot-time",
    title: "A Hot Time in the Old Town",
    credit: "Theodore Metz, 1896",
    composer: "Theodore Metz",
    year: 1896,
    genre: "ragtime",
    bpm: 120,
    melody:
      "B4/2 B4/2 B4/3 A#4/0.5 B4/0.5 C5/1 B4/1 A#4/1 B4/1 G4/4 D5/2 D5/2 D5/3 " +
      "C#5/0.5 D5/0.5 E5/1 D5/1 C#5/1 D5/1 B4/1 D4/1 G4/1 A4/1 B4/2 B4/2 B4/3 " +
      "A#4/0.5 B4/0.5 C5/1 B4/1 A#4/1 B4/1 G4/1 G4/1 F#4/1 G4/1 B4/1 A4/2 E4/1 B4/1 " +
      "A4/2 D4/1 G4/6",
  },
  // source: trillian.mit.edu/~jc/music/abc/program/song/AlexandersRagtimeBand1_Gw/0000
  {
    id: "alexander",
    title: "Alexander's Ragtime Band",
    credit: "Irving Berlin, 1911",
    composer: "Irving Berlin",
    year: 1911,
    genre: "ragtime",
    bpm: 130,
    pickup: 3,
    key: { tonic: 7, minor: false },
    melody:
      "B3/1 B3/1.5 r/0.5 B3/1 B3/1.5 r/0.5 B3/1 B3/1 A3/1 F#3/1 D3/1 G3/1.5 r/0.5 " +
      "E4/1 E4/1.5 r/0.5 E4/1 E4/1.5 r/0.5 E4/1 E4/1 C4/1 G3/1 C4/1 E4/1.5 r/0.5 " +
      "E4/1 D4/1 E4/1 D4/1 E4/1 D4/1 E4/1 D4/1 B3/1 G3/1 B3/1 G3/1 B3/1 G3/1 B3/1 " +
      "G3/1 r/0.5 A3/1 A3/2 B3/1 C#4/1 A3/1 B3/1 C#4/1 D4/1 r/0.5 D4/1 r/0.5 C4/0.5 " +
      "B3/1.5 A3/1 B3/1 B3/1.5 r/0.5 B3/1 B3/1.5 r/0.5 B3/1 B3/1 A3/1 F#3/1 D3/1 " +
      "G3/1.5 r/0.5 E4/1 E4/1.5 r/0.5 E4/1 E4/1.5",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/RAGTMJOE/0000
  {
    id: "cowboy-joe",
    title: "Ragtime Cowboy Joe",
    credit: "Lewis F. Muir, 1912",
    composer: "Lewis F. Muir",
    year: 1912,
    genre: "ragtime",
    bpm: 120,
    melody:
      "G4/0.75 G4/0.25 G4/0.75 G#4/0.25 A4/0.75 A4/0.25 A4/0.75 G#4/0.25 G4/1.5 " +
      "G#4/0.5 A4/1 G#4/0.75 G#4/0.25 G4/0.75 G4/0.25 G4/0.75 G#4/0.25 A4/0.75 " +
      "A4/0.25 A4/0.75 G4/0.25 F#4/0.5 E5/1 D5/1.5 G4/1 G4/0.5 G#4/1.5 A4/0.5 " +
      "G#4/1.5 G4/1 G#4/0.5 A4/1.5 C5/1",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/co-mando.com/tableditabc/0114
  {
    id: "sweet-georgia",
    title: "Sweet Georgia Brown",
    credit: "Ben Bernie and Maceo Pinkard, 1925",
    composer: "Ben Bernie and Maceo Pinkard",
    year: 1925,
    genre: "jazz",
    bpm: 136,
    pickup: 1,
    melody:
      "F4/1 E4/1 D#4/1 D4/1 E4/1 F#4/1 D4/1 A4/1 F#4/1 B4/1 A4/1 D5/1 D5/0.5 D5/0.5 " +
      "A4/1 F#4/1 D4/0.5 D4/0.5 C4/1 B3/1 A3/1 D4/0.5 D4/0.5 E4/1 F4/1 D4/1 A4/1 " +
      "F4/1 B4/1 A4/1 D5/1 D5/0.5 D5/0.5 B4/1 A4/1 G4/1 F4/1",
  },
  // source: trillian.mit.edu/~jc/music/abc/program/Shine_On_Harvest_Moon/0000
  {
    id: "shine-moon",
    title: "Shine On, Harvest Moon",
    credit: "Nora Bayes and Jack Norworth, 1908",
    composer: "Nora Bayes and Jack Norworth",
    year: 1908,
    genre: "tin-pan-alley",
    bpm: 100,
    pickup: 3,
    melody:
      "B4/1 C5/2 B4/2 C5/1 B4/1 G#4/1 E4/1 C#4/2.5 C4/0.5 C#4/0.5 B4/0.5 A4/3 r/1 " +
      "B4/2 A4/2 B4/1 A4/0.5 D5/1 B4/0.5 A4/1 G4/0.5 E4/0.5 D4/0.5 E4/0.5 G4/0.5 " +
      "E4/0.5 D4/0.5 E4/0.5 G4/0.5 E4/0.5 D4/0.5 G4/1.5 r/1 C5/2 B4/2 C5/1 B4/1 " +
      "G#4/1 E4/1 C#4/2.5 C4/0.5 C#4/0.5 B4/0.5 A4/3 A4/1 B4/2 A4/2 B4/1 A4/0.5 " +
      "D5/1.5 B4/1 G4/1.5 D4/0.5 E4/0.5 D4/0.5 E4/0.5 G4/3.5",
  },
  // source: trillian.mit.edu/~jc/music/abc/Finland/foxtrot/ByTheLight_A/0000
  {
    id: "silvery-moon",
    title: "By the Light of the Silvery Moon",
    credit: "Gus Edwards, 1909",
    composer: "Gus Edwards",
    year: 1909,
    genre: "tin-pan-alley",
    bpm: 88,
    pickup: 2,
    melody:
      "C#4/1 D4/1 E4/4 r/1 A4/0.5 B4/0.5 C#5/0.5 B4/0.5 A4/1 F#4/4 r/1 B4/1 A4/1 " +
      "F#4/1 G#4/4 r/1 E4/0.5 F#4/0.5 G#4/0.5 F#4/0.5 E4/1 F#4/2 C#4/2 E4/2 C#4/1 " +
      "D4/1 E4/4 r/1 A4/0.5 B4/0.5 C#5/0.5 B4/0.5 A4/1 F#4/4 r/1 B4/1 C#5/1 D5/1 " +
      "C#5/1 A4/1 B4/1 D5/1 C#5/1 A4/0.5 B4/0.5 C#5/0.5 B4/0.5 A4/1 C#5/4 r/1 A4/0.5 " +
      "B4/0.5 C#5/0.5 A4/0.5 B4/1 A4/5",
  },
  // source: trillian.mit.edu/~jc/music/abc/session/SAFD/___/George_M_medley/0001
  {
    id: "regards-broadway",
    title: "Give My Regards to Broadway",
    credit: "George M. Cohan, 1904",
    composer: "George M. Cohan",
    year: 1904,
    genre: "tin-pan-alley",
    bpm: 120,
    meter: 2,
    pickup: 1.5,
    melody:
      "A3/0.25 B3/0.5 C#4/0.25 D4/0.5 E4/0.5 D4/1 C#4/0.75 A3/0.25 B3/0.25 B3/0.25 " +
      "B3/0.25 B3/0.25 C#4/0.5 C#4/0.5 A3/2 A3/0.25 B3/0.5 C#4/0.25 D4/0.5 B3/0.5 " +
      "C#4/0.5 D4/0.5 E4/0.25 C#4/0.25 B3/0.25 A3/0.25 D4/0.5 B3/0.5 C#4/0.5 D4/0.5 " +
      "E4/1.25 r/0.25 r/0.5 A3/0.25 B3/0.5 C#4/0.25 D4/0.5 E4/0.5 D4/1 C#4/0.75 " +
      "A3/0.25 B3/0.25 B3/0.25 B3/0.25 B3/0.25 C#4/0.5 C#4/0.5 A3/1.75 r/0.25 " +
      "F#4/0.25 D#4/0.5 B3/0.25 G4/0.5 F#4/0.5 E4/0.5 D#4/0.5 E4/0.25 D4/0.25 " +
      "E4/0.25 D4/0.25 F#4/0.75 D4/0.25 D4/0.5 E4/0.5 D4/1.5",
  },
  // source: trillian.mit.edu/~jc/music/abc/Contra/march/GrandOldFlag_C/0000
  {
    id: "grand-old-flag",
    title: "You're a Grand Old Flag",
    credit: "George M. Cohan, 1906",
    composer: "George M. Cohan",
    year: 1906,
    genre: "tin-pan-alley",
    bpm: 120,
    meter: 2,
    pickup: 1,
    melody:
      "G4/0.5 E4/0.5 C4/1 C4/1 C4/1 A3/0.5 G3/0.5 C4/0.5 D4/1 B3/0.5 C4/1 A3/0.5 " +
      "G3/0.5 C4/1 A3/0.5 G3/0.5 C4/1 A3/0.5 G3/0.5 B3/3 r/0.5 G3/0.5 B3/1 C4/1 D4/1 " +
      "B3/0.5 G3/0.5 C4/1 D4/1 E4/2 D4/0.5 E4/1 C4/0.5 D4/0.5 E4/1 C4/0.5 D4/3 " +
      "G4/0.5 E4/0.5 C4/1 C4/1 C4/1 A3/0.5 G3/0.5 C4/0.5 D4/1 B3/0.5 C4/1 B3/0.5 " +
      "A#3/0.5 A3/1 C#4/0.5 E4/0.5 A4/1 G4/1 F4/3 G3/1 C4/1.5 B3/0.5 C4/1 E4/1 " +
      "D4/1.5 C#4/0.5 D4/1 G3/0.5 G3/0.5 A3/0.5 C4/1 B3/0.5 C4/1 D4/1 C4/3",
  },
  // source: trillian.mit.edu/~jc/music/abc/program/Let_Me_Call_You_Sweetheart/0003
  {
    id: "call-sweetheart",
    title: "Let Me Call You Sweetheart",
    credit: "Leo Friedman, 1910",
    composer: "Leo Friedman",
    year: 1910,
    genre: "tin-pan-alley",
    bpm: 88,
    meter: 3,
    melody:
      "F#3/2 A3/1 D4/2 E4/1 F#4/1 A3/2 G#3/2 A3/1 B3/3 B3/3 B3/6 C#4/2 C4/1 C#4/2 " +
      "D4/1 E4/1 C#4/2 B3/2 C#4/1 A3/3 A3/3 A3/4 G#3/1 G3/1 F#3/2 A3/1 D4/2 E4/1 " +
      "F#4/1 A3/2 G#3/2 A3/1 B3/3 B3/3 E4/6 E4/2 D4/1 C#4/2 D4/1 F#4/1 A3/2 G4/2 " +
      "F#4/1 B3/3 C#4/3 D4/6",
  },
  // source: trillian.mit.edu/~jc/music/abc/mirror/thisoldtractor.com/I_Do_Like_To_Be_Beside_The_Seaside/0000
  {
    id: "seaside",
    title: "I Do Like to Be Beside the Seaside",
    credit: "John A. Glover-Kind, 1907",
    composer: "John A. Glover-Kind",
    year: 1907,
    genre: "music-hall",
    bpm: 120,
    pickup: 3,
    key: { tonic: 5, minor: false },
    melody:
      "C5/0.5 C#5/0.5 D5/1 C5/0.5 A4/0.5 G4/0.5 F4/0.5 E4/0.5 F4/0.5 C5/1 C5/2 C5/1 " +
      "D5/1 C5/0.5 A4/0.5 G4/0.5 F4/0.5 E4/0.5 F4/0.5 D5/3 D5/1 E5/1 D5/0.5 A#4/0.5 " +
      "A4/0.5 G4/0.5 F#4/0.5 G4/0.5 D5/1 C5/1 A#4/1 A4/0.5 F4/0.5 A4/1 G4/1 A4/1 " +
      "G4/0.5 F#4/0.5 G4/0.5 A4/1 G4/1 E4/1 C5/1 D5/1 C5/0.5 A4/0.5 G4/0.5 F4/0.5 " +
      "E4/0.5 F4/0.5 C5/1 C5/3 D5/1 C5/0.5 A4/0.5 G4/0.5 F4/0.5 E4/0.5 F4/0.5 D5/3 " +
      "C#5/0.5 D5/0.5 E5/0.5 D5/0.5 E5/0.5 D5/0.5 E5/1 D5/0.5 B4/0.5 D5/0.5 C5/0.5 " +
      "D5/0.5",
  },
  // source: sniff.numachi.com/~rickheit/dtrad/abc_dtrad.tar.gz/abc_dtrad/TIPRARY/0000
  {
    id: "tipperary",
    title: "It's a Long Way to Tipperary",
    credit: "Jack Judge, 1912",
    composer: "Jack Judge",
    year: 1912,
    genre: "music-hall",
    bpm: 100,
    pickup: 3.5,
    melody:
      "D4/0.5 B4/0.5 B4/0.5 B4/0.5 C5/0.5 B4/0.5 B4/0.5 A4/0.5 G4/0.5 A4/0.5 B4/0.5 " +
      "A4/0.5 G4/0.5 E4/1.5 G4/0.5 A4/0.5 A4/0.5 A4/0.5 B4/0.5 A4/0.5 G4/0.5 E4/0.5 " +
      "D4/0.5 G4/0.5 G4/0.5 G4/0.5 G4/0.5 D4/1 r/1 B4/0.5 B4/0.5 B4/0.5 C5/0.5 " +
      "B4/0.5 B4/0.5 A4/0.5 G4/0.5 A4/0.5 B4/0.5 A4/0.5 G4/0.5 E4/1 G4/1 A4/0.5 " +
      "A4/0.5 A4/0.5 B4/0.5 A4/0.5 G4/0.5",
  },
  // source: trillian.mit.edu/~jc/music/abc/Vintage/20181109/0008
  {
    id: "pack-troubles",
    title: "Pack Up Your Troubles",
    credit: "Felix Powell, 1915",
    composer: "Felix Powell",
    year: 1915,
    genre: "music-hall",
    bpm: 112,
    meter: 2,
    pickup: 1,
    melody:
      "F#3/0.5 G3/0.5 A3/1 A3/0.5 B3/0.5 A3/0.5 G3/0.5 F#3/0.5 G3/0.5 A3/1 F#4/1 " +
      "F#4/1 E4/1 D4/2 B3/2 A3/3 F#3/0.5 G3/0.5 A3/1 A3/0.5 B3/0.5 A3/0.5 G3/0.5 " +
      "F#3/0.5 G3/0.5 A3/1 F#4/1 D4/1.5 D4/0.5 E4/1 B3/1 C#4/1 D4/1 E4/4 D4/1.5 " +
      "E4/0.5 F#4/1 D4/1 C#4/0.5 D4/0.5 E4/2 E4/0.5 F#4/0.5 G4/1 E4/1 F#4/1 D4/1 " +
      "E4/2 A4/2 A3/1 A3/0.5 B3/0.5 A3/0.5 G3/0.5 F#3/0.5 G3/0.5 A3/1 A4/1 A4/1 G4/1 " +
      "F#4/2 E4/2 D4/3",
  },
  // source: colinhume.com/ABC.txt/0914
  {
    id: "monte-carlo",
    title: "The Man Who Broke the Bank at Monte Carlo",
    credit: "Fred Gilbert, 1892",
    composer: "Fred Gilbert",
    year: 1892,
    genre: "music-hall",
    bpm: 132,
    meter: 3,
    pickup: 2,
    melody:
      "D4/0.5 E4/0.5 F#4/1 F#4/0.5 F#4/1 F#4/0.5 F#4/1 F#4/0.5 F#4/0.5 E4/0.5 D4/0.5 " +
      "B4/1 B4/0.5 B4/1 B4/0.5 B4/2 D4/0.5 D4/0.5 C5/1 C5/0.5 C5/1 C5/0.5 C5/2 " +
      "A4/0.5 F#4/0.5 D5/1 D5/0.5 D5/1 D5/0.5 D5/1.5 r/0.5 E5/0.5 B4/0.5 C5/1 C5/0.5 " +
      "C5/1 C5/0.5 C5/1 C5/0.5 C5/0.5 D5/0.5 A4/0.5 B4/1 B4/0.5 B4/1 B4/0.5 B4/1 " +
      "B4/0.5 B4/0.5 C5/0.5 B4/0.5 A4/1 A4/0.5 G#4/1 A4/0.5 B4/1 A4/0.5 F#4/1 D4/0.5 " +
      "A4/3 G4/2",
  },
  // source: pghardy.net/tunebooks/pgh_session_tunebook/0304
  {
    id: "home-fires",
    title: "Keep the Home Fires Burning",
    credit: "Ivor Novello, 1914",
    composer: "Ivor Novello",
    year: 1914,
    genre: "music-hall",
    bpm: 88,
    melody:
      "B4/1.5 C5/0.5 D5/1 B4/1 B4/2 A4/2 G4/1.5 A4/0.5 B4/1 G4/1 G4/2 F#4/2 E4/1.5 " +
      "F#4/0.5 G4/1 E4/1 D4/1 G4/1 B4/1 D5/0.5 C5/0.5 B4/2 A4/2 A4/4 B4/1.5 C5/0.5 " +
      "D5/1 B4/1 B4/2 A4/2 G4/1.5 A4/0.5 B4/1 G4/1 G4/2 F#4/2 E4/1.5 F#4/0.5 G4/1 " +
      "E4/1 D4/1 G4/1 B4/1 D5/0.5 C5/0.5 B4/2 A4/2 G4/4",
  },
];
