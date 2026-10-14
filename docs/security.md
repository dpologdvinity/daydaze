# Security

Date: 2026-10-14. Covers the online foundation: the Worker in `server/`, the browser client in `src/net/client/`, and the shared protocol in `src/net/`.

## Threat model

Daydaze is a free social game for adults, run on Cloudflare free tiers. What we protect, roughly in order:

1. **Accounts and sessions.** Nobody should sign in as someone else, ride their session from another site, or guess their password.
2. **Players from each other.** Harassment is the main real-world harm: blocks must hold, slurs are masked, and admins can remove people.
3. **The shared rooms.** One client must not crash a room copy, flood it, teleport, spoof another player, or claim admin.
4. **Free-tier capacity.** Scripts must not burn D1 writes or CPU through unauthenticated endpoints.

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
- Over-limit requests get 429 with `Retry-After`.

**Identity inside rooms**

- Room copies get the player's id, name, guest flag and admin flag only from the gateway, which overwrites any client-supplied identity header.
- No client message can kick or ban. `RoomCore.kick` and `RoomCore.ban` require an admin who is present in that copy. Both are covered by unit tests, and the smoke test checks that a forged identity header is ignored.

**Untrusted input**

- Every WebSocket frame and every request body is decoded and validated before use.
- Packets are capped at 64 KB, and saves at 64 KB.
- Ten invalid frames disconnect the socket.
- Movement (about 15/s), chat (1 per 2 s for accounts, 1 per 4 s for guests) and emotes are rate limited.
- Positions are clamped to the room's walkable polygon.
- Looks must come from the catalog, and display names are 2 to 16 ASCII characters checked against the slur list.
- A save upload is rejected unless `loadSave` would keep every field as sent, so a bad upload never replaces the last good save.

**Harassment tools**

- Blocks are enforced by the server in both directions, for entities, profiles, chat and emotes.
- The server masks a short slur list. A strict mode that also masks profanity exists in `filterChat` for a personal setting, but the client doesn't use it yet.
- Reports store the room's last 20 chat lines, unfiltered, for review in the D1 console.

**Responses**

- Errors are fixed codes such as `{ "error": "rate-limited" }`. They never echo input, stack traces or SQL. Exceptions are logged on the server only.
- API responses send `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.

The smoke test (`npm run smoke:server`) exercises the cross-origin refusals, the 6th rapid login getting 429, the security headers, blocks, reconnects and forged identity headers against a local `wrangler dev`.

## Deployment requirements

- Set `ALLOWED_ORIGINS` to the production site, for example `https://daydaze.example`. The value in `server/wrangler.jsonc` lists only the Vite dev origins. Requests from the Worker's own origin are always allowed.
- Replace the placeholder D1 `database_id`.
- Admins are flagged by setting `users.is_admin = 1` in the D1 console.

## Known gaps

- **Guest re-entry after a ban.** A banned guest can start a new guest session. IP bans help, but addresses are shared (carrier NAT, campus Wi-Fi) and rotate (IPv6). Accounts are the real accountability tool; if guests are abused, gate chat or rooms behind accounts.
- **Client-owned coins and purchases.** Coins live in the client save, so players can give themselves anything. That only affects the cheater while there is no trading or online leaderboard. Both of those must wait for a server-authoritative economy.
- **No admin route yet.** `RoomCore` supports kick and ban, but nothing exposes them, so bans are added by hand in D1.
- **Rate-limit memory.** Buckets live in Durable Object memory, so an object evicted after idling starts full again. Many users behind one IP share a budget.
- **Username enumeration.** Signup answers 409 for taken names, and login skips the password hash for unknown users, which leaks timing.
- **No account recovery, no 2FA, and no breached-password check.**
- **`/api/report` and `/api/block` are not rate limited** beyond requiring a session.
- **The chat filter is a short list.** Spacing and look-alike letters get past it; block and report are the backstop.
- **No Content-Security-Policy yet.** The Worker doesn't serve the app's static assets yet. Add a CSP when it does.
- **Age gate.** It isn't built. The 18+ venues must stay unreachable for real players until it ships.
