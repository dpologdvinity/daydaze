# src/client/vending

The soda vending machines: the proximity check, the menu and the machine's paint. Which rooms hold machines is data in `src/game/vending.ts`; the machine models themselves are drawn by [`../rooms/shared/VendingMachines.tsx`](../rooms/shared/README.md).

## Files

| File               | What it does                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VendingWatch.tsx` | Once a frame, checks whether the player is within reach of a machine (a room's own or the avenue's) and publishes it. Allocates nothing per frame |
| `vendingNear.ts`   | Shared state: which machine the player stands at, written by the scene and read by the panel                                                      |
| `VendingPanel.tsx` | Lazy loader, so the menu only downloads near a machine                                                                                            |
| `VendingMenu.tsx`  | The three made-up drinks, paid from the saved wallet; a bought drink takes the edge off a buzz                                                    |
| `vendingLook.ts`   | The candy paint: tints only the near-white texels of the model's atlas so the stock stays colored                                                 |
