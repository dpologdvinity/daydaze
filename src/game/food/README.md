# src/game/food

The food places of the city as pure data, plus hunger, thirst and delivery rules. The room scenes and city storefronts in `src/client/` read these.

## Files

| File                                                    | What it does                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `venues.ts` (+ `venues.test.ts`, `venues.teen.test.ts`) | About 100 original restaurants, cafes and street stalls with real dishes and placeholder coin prices. The teen test checks the 13+ menu.                |
| `interiors.ts`                                          | The shared plan of every food interior (counter on the back wall, entrance at the front, one exit), so rooms and storefront doors agree.                |
| `storefronts.ts` (+ `storefronts.test.ts`)              | Places each venue as a building on a city sidewalk row, in its own neighborhood when it is built.                                                       |
| `dishes.ts` (+ `dishes.test.ts`)                        | The Meshy-made dish models: the fit box each is scaled into and how it is shown.                                                                        |
| `needs.ts` (+ `needs.test.ts`)                          | Hunger and thirst: gentle needs that build with play and are relieved by food and nonalcoholic drinks. The adult-only speedups are gated by the caller. |
| `delivery.ts` (+ `delivery.test.ts`)                    | Delivery orders: a menu item, a clock and a courier timer shared by the phone app and tests.                                                            |
