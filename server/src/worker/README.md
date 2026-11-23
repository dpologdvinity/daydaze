# server/src/worker

The Cloudflare runtime adapters. They import `cloudflare:workers` and the generated Worker types, so they are type-checked (`npm run typecheck:server`) rather than run in Node tests. The rules they call live in [`../`](../README.md).

## Files

| File              | What it does                                                                                                                                                                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`        | The Worker entry: routes `/api` and `/ws`, checks the Origin on anything but plain GETs, reads sessions from D1, and handles guests, accounts, cloud saves, friends, blocks, reports, progress and admin bans. Forwards room sockets to the room's Durable Object with an identity header only this gateway sets |
| `roomInstance.ts` | The `RoomInstance` Durable Object: one hibernating WebSocket host per room copy or apartment, wired to `roomCore.ts`                                                                                                                                                                                             |
| `directory.ts`    | The `Directory` Durable Object: a SQLite headcount per room copy plus a presence table, so the lobby lists copies and friends can see who is where                                                                                                                                                               |
| `rateLimiter.ts`  | The `RateLimiter` Durable Object: token buckets from `authLimits.ts` in SQLite storage, idle buckets pruned by alarm                                                                                                                                                                                             |
