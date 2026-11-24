# src/game/jail

Jail sentences and bail. Arrests come from [`../wanted/`](../wanted/README.md) and [`../police/`](../police/README.md); the jail HUD in `src/client/ui/` shows the countdown.

## Files

| File                         | What it does                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `jail.ts` (+ `jail.test.ts`) | Sentences and bail, saved as an end time on the wall clock so the countdown survives a reload. |
