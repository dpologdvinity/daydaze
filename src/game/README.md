# src/game

Pure, tested game logic: rooms and their layouts, the rules of every minigame, the economy, saves, looks, events and age gating. The React Three Fiber client in `src/client/` stays thin and reads these modules; the network layer is in `src/net/` and the Worker in `server/`.

## Notes

- No React or three.js in this tree. Types, data and math only, so everything runs under the Node test runner (`npm test`).
- Test-first: a bug fix starts with a failing test. A test sits beside its subject as `foo.test.ts`; the tables name a test only where its pairing is not obvious, and not every file has one.
- Age gating goes through `age.ts` and `ADULT_OK` (`src/client/adult.ts`). Alcohol, drugs and 18+ venues stay behind it; see [`effects/`](effects/README.md).
- NPC dialogue is handwritten, never AI-generated; see [`dialogue/`](dialogue/README.md).
- Third-party assets must be in `docs/assets.md` and `credits.ts` (a test checks they match).

## Files

### Rooms, walking and seats

| File                                                                                                               | What it does                                                                                               |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `rooms.ts` (+ `rooms.test.ts`), `roomTypes.ts`                                                                     | Every room: the `RoomId` union, walkable floor, blockers, spawn, portals and the `ROOMS` table, in meters. |
| `area.ts` (+ `area.test.ts`), `areaTypes.ts`                                                                       | Walk areas: surfaces, solid blockers and portals, with clamping and wall-sliding movement.                 |
| `walk.ts` (+ `walk.test.ts`)                                                                                       | 2D ground-plane math: point-in-polygon, clamping to a room's walkable area, stepping and turning.          |
| `walker.ts` (+ `walker.test.ts`)                                                                                   | The player's walking state and its fixed-rate step.                                                        |
| `portals.ts` (+ `portals.test.ts`)                                                                                 | Which portal a point stands in and where a traveler lands in the target room.                              |
| `hotspots.ts`                                                                                                      | Floor spots in a room that open a 2D minigame.                                                             |
| `input.ts` (+ `input.test.ts`)                                                                                     | Maps keyboard codes to a move direction; keys and the touch stick feed the same action.                    |
| `seats.ts` (+ `seats.test.ts`), `seatApproach.ts` (+ `seatApproach.test.ts`), `seatMove.ts` (+ `seatMove.test.ts`) | Every seat, where to walk up to it, and the sit-down and stand-up move of the doll's root.                 |
| `surface.ts` (+ `surface.test.ts`)                                                                                 | Surface materials underfoot for footsteps.                                                                 |
| `chatSpots.ts` (+ `chatSpots.test.ts`)                                                                             | Where standing conversations form inside venues.                                                           |
| `cameraZoom.ts` (+ `cameraZoom.test.ts`)                                                                           | Wheel and pinch zoom on your own character.                                                                |
| `dockActions.ts` (+ `dockActions.test.ts`)                                                                         | The contextual action buttons in the city dock.                                                            |

### Venue layouts

One layout per venue, shared by the room's floor and blockers in `rooms.ts` and the 3D scene. Pure data.

