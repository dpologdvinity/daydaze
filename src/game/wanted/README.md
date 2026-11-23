# src/game/wanted

The wanted level. Crimes (see [`../crime/`](../crime/README.md)) add heat; getting caught hands off to [`../police/`](../police/README.md) and [`../jail/`](../jail/README.md).

## Files

| File                                              | What it does                                                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wanted.ts` (+ `wanted.test.ts`, `sight.test.ts`) | Heat becomes stars and cools off out of sight (faster when hiding); getting caught means jail, and bail reuses jail. Also `hasPoliceSight`, which tests police sight through city footprints; `sight.test.ts` covers it. |

## Notes

- Pure state transitions with nothing saved here.
