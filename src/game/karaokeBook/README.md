# src/game/karaokeBook

The Karaoke Loft's songbook data, split by family. [`../karaokeSongs.ts`](../karaokeSongs.ts) imports these parts and builds the full songbook.

## Files

| File         | What it does                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `america.ts` | American songs: spirituals and gospel, old-time and cowboy country, the parlor, the Civil War, patriotic and school songs. |
| `classic.ts` | The concert hall and the nursery: classical themes, opera arias, lullabies and holiday songs.                              |
| `stage.ts`   | The stage and dance hall: blues, early jazz, ragtime, Tin Pan Alley, music hall and the Great War.                         |
| `world.ts`   | The wider world: Irish, Scottish and Welsh songs, sea shanties, Latin songs and folk songs from other countries.           |

## Notes

- Every song is in the US public domain (published in 1929 or earlier, melody and words both, or traditional) and names its composer and publication year. Checks live in `../karaokeSongs.test.ts`.
