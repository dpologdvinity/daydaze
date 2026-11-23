# src/client/inventory

The weed counters and the carried pouch. Everything here is 18+: the panels check the active age tier themselves (`WeedShopPanel` calls `allows(activeTier(), "drugs")`, `PouchPanel` calls `usable(activeTier(), ...)` from `src/game/inventory.ts`; `activeTier` and `allows` are in `src/game/age.ts`) and show nothing at 13+. Prices and strains come from `src/game/`.

## Files

| File                | What it does                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MartWatch.tsx`     | Once a frame, measures whether the player stands at a weed counter on foot (gas-station mart or street dealer's corner) and publishes it. Allocates nothing per frame |
| `martNear.ts`       | Shared state: which counter the player stands at; empty name when none                                                                                                |
| `GasMartPanel.tsx`  | The counter panel at a mart (hemp) or the street dealer (a few strains a day)                                                                                         |
| `WeedShopPanel.tsx` | A shop's menu with prices, paid from the saved wallet into the pouch. Used by the mart, the Green Haze dispensary and the dealer                                      |
| `PouchPanel.tsx`    | The carried pouch: a toggle listing what she holds, with a "Use" button per item                                                                                      |
| `pouchDesk.ts`      | The pouch's shared state and actions; `App` mirrors the save into it and installs `commit`                                                                            |
