# Deploying Daydaze to Cloudflare

Date: 2026-10-14. Wrangler 4.148. Commands checked against the current Cloudflare docs.

This is the first deploy, done by hand. Every command runs from the repository root. Each one passes `--config server/wrangler.jsonc`, because the Worker's config lives in `server/`.

Budget: everything here stays on the Workers Free plan. Read "Before you start: CPU time" first, because it is the one thing likely to break.

## Before you start: CPU time

The Free plan allows **10 ms of CPU per request**. Password hashing (PBKDF2-SHA-256 at 100,000 iterations) costs roughly 30 to 80 ms of CPU per signup or login. Cloudflare tolerates isolates that "infrequently" go over, so occasional logins may work. If they go over regularly, Cloudflare stops them with **error 1102** ("Worker exceeded resource limits"). Every other route stays well under 10 ms.

After deploying, sign up and log in a few times, then check **Workers & Pages → daydaze → Metrics → Errors** for `Exceeded CPU Time Limits`. If you see them, choose one:

- **Workers Paid ($5/month).** CPU per request goes up to 30 s. This is the safe choice.
- **Fewer iterations.** Lower `ITERATIONS` in `server/src/passwords.ts` (around 20,000 fits). Stored hashes record their own iteration count, so existing accounts keep working. This is weaker against offline cracking if the database ever leaks.

## 1. Log in to Cloudflare

```sh
npx wrangler login
npx wrangler whoami
```

`login` opens a browser to authorise Wrangler. `whoami` confirms the account.

## 2. Create the D1 database

```sh
npx wrangler d1 create daydaze --config server/wrangler.jsonc
```

It prints a `database_id` (a UUID). Open `server/wrangler.jsonc` and replace the placeholder `00000000-0000-0000-0000-000000000000` under `d1_databases` with it. Keep `"binding": "DB"`, `"database_name": "daydaze"` and `"migrations_dir": "migrations"`. Commit the change; the id is not a secret.

## 3. Apply the migrations to the remote database

```sh
npx wrangler d1 migrations apply DB --remote --config server/wrangler.jsonc
```

Confirm when it asks. This creates `users`, `sessions`, `saves`, `blocks`, `reports` and `bans`. Check the tables:

```sh
npx wrangler d1 execute DB --remote --config server/wrangler.jsonc \
  --command "SELECT name FROM sqlite_master WHERE type = 'table'"
```

## 4. Set ALLOWED_ORIGINS

The Worker serves the app itself, so requests from its own origin are always allowed. `ALLOWED_ORIGINS` lists any other origins. Right now it holds only the Vite dev origins.

For production, edit `vars.ALLOWED_ORIGINS` in `server/wrangler.jsonc` to your public site:

```jsonc
"vars": {
  "ALLOWED_ORIGINS": "https://daydaze.<your-subdomain>.workers.dev",
},
```

Use a comma-separated list if you add a custom domain. Leaving the localhost origins in place isn't dangerous, but production doesn't need them. Values set in the dashboard are replaced by the file on every `wrangler deploy`, so keep the file as the source of truth.

## 5. Build and deploy

```sh
npm ci
npm run verify
npm run build
npx wrangler deploy --config server/wrangler.jsonc
```

`npm run build` writes `dist/`, which the Worker serves as static assets with the CSP from `public/_headers`. `wrangler deploy` prints the URL, for example `https://daydaze.<your-subdomain>.workers.dev`. The first deploy creates the `RoomInstance`, `Directory` and `RateLimiter` Durable Objects through the `v1` and `v2` migrations.

Smoke check:

```sh
curl -i https://daydaze.<your-subdomain>.workers.dev/api/me
```

Expect `401` with `{"error":"no-session"}` and `Cache-Control: no-store`. Then open `/minigames.html` and check that the response carries `Content-Security-Policy`.

## 6. Make yourself admin

Sign up in the game first. Then mark your account; the name is matched lowercased:

```sh
npx wrangler d1 execute DB --remote --config server/wrangler.jsonc \
  --command "UPDATE users SET is_admin = 1 WHERE username_key = lower('YourName')"
npx wrangler d1 execute DB --remote --config server/wrangler.jsonc \
  --command "SELECT id, username, is_admin FROM users WHERE is_admin = 1"
```

Admin status is read on every request, so there's no need to log in again.

