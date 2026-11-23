# src/game/crime

Shoplifting and the crime record. The shop and jail UI in `src/client/` call into these pure modules; the heat and arrest side lives in [`../wanted/`](../wanted/README.md), [`../police/`](../police/README.md) and [`../jail/`](../jail/README.md).

## Files

| File                                 | What it does                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shoplift.ts` (+ `shoplift.test.ts`) | Shoplifting as a stealth beat: each beat watchers face the floor or not, and the player's action decides whether a facing watcher spots them. Deterministic. |
| `lift.ts` (+ `lift.test.ts`)         | Which stealth profile each real shop counter has, the "stolen" tag on what you get away with, and staff who recognize their own stock when you wear it.      |
| `record.ts` (+ `record.test.ts`)     | The crime record: offense count, store bans and "stolen" tags, saved so they survive a reload.                                                               |
