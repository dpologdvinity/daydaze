# src/client/city

The open city: `CityScene.tsx` streams the ground, life and authored architecture around the player, and the rest draws the streets, transit, traffic, parks, beach and events, plus the HUD panels that belong to them. Layout and rules live in `src/game/city/` (`layout.ts`, `plan.ts`, `daylight.ts`, `el.ts`, `carHits.ts` and friends); this folder only draws and wires them up.

## Files

### Scene, sky and ground

| File                                       | What it does                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `CityScene.tsx`                            | Streams the city's ground, life and authored architecture around the player                             |
| `CitySky.tsx`                              | Night sky dome with clouds, street glow, skyline ring and twinkling stars                               |
| `CityHdri.tsx`                             | The night HDRI (high tier only), its own file so the loaders load on demand                             |
| `Ocean.tsx`                                | The sea south of the waterline: emissive plane with moonlit glints and a surf line                      |
| `Outskirts.tsx`                            | The countryside past the city edge on the north, west and east                                          |
| `CityJoystick.tsx`                         | Touch stick for walking the city                                                                        |
| `daylight.ts` (+ `daylight.test.ts`)       | The city's day and night in the client: the hour (own clock or `?time=`), its light and shared uniforms |
| `season.ts`                                | The city's New York date, with an optional preview date                                                 |
| `eventClocks.ts` (+ `eventClocks.test.ts`) | Event clocks: real, or held still `s` seconds into an event with a URL flag, for screenshots            |
| `here.ts`                                  | Where the player is in the city (neighborhood, park flag); read by HUD and audio                        |
| `preloadNear.ts`                           | Starts fetching a part's models when the player comes within range, before it draws                     |

### Streets, buildings and instancing

| File                                            | What it does                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `meshes.ts`                                     | Builds the instanced meshes and materials, one per plan `Kind`                     |
| `facades.ts`                                    | Building wall materials, one per facade family                                     |
| `worldTexture.ts`                               | Loads the tiling surface texture sets and maps them onto boxes by world position   |
| `sidewalkLook.ts`                               | How sidewalks look, shared by the strips and the corner blocks                     |
| `labelAtlas.ts`                                 | Draws every sign and ad name into one atlas texture                                |
| `shaders.ts`                                    | Shader patches that animate instanced materials (blink, flicker, steam, sway, bob) |
| `bake.ts` (+ `bake.test.ts`)                    | Merges many copies of one small shape into a single geometry                       |
| `instancedProps.ts`                             | Places a downloaded model at a few spots as instanced meshes                       |
| `dispose.ts`                                    | Teardown for instanced layers drawn from downloaded models                         |
| `DreamBuildings.tsx`                            | The authored architecture, including distant silhouettes                           |
| `DreamLandmarks.tsx`                            | Unique textured addresses as static glTF scenes                                    |
| `dreamMeshes.ts` (+ `dreamMeshes.test.ts`)      | Static architectural instances that stream between districts                       |
| `StreetPieces.tsx`                              | Street dressing from the Quaternius City MegaKit                                   |
| `streetMerge.ts` (+ `streetMerge.test.ts`)      | Merges the street pieces in view into one geometry per material                    |
| `CityFurniture.tsx`                             | Lamp posts, hydrants, bins, benches, mailboxes, meters, shelters and signs         |
| `AvenueWear.tsx`                                | How Main Avenue wears under the El: tire tracks, stains, patches, drains, manholes |
| `SeasonalDressing.tsx`                          | Seasonal dressing: fairy-light swags, the Plaza tree and more                      |
| `SquareLife.tsx`                                | Downtown's square: fountain, benches, bus shelter with a map board                 |
| `Parols.tsx`                                    | Little Manila's swaying parol lanterns                                             |
| `NightMarket.tsx`                               | The night market: stalls, lanterns, steam and nearby vendors                       |
| `StreetFood.tsx` (+ `streetFoodModels.test.ts`) | Street-food carts, truck motion and nearby vendors                                 |
| `FoodVendorPanel.tsx`, `foodVendors.ts`         | The walk-up food menus and their shared counter state                              |

### Parks, beach and wildlife