| File                                                                                                                                                                                         | What it does                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arcadeBar.ts`, `boardwalkArcade.ts`, `bowlingAlley.ts`, `rollerRink.ts`, `skatepark.ts`                                                                                                     | Arcades and active venues: Player 2, Boardwalk Arcade, Glow Bowl, the roller disco, Concrete Wave.                                                                         |
| `backRoom.ts`, `jazzClub.ts`, `laNoche.ts`, `orbit.ts`, `rooftop.ts`, `sugarRush.ts`, `warehouse.ts`, `greenHaze.ts`, `hotelRooftop.ts`, `tikiBar.ts`, `wineBar.ts` (+ `nightlife.test.ts`)  | Bars and clubs: the Back Room, Midnight Horn, La Noche, Orbit 9, the Skylark, Sugar Rush, Bassline, Green Haze (18+), the Marquise Rooftop, the Coconut Grove, Cellar 214. |
| `karaoke.ts`, `studio.ts`, `vinylVault.ts`, `musicRooms.ts` (+ `musicRooms.test.ts`)                                                                                                         | Music venues: the Karaoke Loft, Loft Studios, Vinyl Vault and the rooms where being high lifts the audio.                                                                  |
| `espressoLab.ts`, `floristShop.ts`, `florist.ts` (+ `florist.test.ts`), `kamayanHall.ts`, `lune.ts`, `patisserie.ts`, `skateDiner.ts`, `driveIn.ts`, `market.ts`                             | Food and shops: Espresso Lab, Petal & Stem (and its bouquet rules), Kamayan Hall, Lune, Sucre, the Skate-Up Diner, the Starlite Drive-In, Skyline Supply.                  |
| `bookshop.ts`, `galleria.ts`, `thriftTemple.ts`, `videoStore.ts`, `dealership.ts` (+ `dealership.test.ts`), `salon.ts`                                                                       | Retail: Dog-Ear Books, the Starlight Galleria, Thrift Temple, Rewind Video, Daydaze Motors, the Blowout Bar and Ink & Needle.                                              |
| `gallery.ts`, `museum.ts` (+ `museum.test.ts`), `catwalk.ts` (+ `catwalk.test.ts`), `courtside.ts`, `dome.ts`, `gridiron.ts`, `gym.ts`, `stadium.ts`                                         | Culture and sport venues: Gallery 44, the museum, the Catwalk, Courtside Club, the Dome, the Gridiron, Flip City Gymnastics, Seaside Stadium.                              |
| `drivingRange.ts`, `lagoonLinks.ts`, `marina.ts`, `mermaidCove.ts` (+ `mermaidCove.test.ts`), `openWater.ts` (+ `openWater.test.ts`), `surfShack.ts`, `waterPark.ts` (+ `waterPark.test.ts`) | Outdoor and water venues: the driving range, Lagoon Links, Starboard Marina, Mermaid Cove, Seaside Swim, Swell Surf Co., the Water Park.                                   |
| `amusementPark.ts` (+ `amusementPark.test.ts`), `zoo.ts` (+ `zoo.test.ts`), `forest.ts` (+ `forest.test.ts`), `farm.ts` (+ `farm.test.ts`), `garden.ts` (+ `garden.test.ts`)                 | Parks and growing places: ride tuning and motion, the zoo's habitats, the Larkspur Forest Trail, Sunny Acres Farm, the Community Garden.                                   |
| `ships.ts` (+ `ships.test.ts`), `yacht.ts` (+ `yacht.test.ts`)                                                                                                                               | The offshore fleet and the Starlight yacht cruise route.                                                                                                                   |

### Minigame rules

Each is a deterministic, seeded rule set the client's scene or HUD plays.

| File                                                                                                                                                                                                                | What it does                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bowling.ts`, `curling.ts`, `fieldGoal.ts`, `hoops.ts`, `minigolf.ts`, `penalty.ts`, `skate.ts`, `skeeBall.ts`, `surf.ts`, `tennis.ts`, `volleyball.ts`, `golfRange.ts`                                             | Sports: ten-pin bowling, curling, field goals, Hot Shots, mini golf, the penalty shootout, half-pipe, Skee-Ball, surfing, tennis, beach volleyball, the driving range swing.                                                                |
| `gymnastics.ts`, `iceShow.ts`, `sealShow.ts`                                                                                                                                                                        | Cue-on-the-music routines judged like the gym's floor routine: gymnastics, the ice show, the seal show.                                                                                                                                     |
| `cliffDive.ts`, `dive.ts`, `fishing.ts`, `reefSpotter.ts`, `safari.ts`, `sirenSong.ts`, `speedSlide.ts`, `waterGuns.ts`, `sushiCatch.ts`, `macaronTower.ts`, `winePour.ts`, `pottery.ts`, `nails.ts`, `painting.ts` | Water, wildlife and craft games: cliff diving, scuba, fishing, Reef Spotter, the safari photo hunt, Siren Song, the speed slide, water guns, Sushi Catch, the macaron tower, the wine pour, Clay Day, the nail station, the easel painting. |
| `laserTag.ts` (+ `laserTag.test.ts`), `paintball.ts` (+ `paintball.test.ts`), `targetRange.ts` (+ `targetRange.test.ts`), `opponents.ts` (+ `opponents.test.ts`), `reactions.ts` (+ `reactions.test.ts`)            | Tag games with their arenas (Photon Zone laser tag, Splat City paintball, the target range), which clip each opponent plays, and how the doll reacts to a hit or trip.                                                                      |
| `hauntedRun.ts`, `hauntedSets.ts`                                                                                                                                                                                   | The haunted house escape: the door choices and each depth's room set and scares.                                                                                                                                                            |
| `karaokeGame.ts`, `karaokeDuet.ts`, `karaokeSongs.ts`, `karaokeTypes.ts`                                                                                                                                            | Karaoke: the melody lane game, duets over the `game` relay, the public-domain songbook (built from [`karaokeBook/`](karaokeBook/README.md)) and its types.                                                                                  |
| `orders.ts`, `barista.ts`, `boba.ts`, `haloHalo.ts`, `ramen.ts`, `feeding.ts`, `cookOff.ts`                                                                                                                         | Order stations: a shift of tickets built from a station's ingredients (coffee, boba, halo-halo, ramen, zoo feeding) and the two-cook Filipino cook-off.                                                                                     |
| `danceOff.ts`, `triviaNight.ts`, `peerAction.ts`                                                                                                                                                                    | Dance-offs on the shared clock, the trivia night host's pad, and the 24-character action string other players see.                                                                                                                          |

