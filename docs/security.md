# Security

Date: 2026-10-14. Covers the online foundation: the Worker in `server/`, the browser client in `src/net/client/`, and the shared protocol in `src/net/`.

## Threat model

Daydaze is a free social game for adults, run on Cloudflare free tiers. What we protect, roughly in order:

1. **Accounts and sessions.** Nobody should sign in as someone else, ride their session from another site, or guess their password.
2. **Players from each other.** Harassment is the main real-world harm: blocks must hold, slurs are masked, and admins can remove people.
3. **The shared rooms.** One client must not crash a room copy, flood it, teleport, spoof another player, or claim admin.
4. **Free-tier capacity.** Scripts must not burn D1 writes or CPU through unauthenticated endpoints.

5. **Fair progress and boards.** XP, ranks, titles and the weekly leaderboards belong to the server for accounts, so a player can't climb a public board by editing their save.

Out of scope for now: anything that only hurts the cheater (client-owned coins), nation-state attackers, and DDoS (Cloudflare's edge handles volumetric floods).

## What is protected

**Sessions**

- The session cookie is `dd_session`: 256 random bits, `HttpOnly; Secure; SameSite=Lax; Path=/`, with a 30-day lifetime.
- D1 stores only the token's SHA-256, so a leaked table can't be replayed as cookies.
- Logout deletes the row, and signing up as a guest ends the guest session.

**Passwords**

- Passwords are hashed with PBKDF2-SHA-256 at 100,000 iterations (the Workers maximum), with a 16-byte random salt per password.
- The hash is compared in constant time.
- Passwords must be 8 to 128 characters.

**Cross-site requests (CSRF) and cross-site WebSocket hijacking**

- `SameSite=Lax` keeps the cookie off cross-site subrequests.
- On top of that, every `POST`, `PUT` and `DELETE` and every WebSocket upgrade must carry an `Origin` that is the Worker's own origin or is listed in `ALLOWED_ORIGINS`. Otherwise the Worker returns 403 `bad-origin`.
- A missing `Origin` is allowed, because only non-browser clients omit it, and they hold no victim's cookie.
- The opaque origin `null` is refused.

**Brute force and signup spam**

- Per-IP token buckets live in the `RateLimiter` Durable Object, one per address:
  - Login: 5 tries per account, then 1 every 12 s; and 20 per address across all accounts, then 1 every 6 s.
  - Signup: 3, then 1 every 10 minutes.
  - Guest sessions: 10, then 1 every 30 s.
  - Reports: 5 per player, then 1 a minute; 15 per address, then 1 every 20 s.
  - Blocks: 20 per player, then 1 every 6 s; 60 per address, then 1 every 2 s.
- Over-limit requests get 429 with `Retry-After`.
- Player budgets live in a separate `RateLimiter` object per player, so one player can't use up a whole household's address budget.

**Username enumeration**

- Login answers the same `401 wrong-credentials` for an unknown user and for a wrong password.
- Both cases take about as long, because an unknown user is checked against a dummy PBKDF2 hash (`checkLogin`).
- Signup hashes the password before it looks the name up, so a taken name answers no faster than a free one.
- The per-account login bucket also applies to names that don't exist, so it gives nothing away.

**Identity inside rooms**

- Room copies get the player's id, name, guest flag and admin flag only from the gateway, which overwrites any client-supplied identity header.
- No client message can kick or ban. `RoomCore.kick` and `RoomCore.ban` require an admin who is present in that copy. Both are covered by unit tests, and the smoke test checks that a forged identity header is ignored.

**Untrusted input**

- Every WebSocket frame and every request body is decoded and validated before use.
- Packets are capped at 64 KB, and saves at 64 KB.
- Ten invalid frames disconnect the socket.
- Movement (about 15/s), chat (1 per 2 s for accounts, 1 per 4 s for guests) and emotes are rate limited.
- Positions are clamped to the room's walkable polygon.
- The server stamps every snapshot with its clock (`time`); the client keeps it only as an integer within the `Date` range and moves its shared city clock (lights, pedestrians, traffic, events) only when it differs by over 250 ms. A wrong stamp can only skew that player's own shared schedules.
- Looks must come from the catalog, and display names are 2 to 16 ASCII characters checked against the slur list.
- A save upload is rejected unless `loadSave` would keep every field as sent, so a bad upload never replaces the last good save.

**Server-owned progress (accounts only)**

- An account's XP per ladder, title, visited places and personal bests live in D1 (`progress`), and the client can't write them. `PUT /api/save` keeps whatever XP and title the save says only until the server has its own row; after that it replaces them with the server's, and `GET /api/save` does the same.
- The client reports what happened (`POST /api/progress/score` with a game and a score, `/visit` with a room, `/title` with a title). The server grades the score with the game's own rules (`prizeFor`), decides the XP, and refuses a title that isn't earned.
- Scores must be plausible: finite, and not more than ten times the game's S bar (or, in lower-is-better games, not under half of it).
- Score XP is capped at 5,000 per UTC day; a first visit to a place pays once; progress writes are rate limited (6 per player, then 1 every 10 s; 60 per address, then 1 every 2 s).
- Concurrent writes can't double-spend the cap: each write checks a revision number and its leaderboard rows are only written if the progress write won.
- Guests have no server progress (403 `guest-progress-is-local`), so they are never on a board.
- Weekly boards (`weekly_scores`, `weekly_xp`) count only what the server graded this week, use Monday 00:00 UTC weeks, keep eight weeks, leave banned players off, and show usernames only, never ids.

**Harassment tools**

- Blocks are enforced by the server in both directions, for entities, profiles, chat and emotes.
- The server masks a short slur list. Players can turn on a strict personal filter (Friends panel), which masks swearing too in the chat they see, using the same `filterChat` in strict mode on their own client.
- Drunk chat is applied by the server: `RoomCore` stretches vowels by the buzz tier the sender's own moves show, and the report log keeps what was typed.
- Reports store the room's last 20 chat lines, unfiltered, for review in the D1 console.

**Responses**

- Errors are fixed codes such as `{ "error": "rate-limited" }`. They never echo input, stack traces or SQL. Exceptions are logged on the server only.
- API responses send `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.

**The static app**

- The Worker serves the Vite build (`dist/`) as static assets. Asset requests never run Worker code; `run_worker_first` covers only `/api/*` and `/ws/*`.
- `public/_headers`, copied into `dist/`, adds this policy to every asset response:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- The policy was checked against the build:
  - The HTML has one external module script and no inline scripts.
  - The bundle has no `eval` or `new Function`.
  - The CSS loads nothing external.
  - In headless Chromium, the app renders with no violations, a same-host `ws://` connection passes (CSP Level 3 `'self'` covers `ws:`/`wss:` to the same host), and `ws://evil.example` is blocked.
- `'unsafe-inline'` styles are for React style props. `server/src/csp.test.ts` pins the policy, so a loosened header fails `npm test`.

The smoke test (`npm run smoke:server`) runs against a local `wrangler dev`. It covers the server-owned progress flow (grading, implausible scores, boards, first visits, titles, the save override, the rate limit), the cross-origin refusals, the 6th rapid login, the 21st rapid block and the 6th rapid report getting 429, the security headers and the CSP, blocks, reconnects, and forged identity headers.

## Deployment requirements

- Set `ALLOWED_ORIGINS` to the production site, for example `https://daydaze.example`. The value in `server/wrangler.jsonc` lists only the Vite dev origins. Requests from the Worker's own origin are always allowed.
- Replace the placeholder D1 `database_id`.
- Admins are flagged by setting `users.is_admin = 1` in the D1 console.

## Known gaps

- **Guest re-entry after a ban.** A banned guest can start a new guest session. IP bans help, but addresses are shared (carrier NAT, campus Wi-Fi) and rotate (IPv6). Accounts are the real accountability tool; if guests are abused, gate chat or rooms behind accounts.
- **Client-owned coins and purchases.** Coins live in the client save, so players can give themselves anything. That only affects the cheater while there is no trading. Trading must wait for a server-authoritative economy. (XP and the boards are server-owned; rank coins are still granted by the client.)
- **Scores are still reported by the client.** The server can't replay a minigame, so a forged score inside the plausibility bounds still lands on a weekly board and pays its normal XP (within the daily cap). Closing this means simulating or verifying games on the server, or submitting input logs; until then the boards are "fair enough", and admins can ban a cheater, which removes them from the boards.
- **One-time import of old progress.** An account's first contact with the server seeds its XP, title, visited places and bests from the cloud save it had stored, which is client-owned. A player could have inflated that before the server shipped. The import is not counted on the weekly boards, so it can't win them; and an upload after the first contact can't change XP.
- **The client pays itself first.** A finished game, a first visit and a title change are paid in the local save at once (so play works offline), then sent to the progress routes; the server's reply replaces the local XP and title, as does the reply to every save upload. A score or visit that can't be sent (offline, rate limited) is paid locally but never reaches the account, and the next save sync overwrites it. Rank coins are still granted by the client.
- **Event-night XP is not on the server yet.** The client still pays XP for event nights, discoveries beyond first visits, lifts and the daily-challenge bonus locally; those numbers are overwritten by the server's the next time the save syncs. They need server endpoints before they count online.
- **Boards ignore blocks.** A blocked player still appears on a leaderboard you view.
- **Admin tools are API-only.** `POST /api/admin/ban` bans a player (and a guest's last IP) and signs them out everywhere, and admins get a Ban button on the peer card and a report viewer (`GET /api/admin/reports`) in the Friends panel. There's no kick, unban or report triage yet.
- **In-room rate limits live in memory.** Login, signup, guest, report and block budgets live in a `RateLimiter` Durable Object's SQLite storage, so eviction doesn't refill them. The per-room movement, chat and emote buckets in `RoomCore` are in memory, so a room copy evicted after idling starts them full again. Many users behind one IP share the auth budget.
- **Client-owned jail sentences and store bans.** They live in the save, so a player can clear them; they move to D1 with the server economy (A5).
- **Username enumeration, residual.** Signup still answers 409 for a taken name. Letting people choose a name requires that, and display names are public in every room anyway. Signup's 3-per-10-minutes budget makes bulk probing slow. Small timing differences remain, such as D1 lookups and the one-time dummy hash per isolate, but they are tiny next to a 100,000-iteration PBKDF2.
- **No account recovery, no 2FA, and no breached-password check.**
- **The chat filter is a short list.** Spacing and look-alike letters get past it; block and report are the backstop.
- **CSP scope.** The CSP covers static assets, which includes every HTML page. If the Worker ever renders HTML itself, it must add the same header in code. A future CDN, font host or analytics script needs an explicit CSP change.
- **Age gate.** It isn't built. The 18+ venues must stay unreachable for real players until it ships.
