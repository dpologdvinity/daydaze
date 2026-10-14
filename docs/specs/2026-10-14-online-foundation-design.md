# Online Foundation: Accounts, Guests, Shared Rooms, Chat and Moderation

Date: 2026-10-14
Status: Draft for review
Sub-project 1 of Daydaze. Ported from the Club Lion repo; the renderer (2D vs 3D) is still being decided, so client rendering details are out of scope here.

## Context and intent

Daydaze is a multiplayer Club Penguin / Fantage nostalgia game for people who grew up playing them, now in their late teens and early twenties. It must not feel like a kids' game. Later sub-projects add nightlife venues (bars, clubs, drinks), an age-confirmed 18+ area (strip club, weed lounge), glam fashion-doll avatars and more minigames.

This spec covers only the online foundation: players can play together in shared rooms, with or without an account, and the community has basic moderation from day one.

Decisions already made:

- Platform: Cloudflare Workers, Durable Objects (SQLite-backed) and D1.
- Budget: $0 to start, on free tiers. Infrastructure stays $0 until real players arrive.
- Expected scale: about 50 to 500 concurrent players in the first months, with growth beyond that possible.
- Anonymous guest play is required.
- Coins and purchases stay client-owned for now.
- Age verification is deferred. The 18+ venues must not go live to real players before an age gate ships.

## Goals

1. A player can open the game and play online as a guest without creating an account.
2. A player can create an account (username and password), and their save follows them across devices.
3. Players in the same room copy see each other move, chat and emote in real time.
4. Busy rooms split into numbered copies ("Downtown #1", "Downtown #2") so no room copy exceeds its cap.
5. Players can block, mute and report other players, and an admin can kick and ban.
6. Offline single-player keeps working when the server is unreachable.

## Non-goals

- Age gate and the 18+ area (a later sub-project). A nullable `birthdate` column is reserved only.
- Server-authoritative economy, trading and online leaderboards.
- Admin dashboard (reports are read in the Cloudflare D1 console).
- Voice chat.
- Tone reset of UI copy and palette (separate sub-project that runs alongside this one).

## Architecture

```
Browser (existing Vite app, served as static assets by the Worker)
   |  HTTPS: /api/guest, /api/signup, /api/login, /api/logout, /api/me, /api/save, /api/rooms/:roomId, /api/report, /api/block
   |  WSS:   /ws/room/:roomId/:copy
   v
Worker (gateway)
   |- verifies the session cookie on every request
   |- D1: users, sessions, saves, blocks, reports, bans
   |- Directory Durable Object (one per world): room copies and headcounts
   '- RoomInstance Durable Object (one per room copy)
        |- hosts the existing SpatialRoomServer logic and message decoders
        |- accepts sockets with the WebSocket Hibernation API
        |- receives {userId, username, isGuest, isAdmin} from the Worker at connect
        '- keeps positions, chat and emotes in memory only (ephemeral)
```

### Code layout

- `server/` (new): Worker entry, `RoomInstance` and `Directory` classes, D1 schema and migrations, `wrangler.jsonc`.
- `src/net/networkProtocol.ts` (existing): shared message types, encoders and validators used by both client and server.
- `src/net/roomNetworkSync.ts` (existing): `SpatialRoomServer` and the `NetworkTransport` interface. Room logic stays pure and testable in Node.
- New pure modules (tested in Node): rate limiter, walkable-area clamp, chat filter, guest-name generator, account save validation adapter.
- New client transport: a WebSocket implementation of the existing `NetworkTransport` interface. The existing loopback transport remains the offline mode.

### Room copies

- Each `RoomInstance` has a cap. The starting value is 60 players and is configurable.
- The `Directory` tracks the headcount for each copy of each room. When every copy of a room is full, it opens a new copy.
- `GET /api/rooms/:roomId` returns the copies with headcounts, or auto-picks the least-full copy that is not full.
- Players can join a friend's copy if it has space. A server-list screen shows the copies and their headcounts.

## Accounts, guests and saves

### Guests

- "Play as guest" calls `POST /api/guest`. The Worker creates a guest session with a random id and a generated name such as `MangoGuest4821`.
- Guests can join online rooms, chat, emote and use friends features for the session.
- Guests have a slower chat rate and cannot host community lounges.
- Blocks and reports work on guests. Bans apply to the guest session and IP address. Re-entry as a new guest is possible, so accounts are the main accountability tool.
- Guest saves stay in `localStorage`.
- "Create account" upgrades a guest. The guest's local save is uploaded to the new account.

### Accounts