### Economy, progress and saves

| File                                                                                                     | What it does                                                                          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `wallet.ts` (+ `wallet.test.ts`)                                                                         | The coin wallet: cap, starting balance and minigame payouts by grade.                 |
| `prizes.ts` (+ `prizes.test.ts`)                                                                         | Grades (S to C), coin pay and personal bests for the sports and arcade games.         |
| `shifts.ts`, `careers.ts`, `contracts.ts`, `challenges.ts` (+ tests)                                     | Paid short shifts, career ranks, the contracts board and the day's three challenges.  |
| `shop.ts` (+ `shop.test.ts`)                                                                             | The clothing and beauty shops and Thrift Temple's daily find.                         |
| `holdings.ts` (+ `holdings.test.ts`)                                                                     | Owned property and businesses with income that accrues over real time.                |
| `garage.ts` (+ `garage.test.ts`), `records.ts` (+ `records.test.ts`), `vending.ts` (+ `vending.test.ts`) | Your cars, the vinyl records you own and the snack machines.                          |
| `inventory.ts` (+ `inventory.test.ts`)                                                                   | The pouch of weed she buys or is given. Adult-tier only.                              |
| `collections.ts`, `achievements.ts`, `achievementCatalog.ts`, `achievementTypes.ts` (+ tests)            | Albums, sets and stickers; the achievements engine and its handwritten catalog.       |
| `streak.ts`, `streakCalendar.ts`, `streakSave.ts` (+ `streak.test.ts`)                                   | The daily streak: rules, what the panel shows and its saved shape.                    |
| `save.ts` (+ `save.test.ts`)                                                                             | The local save: shape, localStorage key and a loader that salvages every valid field. |
| `credits.ts` (+ `credits.test.ts`)                                                                       | Third-party sources shown in-game; must match `docs/assets.md`.                       |
| `photo.ts` (+ `photo.test.ts`)                                                                           | Snapshots: what a saved photo is called and what is written under it.                 |
| `party.ts`, `passenger.ts` (+ tests)                                                                     | Parties and car passengers, arranged over the `game` relay.                           |
| `npcMemory.ts` (+ `npcMemory.test.ts`)                                                                   | What recurring NPCs remember about the player.                                        |

### Look and avatar

