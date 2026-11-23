# server/migrations

D1 (SQLite) schema migrations for the Worker, applied in filename order by Wrangler (`migrations_dir` in `../wrangler.jsonc`). `server/src/progressStore.test.ts` applies every file here to an in-memory SQLite, so the schema is tested against the real SQL.

## Files

| File                | What it does                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_init.sql`     | Accounts (`users`), cookie `sessions`, cloud `saves`, `blocks`, `reports` and `bans` (a ban matches a player id, an IP address, or both) |
| `0002_friends.sql`  | `friend_requests`; two players are friends when each has asked the other                                                                 |
| `0003_progress.sql` | Server-owned `progress` per account, plus the `weekly_scores` and `weekly_xp` tables behind the weekly boards                            |

## Notes

- Add a new numbered file; never edit an applied migration.
- Apply locally with `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`. Remote migrations need the owner's approval.