- `POST /api/signup` takes a username and password. `POST /api/login` returns a session.
- Passwords are hashed in the Worker with Web Crypto PBKDF2 and a per-user salt. No new runtime dependency.
- Sessions use an HTTP-only, Secure, SameSite=Lax cookie backed by a D1 `sessions` table. Logout deletes the session row.
- Usernames are validated for length and characters and checked against the chat filter's slur list.
- `birthdate` is a nullable column that is not collected yet.

### Saves

- Each account stores one save as a JSON blob in D1.
- Every write runs through the same save validation the client uses for `localStorage` loads (a shared module in `src/`). Invalid saves are rejected, and the last good save is kept.
- The client loads the save at login and pushes changes with a short debounce.
- Coins and purchases remain client-owned. Cheating affects only the cheater because there is no trading yet. This becomes server-authoritative when trading or online leaderboards are added.

## Realtime rooms

### Join flow

1. The client requests the room's copies (or an auto-pick).
2. The client opens `WSS /ws/room/:roomId/:copy`. The Worker verifies the session (guest or account) and forwards the request to that copy's `RoomInstance`, passing the player identity.
3. The room accepts the socket with hibernation, stores the identity with `serializeAttachment`, and sends a snapshot of current occupants.
4. Clients then send `update`, `chat` and `emote` messages. The room broadcasts deltas.
5. On leave or disconnect, the room broadcasts the leave and reports the new headcount to the `Directory`.

### Server-side enforcement

- Every inbound message is decoded with the existing `decodeClientMessage`. Invalid messages are dropped. Repeated invalid messages disconnect the socket.
- Rate limits: movement updates at about 15 per second, chat at 1 message per 2 seconds for accounts and slower for guests, emotes throttled.
- Positions are clamped to the room manifest's walkable polygon.
- Blocked pairs never receive each other's entities or chat.

## Chat and moderation

- Chat is free text up to 120 characters.
- A server-side filter masks a short slur list. General profanity is allowed because the audience is adults. Players can turn on a stricter personal filter.
- The existing quick-chat wheel keeps working.
- Block: mutual hide everywhere, including chat. Stored in D1 for accounts and per session for guests.
- Mute: hides one player's chat for the current session only.
- Report: from the player card. Stores the reporter, the target, a reason and the room's last 20 chat lines in D1.
- Admin: an `is_admin` flag allows kick and ban from inside the game.

## Error handling

- Dropped socket: automatic reconnect with backoff of 1, 2 and 4 seconds, up to 15 seconds between attempts, with a "Reconnecting" indicator. Reconnect receives a fresh snapshot.
- Room full: the room rejects the join with a reason, and the client offers the next copy.
- Server unreachable: the game falls back to offline single-player, shows a "Playing offline" notice, and saves locally.
- Session expired: accounts return to the login screen. Guests receive a new guest session silently.
- Save rejected: the server keeps the last good save. The client logs a warning.
- Hibernated room: sockets stay open. Positions rebuild from the next client updates.

## Testing

- Pure logic is tested with the existing Node test runner, using RED-GREEN TDD, and added to `npm test`: room server behaviour, rate limiter, walkable clamp, chat filter, guest names, account save validation.
- The Durable Object classes stay thin adapters over the tested logic.
- New Playwright spec `tests/multiplayer.spec.ts` runs against local `wrangler dev`:
  - two browser contexts join one room and see each other move and chat;
  - a block hides one player from the other;
  - a guest upgrades to an account and keeps the avatar;
  - a full room causes the second player to land in a new copy;
  - stopping the server falls back to offline mode.
- Single-player tests run on the loopback transport.

## Deployment

- `server/wrangler.jsonc` defines the Worker, the `RoomInstance` and `Directory` classes (in a `new_sqlite_classes` migration), the D1 binding and static assets.
- New dev dependency: `wrangler`. No new runtime dependency.
- `npm run dev:online` runs Vite and `wrangler dev` together.
- Production deploy is `wrangler deploy`. It requires the user's Cloudflare login and is never run without the user's approval.
- Exact free-tier request, storage and connection limits are confirmed against current Cloudflare documentation during planning.

## Risks

- Free-tier limits could be reached during a busy launch. The plan must record the current limits and what happens when they are exceeded.
- D1 has per-database size limits. At large scale, accounts move to Postgres. Room code is unaffected.
- Guest abuse: guests can re-enter after a ban. Mitigation is guest rate limits and IP bans now, and account-only privileges later if needed.
- Client-owned coins allow self-cheating. Acceptable until trading or online leaderboards exist.
