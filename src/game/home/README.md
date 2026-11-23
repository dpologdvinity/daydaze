# src/game/home

The player's apartment: decorating, the saved layout and furniture colors. The apartment room in `src/client/rooms/` renders whatever these functions return.

## Files

| File                               | What it does                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `decor.ts` (+ `decor.test.ts`)     | Apartment decorating: a starter catalog placed on a grid of 1 m cells.                                |
| `home.ts` (+ `home.test.ts`)       | The apartment save: the door lock and the placed furniture. Doors start locked.                       |
| `palette.ts` (+ `palette.test.ts`) | Furniture looks: recolors a model's material toward a house palette while keeping its light and dark. |
