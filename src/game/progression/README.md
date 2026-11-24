# src/game/progression

Local progression: levels, ladders, rank coins and titles, and the save updates that pay them. The XP amounts per action are in [`../achievements.ts`](../achievements.ts) and the activity modules; signed-in accounts also sync progress with the server (`src/net/client/progressSync.ts`).

## Files

| File                                         | What it does                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `progression.ts` (+ `progression.test.ts`)   | Gentle levels, three permanent ladders, rank coins and earned titles. Stored XP is validated independently of the outer save.                          |
| `activities.ts` (+ `activities.test.ts`)     | Activity-to-ladder rewards as atomic save updates; discoveries and event occurrences share their saved claim with the XP, so a reload cannot repay it. |
| `streakReward.ts` (+ `streakReward.test.ts`) | A daily-streak check-in as one atomic save update: the streak record, a milestone's coins and cosmetic, and its XP land together.                      |