| File                                                    | What it does                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `CityPark.tsx`                                          | Undergrowth (grass tufts, lawns, tree pits, dune grass) and the park pond |
| `CityTrees.tsx`                                         | Street trees from Quaternius' Textured Stylized Trees                     |
| `BandShell.tsx`, `BandPanel.tsx`, `bandDesk.ts`         | The park band shell, its overlay card and the state between them          |
| `DogPark.tsx`                                           | The dog yard: fence, agility gear, water bowl                             |
| `FarmersMarket.tsx`                                     | The Uptown farmers market stalls                                          |
| `ParkPanel.tsx`, `parkDesk.ts`                          | The market vendor's greeting and the let-pet-off-leash state              |
| `ParkButterflies.tsx`                                   | The park's butterflies, by day and only near the player                   |
| `ParkWildlife.tsx`                                      | The park's wandering animals, present only near the park                  |
| `BeachLife.tsx`                                         | Beachside sand dressing: bonfires, log seats, the volleyball court        |
| `BoardwalkFerris.tsx`                                   | The boardwalk Ferris wheel                                                |
| `Fleet.tsx`                                             | The offshore fleet of ships at anchor                                     |
| `VolleyCourt.tsx`, `VolleyStop.tsx`, `volleySession.ts` | Beach and pool volleyball: the court, the match panel and the session     |
| `Fireworks.tsx`                                         | The Beachside fireworks show from the pure schedule                       |
| `Parade.tsx`                                            | The Pride parade floats on the boardwalk                                  |

### Transit and cars

| File                                                                                                                                  | What it does                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ElLine.tsx`, `ElRide.tsx`, `ElPanel.tsx`, `elLayout.ts`, `elStore.ts`                                                                | The El: trestle and stations, the ride as fast travel, the dock panel, shared layout and the ride store |
| `CityTransit.tsx`, `BusPanel.tsx`, `busRide.ts`, `transitModels.ts`                                                                   | The Line 1 bus and stops, the arrival sign and ride controls, the scene/HUD bridge and merged models    |
| `TaxiRide.tsx`, `TaxiPanel.tsx`, `taxiStore.ts`                                                                                       | Hailing a taxi, its ride card and the store between them                                                |
| `Traffic.tsx`, `trafficBodies.ts`                                                                                                     | Lane traffic on one simulation, instanced from downloaded car bodies                                    |
| `ParkedCars.tsx`                                                                                                                      | Cars parked along Downtown's kerbs                                                                      |
| `PlayerCar.tsx`, `CityDrivePanel.tsx`, `CarPicker.tsx`, `carApproach.ts` (+ `carApproach.test.ts`)                                    | Your own car: driving, the driving HUD, the garage and paint picker, and walking to it                  |
| `DealershipPanel.tsx`                                                                                                                 | The dealership price list and purchase                                                                  |
| `FuelStop.tsx`, `GasStations.tsx`                                                                                                     | The gas pump prompt and the gas stations                                                                |
| `carBodies.ts` (+ `carBodies.test.ts`), `carGeometry.ts` (+ `jeepneyWheel.test.ts`), `wheelPlacement.ts` (+ `wheelPlacement.test.ts`) | Loading car bodies, the jeepney's merged geometry and wheel placement                                   |
| `carExtras.ts`, `carLamps.ts`, `carGlow.ts`                                                                                           | Session-only radio and headlights, the player car's lamps, and the traffic's lamp glow                  |
| `CarHits.tsx`, `streetHits.ts`, `SidewalkTrips.tsx`                                                                                   | Cars and people knocking each other, shared street hits, and a rare sidewalk trip                       |

### People, crime and other panels

| File                                  | What it does                                                             |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `Pedestrians.tsx`                     | Pedestrians and pets following scripted paths or reacting to cars        |
| `ChatGroups.tsx`                      | Standing conversations on the sidewalks, nearest few as dolls            |
| `QueueCrowd.tsx`                      | The people queuing outside the clubs                                     |
| `Chase.tsx`, `PlayerPursuit.tsx`      | The police car chase and the local unit responding to player heat        |
| `Heist.tsx`                           | The City Trust heist as seen on the street                               |
| `StreetDealer.tsx`                    | The street dealer's corner; her shop opens only at 18+                   |
| `SmokeWisps.tsx`, `SmokingPrompt.tsx` | Instanced smoke wisps and the outdoor smoking prompt (after dark at 18+) |
| `RecordsPanel.tsx`                    | The Vinyl Vault panel: preview and buy records                           |

## Notes

- Everything here runs on the low-tier budget (250 draw calls, 300k triangles): layers are instanced or merged, skipped past a draw distance, and frame callbacks allocate nothing.
