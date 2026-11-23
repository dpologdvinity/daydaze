# src/client/ui

The 2D HUD and panels over the 3D canvas. `Overlay.tsx` composes them; `App.tsx` (in [`../`](../README.md)) owns the save and passes callbacks down. Several `*Desk.ts` and `*Request.ts` files are tiny stores that let the 3D scene hand something to the HUD (or the HUD to the scene) without a provider. Rules for each feature are in `src/game/`.

## Files

| File                            | What it does                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Overlay.tsx`                   | The HUD: venue header and hint, coins, the closet, shop and game panels, the city map, the phone  |
| `ActionDock.tsx`                | The dock's contextual actions (the El, Hail a taxi, Drive, Take a seat) as one compact control    |
| `GameMenu.tsx`                  | The dock's menu sheet holding sound, photo, map, phone, collections and other occasional controls |
| `RoomPanels.tsx`                | Which game controls each room shows, lazily imported so panels load with the room                 |
| `Minigames.tsx`                 | Mounts the open minigame (lazy-loaded)                                                            |
| `LoadingVeil.tsx`               | The veil over the canvas while a room loads and compiles; never blocks clicks                     |
| `ReloadBoundary.tsx`            | Last-resort boundary for a chunk that fails to load after a deploy                                |
| `UpdatePrompt.tsx`              | Card offering a reload when a new version is waiting                                              |
| `Onboarding.tsx`                | The first-visit walkthrough: name, a ready-made doll, walking, the map, the games                 |
| `DebugPanel.tsx`                | Room-jump buttons, mounted only with `?debug=1`                                                   |
| `GraphicsPanel.tsx`             | The Graphics sheet: presets, advanced switches and the measured frame rate                        |
| `CreditsPanel.tsx`              | The asset source ledger in a scrollable sheet                                                     |
| `CityMap.tsx`                   | The city map dialog: SVG of the streets, a jump button per neighborhood, venue lists              |
| `cityMapRequest.ts`             | A one-bit request from the world (the bus stop's map board) for the city map                      |
| `Dressing.tsx`                  | The dressing room drawer (a bottom sheet on phones)                                               |
| `MirrorPanel.tsx`               | The closet's Mirror: face, makeup, hair, body and outfit tabs                                     |
| `WardrobePicker.tsx`            | Mix-and-match pickers, one row per wardrobe slot                                                  |
| `BrowPicker.tsx`                | Eyebrow picker using the same curves as the painted brows                                         |
| `controls.tsx`                  | Shared closet picker controls: swatches, tiles, chips, segmented buttons, sliders                 |
| `icons.tsx`                     | Inline SVG icons in one thin, rounded line style                                                  |
| `PiercingPanel.tsx`             | Ink & Needle's piercing counter                                                                   |
| `ApartmentPanel.tsx`            | The apartment's decorating panel: lock the door, place and move furniture                         |
| `ChatBar.tsx`                   | The chat input; trims, ignores empty and caps at 120 characters                                   |
| `DancePicker.tsx`               | Dance styles, moves and social emotes while the Dance mood is on                                  |
| `CardTable.tsx`                 | A Crazy Eights table against an NPC, used in the jail and the Back Room                           |
| `ShopPanel.tsx`                 | The shop dialog: the day's stock, buy and wear, and the shoplifting flow                          |
| `ShopliftPanel.tsx`             | The shoplifting test panel with its suspicion meter                                               |
| `shopRequest.ts`                | Which shop's counter is open                                                                      |
| `ArrestSequence.tsx`            | The scripted arrest overlay after a shoplifter is caught                                          |
| `JailHud.tsx`                   | The jail panel: sentence countdown and ways to shorten it                                         |
| `WantedHud.tsx`                 | A five-star readout of the active police response                                                 |
| `PrizeCard.tsx`                 | The prize card after a scored game: grade, score, coins, personal best                            |
| `prizeDesk.ts`                  | Where finished games hand in their score; the app grades and pays out                             |
| `shiftDesk.ts`                  | Where a finished paid shift hands in its result                                                   |
| `npcDesk.ts`                    | Where recurring NPCs read what they remember and report a meeting                                 |
| `Progression.tsx`               | The level badge, menu ladders and earned title picker                                             |
| `Streak.tsx`, `StreakPanel.tsx` | The daily streak: the store, then the 30-day calendar, milestone ladder and celebration           |
| `Collections.tsx`               | The photo album, closet sets to complete and the sticker book                                     |
| `WeeklyBoards.tsx`              | Weekly leaderboards in the game menu                                                              |
| `EventCalendar.tsx`             | The weekly club nights on screen and the room card glow                                           |
| `PrideTicker.tsx`               | The Pride night countdown in the clubs                                                            |

## Subfolders

- [`phone/`](phone/README.md): the delivery app and food HUD.

## Notes

- Feature rules (age gating included) stay in `src/game/`; panels here only show what the game modules allow.
