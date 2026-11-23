# src/client/food

The food the local doll holds and the delivery orders in flight. The dishes and venues live in `src/game/food/`; the phone app that orders them is in [`../ui/phone/`](../ui/phone/README.md).

## Files

| File                           | What it does                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `store.ts` (+ `store.test.ts`) | In-memory store of the held item and pending deliveries. A reload empties the tray; eating does not sober anyone up; 13+ drinks leave no buzz |