To ban someone while logged in as admin, open the browser dev tools on the game's page and run:

```js
await fetch("/api/admin/ban", {
  method: "POST",
  body: JSON.stringify({ targetId: "g_or_u_player_id", reason: "why" }),
}).then((r) => r.json());
```

It records the ban and signs the player out everywhere, and the response says how many room copies they were kicked from. A guest ban also covers the guest's last IP address. To lift a ban:

```sh
npx wrangler d1 execute DB --remote --config server/wrangler.jsonc \
  --command "DELETE FROM bans WHERE player_id = 'the_player_id'"
```

## 7. Read reports

In the dashboard, open **Workers & Pages → D1 SQL Database → daydaze → Console**. You can also run the same SQL with `wrangler d1 execute DB --remote`.

Latest reports, with names where the players have accounts:

```sql
SELECT r.id,
       datetime(r.created_at / 1000, 'unixepoch') AS at,
       r.reporter_id, reporter.username AS reporter,
       r.target_id, target.username AS target,
       r.reason, r.room_id, r.copy
  FROM reports r
  LEFT JOIN users reporter ON reporter.id = r.reporter_id
  LEFT JOIN users target ON target.id = r.target_id
 ORDER BY r.id DESC
 LIMIT 50;
```

The chat around a report is the room copy's last 20 lines, unfiltered, stored as JSON:

```sql
SELECT json_extract(line.value, '$.name') AS name,
       json_extract(line.value, '$.text') AS text,
       datetime(json_extract(line.value, '$.at') / 1000, 'unixepoch') AS at
  FROM reports, json_each(reports.chat) AS line
 WHERE reports.id = 1;
```

Guests have no `users` row, so a guest shows only as their `g_…` id. The chat lines carry their name.

## Free-tier limits

From Cloudflare's pricing and limits pages, checked 2026-10-14. Daily limits reset at 00:00 UTC.

| Service | Free allowance | What happens at the limit | Our usage |
| --- | --- | --- | --- |
| Worker requests | 100,000 / day | Error 1027 page until the reset | Each `/api` call and each WebSocket connect is 1. Static assets are free and unlimited. Socket messages are not Worker requests. |
| Worker CPU | 10 ms per request | Error 1102 when regularly exceeded | Fine except password hashing (see the top of this guide) |
| Durable Object requests | 100,000 / day | Durable Object calls fail until the reset | Incoming socket messages count 20:1. One player moving at 12 Hz for an hour is about 2,200 requests, so roughly 45 player-hours of movement a day. |
| Durable Object duration | 13,000 GB-s / day | As above | A busy room copy stays awake; idle ones hibernate. About 28 awake room-hours a day at 128 MB each. |
| Durable Object SQL | 5M rows read, 100K rows written / day, 5 GB stored | Writes fail until the reset | Rate-limit buckets (one row per sign-in, report or block attempt, plus pruning alarms) and Directory headcounts (one row per join or leave) |
| D1 | 5M rows read, 100K rows written / day, 5 GB total | Queries fail until the reset | Sessions, saves, reports, blocks, bans |

The tightest limits are Durable Object requests and duration once rooms are busy. Watch them under **Workers & Pages → Durable Objects** in the dashboard. Workers Paid includes far more, from $5/month.

## Rollback

**Worker code.** Every deploy is a version:

```sh
npx wrangler deployments list --config server/wrangler.jsonc
npx wrangler rollback --config server/wrangler.jsonc               # the previous version
npx wrangler rollback <version-id> --config server/wrangler.jsonc  # a specific one
```

A rollback changes code only. It doesn't undo D1 migrations or Durable Object data. Wrangler may refuse to roll back across a Durable Object class migration, so add new Durable Object classes in their own deploys.

**D1 data.** Time Travel restores the database to any point in the last 7 days on the Free plan (30 days on Workers Paid):

```sh
npx wrangler d1 time-travel info DB --config server/wrangler.jsonc
npx wrangler d1 time-travel restore DB --timestamp 2026-10-15T08:00:00Z --config server/wrangler.jsonc
```

A restore overwrites everything written after that time, including new accounts, sessions and reports.

**Take the game offline.** Run `npx wrangler delete --config server/wrangler.jsonc`, or turn off the `workers.dev` route in the dashboard. The client then falls back to offline single-player.
