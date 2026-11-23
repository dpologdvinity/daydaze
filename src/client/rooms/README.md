# src/client/rooms

One 3D scene per room. Each loose `<Room>.tsx` here is the scene `World.tsx` loads (lazily) for a `RoomId` from `src/game/rooms.ts`; the room's data (portals, pads, NPCs, hints) lives in `src/game/`. A room's lowercase folder holds its extras: game panels, `session.ts` state for its minigame, NPCs and sub-scenes. `shared/` is the kit every room uses. Adding a room needs the checklist in `AGENTS.md` (`RoomId`, `ROOMS`, `rooms.test.ts`, `ROOM_HINTS`, `ROOM_SHOTS`, `SCENES`, a city door).

## Room folders

Most folders hold `*Panel.tsx` overlays (mounted by [`../ui/RoomPanels.tsx`](../ui/README.md)), `session.ts` (client game state), `Npcs.tsx` and layout or art files. The main file is the scene that imports them.

| Folder                        | The room                                                                                                                                                                                        | Main file             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `amusementpark/`              | Amusement Park: midway, rides, kiddie land                                                                                                                                                      | `AmusementPark.tsx`   |
| `aquarium/`                   | Aquarium: fish tanks, reef panel, seal show                                                                                                                                                     | `Aquarium.tsx`        |
| `arcadebar/`                  | Player 2, the Arts District arcade bar (NPCs)                                                                                                                                                   | `ArcadeBar.tsx`       |
| `backroom/`                   | The Back Room speakeasy (card game panel)                                                                                                                                                       | `BackRoom.tsx`        |
| `boardwalk/`                  | Boardwalk Arcade: Skee-Ball                                                                                                                                                                     | `BoardwalkArcade.tsx` |
| `bowling/`                    | Glow Bowl blacklit bowling alley                                                                                                                                                                | `Bowling.tsx`         |
| `catwalk/`                    | Catwalk runway show                                                                                                                                                                             | `Catwalk.tsx`         |
| `cellar/`                     | Cellar 214 wine bar: pour game                                                                                                                                                                  | `WineBar.tsx`         |
| `courtside/`                  | Courtside Club tennis                                                                                                                                                                           | `Courtside.tsx`       |
| `cove/`                       | Mermaid Cove lagoon, mermaid and shells                                                                                                                                                         | `MermaidCove.tsx`     |
| `dome/`                       | The Dome basketball arena                                                                                                                                                                       | `Dome.tsx`            |
| `espresso/`                   | Espresso Lab barista panel                                                                                                                                                                      | `EspressoLab.tsx`     |
| `farm/`                       | Sunny Acres Farm: crop plots                                                                                                                                                                    | `Farm.tsx`            |
| `florist/`                    | Petal & Stem florist: bouquet game                                                                                                                                                              | `Florist.tsx`         |
| `food/`                       | Shared `FoodRoom.tsx` shell plus the food venues: Bistro Rue Vert, Steam Ladle Ramen, Purple Pandesal, Jade Whisk Matcha, Halo-Halo Haus, Kain Tayo; cook-off, boba, ramen and halo-halo panels | `food/FoodRoom.tsx`   |
| `forest/`                     | Larkspur Forest Trail (hikers)                                                                                                                                                                  | `Forest.tsx`          |
| `galleria/`                   | Starlight Galleria mall (NPCs)                                                                                                                                                                  | `Galleria.tsx`        |
| `gallery/`                    | Gallery 44: painting game                                                                                                                                                                       | `Gallery.tsx`         |
| `garden/`                     | Suburbia Community Garden                                                                                                                                                                       | `Garden.tsx`          |
| `gridiron/`                   | Gridiron football: field goals                                                                                                                                                                  | `Gridiron.tsx`        |
| `gym/`                        | Gym: gymnastics routine                                                                                                                                                                         | `Gym.tsx`             |
| `haunted/`                    | Haunted House and its escape room                                                                                                                                                               | `HauntedHouse.tsx`    |
| `icerink/`                    | Ice Rink: show and curling                                                                                                                                                                      | `IceRink.tsx`         |
| `kamayan/`                    | Lechon and Kamayan Hall (NPCs, stove)                                                                                                                                                           | `KamayanHall.tsx`     |
| `karaoke/`                    | Karaoke Loft: stage and lyrics                                                                                                                                                                  | `Karaoke.tsx`         |
| `lanoche/`                    | La Noche Latin club (NPCs)                                                                                                                                                                      | `LaNoche.tsx`         |
| `lasertag/`                   | Photon Zone laser tag; also drives Paintball                                                                                                                                                    | `LaserTag.tsx`        |
| `marina/`                     | Marina: fishing and jet skis                                                                                                                                                                    | `Marina.tsx`          |
| `minigolf/`                   | Mini Golf course                                                                                                                                                                                | `MiniGolf.tsx`        |
| `museum/`                     | Museo ng Little Manila exhibits and tour                                                                                                                                                        | `Museum.tsx`          |
| `ocean/`                      | Open Water, Reef Dive and Mermaid Cove sea pieces: dive panel, reef props, sea life                                                                                                             | `OpenWater.tsx`       |
| `orbit/`                      | Orbit 9 space-station club (NPCs)                                                                                                                                                               | `Orbit.tsx`           |
| `patisserie/`                 | Sucre patisserie: macaron tower game                                                                                                                                                            | `Patisserie.tsx`      |
| `plaza/`                      | The Plaza, the starting square: street, storefronts, palms, amusement gate                                                                                                                      | `Plaza.tsx`           |
| `pottery/`                    | Clay Day pottery studio                                                                                                                                                                         | `Pottery.tsx`         |
| `pulse/`                      | Pulse, the main dance club: floor, set, dance-off                                                                                                                                               | `Pulse.tsx`           |
| `range/`                      | Driving Range                                                                                                                                                                                   | `DrivingRange.tsx`    |
| `rooftop/`                    | Rooftop Bar (NPCs)                                                                                                                                                                              | `RooftopBar.tsx`      |
| `salon/`                      | Blowout Bar salon: nail game                                                                                                                                                                    | `Salon.tsx`           |
| `skatepark/`                  | Skatepark: runs and bails                                                                                                                                                                       | `Skatepark.tsx`       |
| `speedway/`                   | Speedway tracks, bumper cars, cars, crowd and HUD                                                                                                                                               | `Speedway.tsx`        |
| `stadium/`                    | Seaside Stadium: penalty shootout                                                                                                                                                               | `Stadium.tsx`         |
| `studio/`                     | Loft Studios music room                                                                                                                                                                         | `Studio.tsx`          |
| `sugarrush/`                  | Sugar Rush Y2K pop club (NPCs)                                                                                                                                                                  | `SugarRush.tsx`       |
| `surf/`                       | Swell Surf Co. wave riding                                                                                                                                                                      | `SurfShack.tsx`       |
| `sushi/`                      | Belt Sushi Yard: conveyor and order panel                                                                                                                                                       | `sushi/SushiBar.tsx`  |
| `velvet/`                     | The Velvet Room, the starting lounge                                                                                                                                                            | `VelvetRoom.tsx`      |
| `violethour/`                 | The Violet Hour neighborhood bar                                                                                                                                                                | `VioletHour.tsx`      |
| `warehouse/`                  | Bassline techno warehouse (NPCs)                                                                                                                                                                | `Warehouse.tsx`       |
| `waterpark/`                  | Water Park: pool, slides, diving, water guns                                                                                                                                                    | `WaterPark.tsx`       |
| `zoo/`                        | The Daydaze Zoo: feeding, pet and safari panels                                                                                                                                                 | `Zoo.tsx`             |
| [`shared/`](shared/README.md) | The shared room kit (floor, batching, neon, NPCs, props); `shared/game3d/` is the in-world game kit                                                                                             | none                  |

