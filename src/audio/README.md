# src/audio

Procedural Web Audio: one shared audio bus, a live-synthesized jukebox, instruments, world sounds and the lazy loading of recorded sound files. The client UI and scenes in `src/client/` call into it; the minigames in [`../minigames/`](../minigames/README.md) play through the same bus.

## Files

### The bus and playback

| File                                   | What it does                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `audioBus.ts` (+ `audioBus.test.ts`)   | Shared routing: one `AudioContext`, one master gain and separate Music and SFX buses, so the global mute and volume reach every producer.  |
| `audioContextClass.ts`                 | The browser's `AudioContext` constructor (or the webkit-prefixed one), or `undefined` in Node.                                             |
| `soundFiles.ts`                        | Lazy playback of recorded files through the SFX bus; no requests before audio is unlocked. Falls back when a file will not load or decode. |
| `soundIds.ts`                          | Ids of the one-shot sound files in `public/audio/<id>.ogg`.                                                                                |
| `engineMix.ts` (+ `engineMix.test.ts`) | How loud and how fast the recorded engine and tire loops play at a given speed. Pure.                                                      |
| `ambience.ts` (+ `ambience.test.ts`)   | Picks the looped ambience for a place and its daylight. Pure.                                                                              |
| `fakeAudioContext.ts`                  | Test support: a hand-built stand-in passed where an `AudioContext` is expected, without a type assertion.                                  |

### Music and instruments

| File                                                   | What it does                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `proceduralJukebox.ts` (+ `proceduralJukebox.test.ts`) | Nine looping tracks synthesized live on a lookahead scheduler, played through one shared controller on the music bus.                     |
| `sharedJukebox.ts`                                     | Where the shared jukebox controller is kept, split out so the beat clock can peek at it without loading the synthesis code.               |
| `carRadio.ts` (+ `carRadio.test.ts`)                   | The car radio: steps through a few jukebox stations, then off.                                                                            |
| `instrumentSynths.ts` (+ `instrumentSynths.test.ts`)   | Notes for the playable piano, marimba, floor piano and eight-pad drum kit.                                                                |
| `parkBand.ts` (+ `parkBand.test.ts`)                   | The park band's march-band sound, with a pure scheduler for the arrangement in `src/game/city/bandTunes.ts`; louder the nearer you stand. |
| `iceCream.ts` (+ `iceCream.test.ts`)                   | Short music-box phrases of a public-domain melody (Twinkle Twinkle), played at the ice cream stop.                                        |

### Sound effects

| File                                       | What it does                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `worldSounds.ts` (+ `worldSounds.test.ts`) | Synthesized footsteps, door whooshes, UI ticks, alarm bell, sirens and looping ambience beds. |
| `barSynths.ts` (+ `barSynths.test.ts`)     | Last Call's pour, shaker rattle and service bell.                                             |
| `streakSound.ts` (+ `streakSound.test.ts`) | The streak milestone chime, kept apart so it ships with the lazy streak panel.                |

### Substance filters (18+)

| File                                     | What it does                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `highFilter.ts` (+ `highFilter.test.ts`) | The high: a gentle reverb bloom and low-pass roll-off in music rooms, as a pure parameter mapping plus nodes eased by level. |
| `acidFilter.ts` (+ `acidFilter.test.ts`) | The acid sound: a high-shelf lift and a short feedback echo on the master bus, silent at level 0.                            |

## Notes

- Everything routes through the shared bus so mute and volume work globally; producers must not create their own `AudioContext`.
- Code must not throw when Web Audio is missing (Node tests, old browsers); a controller without a context stays silent.
- The substance filters are adult-tier effects: the models are in [`../game/effects/`](../game/effects/README.md) and stay behind `ADULT_OK`.
