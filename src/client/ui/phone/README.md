# src/client/ui/phone

The in-game phone's food delivery app (Plate Rush) and the always-mounted food HUD. Orders and timers live in [`../../food/store.ts`](../../food/README.md); venues and dishes are in `src/game/food/`.

## Files

| File              | What it does                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `DeliveryApp.tsx` | Plate Rush: browse venues, order a dish and watch couriers on the way                                    |
| `FoodHud.tsx`     | The held tray with an eat or sip button and the courier toast; also runs the delivery clock every 250 ms |
| `phone.css`       | Styles for the delivery app                                                                              |