## Loose files

Rooms with no folder of their own, and the weekly-night helpers.

| File                 | What it does                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `Apartment.tsx`      | A player's apartment: shell plus the furniture, art and pottery they placed                |
| `Dealership.tsx`     | Daydaze Motors showroom with cars on LED turntables                                        |
| `DriveIn.tsx`        | Starlite Drive-In lot with a canvas-drawn screen                                           |
| `GreenHaze.tsx`      | Green Haze, the 18+ weed and shroom lounge                                                 |
| `HotelRooftop.tsx`   | Marquise Rooftop: infinity pool, hot tub, cabanas                                          |
| `JazzClub.tsx`       | Midnight Horn jazz club with a four-piece band                                             |
| `Jail.tsx`           | City Jail, Block C (visual only; sentence timing is elsewhere)                             |
| `Lune.tsx`           | Lune Tasting Room, a candlelit date spot                                                   |
| `Market.tsx`         | Skyline Supply grocery                                                                     |
| `Paintball.tsx`      | Splat City paintball, reusing the laser tag `Rivals` and `Beams`                           |
| `Parlor.tsx`         | The Parlor salon-style room with a talking NPC                                             |
| `ReefDive.tsx`       | Reef Dive: an underwater reef and wreck with air that runs down (uses the `ocean/` pieces) |
| `RollerRink.tsx`     | Roller Rink: LED floor, mirror ball, skate rental                                          |
| `SkateDiner.tsx`     | Skate-Up Drive-In Diner                                                                    |
| `Yacht.tsx`          | The Starlight yacht party cruising Starboard Bay                                           |
| `ThriftTemple.tsx`   | Thrift Temple vintage store in an old church hall                                          |
| `TikiBar.tsx`        | Coconut Grove tiki bar on Beachside                                                        |
| `VideoStore.tsx`     | Rewind Video store                                                                         |
| `VinylVault.tsx`     | Vinyl Vault record shop                                                                    |
| `Bookshop.tsx`       | Dog-Ear Books                                                                              |
| `NightDecor.tsx`     | What a weekly night does to its room: light color and decor in the air                     |
| `NightSignature.tsx` | The one strong visual each weekly night carries (grade, blacklight and so on)              |
| `useNight.ts`        | The weekly night on in a room right now, worked out as the room draws                      |
| `StarDome.tsx`       | The stargazing night's star dome behind the buildings                                      |

## Notes

- Drinks and 18+ venues (`GreenHaze.tsx`, `RooftopBar.tsx`, `VioletHour.tsx`) go through the buzz and age rules in `src/game/age.ts` and `../adult.ts`; this folder does not decide who may enter.
- Low-tier budget: batch static geometry per material (`shared/batch.ts`), instance repeats and allocate nothing in `useFrame`.