| File                                                                                                                                                                   | What it does                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `look.ts` (+ `look.test.ts`)                                                                                                                                           | The doll's look: every closet catalog (skin, hair, makeup, shoes, face, piercings, swimsuits).             |
| `wardrobe.ts` (+ `wardrobe.test.ts`)                                                                                                                                   | The mix-and-match wardrobe: garments by slot, layering rules and the short wear code.                      |
| `closet.ts` (+ `closet.test.ts`), `body.ts` (+ `body.test.ts`), `brows.ts` (+ `brows.test.ts`), `beard.ts` (+ `beard.test.ts`), `nightLook.ts` (+ `nightLook.test.ts`) | Closet style tags and filters, body sliders, eyebrow designs, facial hair, and the look of a weekly night. |
| `color.ts`                                                                                                                                                             | RGB color id check for colors arriving from storage and the network.                                       |
| `gaits.ts` (+ `gaits.test.ts`)                                                                                                                                         | Walk styles.                                                                                               |
| `hairModels.test.ts`, `headCoverings.test.ts`                                                                                                                          | Check every hair style and head covering has its 3D models.                                                |
| `pet.ts` (+ `pet.test.ts`), `creature.ts` (+ `creature.test.ts`), `creatures.ts`, `crowd.ts` (+ `crowd.test.ts`)                                                       | The adopted pet, animal behavior, the animated creature models and the baked crowd looks.                  |
| `meshyModels.ts` (+ `meshyModels.test.ts`), `artworks.ts` (+ `artworks.test.ts`)                                                                                       | Meshy models loaded by name and the paintings and posters on show.                                         |

### Events, time and the world

| File                                                                                                  | What it does                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `events.ts` (+ `events.test.ts`)                                                                      | The thirty-five weekly club nights.                                                                                                        |
| `clock.ts` (+ `clock.test.ts`), `prideNight.ts` (+ `prideNight.test.ts`)                              | Event clocks everyone shares, and Pride night at the clubs.                                                                                |
| `butterflies.ts`, `starfield.ts`, `zooSounds.ts`, `trackId.ts`, `graphics.ts` (+ tests where present) | Butterfly flocks, the night sky, zoo animal calls, jukebox track ids (here so rules need not import `src/audio`) and the graphics presets. |
| `typed.ts` (+ `typed.test.ts`)                                                                        | Type-narrowing helpers so code needs no `as` or `!`.                                                                                       |
| `age.ts` (+ `age.test.ts`)                                                                            | The age line: the teen (13+) and adult (18+) tiers and the checks that gate adult content.                                                 |

## Subfolders

| Folder                                  | What it holds                                  |
| --------------------------------------- | ---------------------------------------------- |
| [`cards/`](cards/README.md)             | Crazy Eights, solo and online.                 |
| [`city/`](city/README.md)               | The open city: layout, traffic, clock, events. |
| [`crime/`](crime/README.md)             | Shoplifting and the crime record.              |
| [`dance/`](dance/README.md)             | Dance moves, clips and walking pace.           |
| [`dialogue/`](dialogue/README.md)       | Handwritten NPC line banks and the picker.     |
| [`driving/`](driving/README.md)         | Car physics, roster and race data.             |
| [`effects/`](effects/README.md)         | 18+ substance models.                          |
| [`food/`](food/README.md)               | Restaurants, hunger, thirst and delivery.      |
| [`home/`](home/README.md)               | The player's apartment.                        |
| [`jail/`](jail/README.md)               | Sentences and bail.                            |
| [`karaokeBook/`](karaokeBook/README.md) | The public-domain songbook.                    |
| [`motion/`](motion/README.md)           | Ball flight and particle bursts.               |
| [`police/`](police/README.md)           | The arrest script.                             |
| [`progression/`](progression/README.md) | Levels, ladders and streak rewards.            |
| [`speedway/`](speedway/README.md)       | Speedway tracks, bots, bumper cars.            |
| [`wanted/`](wanted/README.md)           | The wanted level.                              |
