# src/game/police

The arrest sequence. The scene in `src/client/` plays it step by step; it hands the player on to [`../jail/`](../jail/README.md).

## Files

| File                             | What it does                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `arrest.ts` (+ `arrest.test.ts`) | The arrest as a fixed script of steps (approach, warn, cuffs, van). No weapons. |
