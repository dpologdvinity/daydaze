# Repository Guidelines

Daydaze is a multiplayer social hangout web game for adults who grew up on Club Penguin and Fantage. Read `docs/VISION.md` before any product or design decision. It records the audience, tone, age tiers, platform and open decisions.

## Status

Early setup. The renderer is 3D (React Three Fiber), recorded in `docs/VISION.md`. The app scaffold comes from the 3D prototype.

## Layout

- `src/net/`: network protocol and room server (pure TypeScript, tested).
- `server/`: Cloudflare Worker, Durable Objects and D1 schema. Pure, Node-tested modules sit in `server/src/`; the thin runtime adapters in `server/src/worker/` are type-checked with `server/tsconfig.json` against generated Workers types.
- `src/audio/`: procedural Web Audio synthesis (tested).
- `art/doll/`: layered 2D doll art and its compositor. Open `art/doll/compositor.html` in a browser to preview combinations.
- `docs/VISION.md`: product decisions.
- `docs/specs/`: design specs. `docs/plans/`: implementation plans.

## Commands

Use Node.js 22.18 or newer.

- `npm test`: run all `src/**/*.test.ts` with Node's built-in test runner.
- `npm run typecheck`: strict TypeScript check, including the Worker (regenerates `server/worker-configuration.d.ts`).
- `npm run dev:server`: builds the app, then runs local `wrangler dev`, which serves `dist/` with the CSP from `public/_headers`. Apply migrations first with `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`.
- `npm run smoke:server`: starts a throwaway local `wrangler dev` and checks guests, rooms, chat, blocks, reconnects and accounts end to end. Never run `wrangler deploy` or log in to Cloudflare without the user's approval.
- `npm run format` / `npm run format:check`: Prettier.
- `npm run verify`: tests, typecheck and format check.

## Online client

`src/net/client/` is the framework-free browser side: `api.ts` (typed, validated `/api` calls), `WebSocketTransport.ts` (reconnects with backoff; close codes 4000 invalid, 4001 full, 4002 kicked, 4003 banned and 4009 replaced are final) and `OnlineSession.ts` (session, room copies, remote players, throttled moves). Wire it up in the browser like this:

```ts
const session = new OnlineSession({
  api: createApi({ fetch: (url, init) => fetch(url, init) }),
  wsBaseUrl: location.origin.replace(/^http/, "ws"),
  openTransport: (url) => new WebSocketTransport({ url, WebSocket }),
});
if (await session.start()) await session.joinRoom("plaza", look);
// else: status "offline", keep playing single-player.
```

In development, run `npm run dev:server` (wrangler dev on port 8787) next to Vite and proxy both paths, so cookies stay same-origin:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/ws": { target: "ws://127.0.0.1:8787", ws: true },
    },
  },
});
```

State-changing requests and room sockets must come from the Worker's own origin or one listed in `ALLOWED_ORIGINS` (`server/wrangler.jsonc`; production must set the real site). See `docs/security.md` for the threat model and known gaps. The session cookie is `Secure`. Chrome and Firefox accept it on `http://localhost`; other plain-HTTP hosts (a LAN IP for phone testing) need HTTPS.

## Rules

- TypeScript strict. No `any`, no `as` assertions where a type guard or `as const` works.
- Validate anything from the network or `localStorage` before using it.
- All audio is procedural Web Audio synthesis. No audio files.
- Never use the trademarked doll brand name or logo in code, assets, file names or copy. Say "doll".
- No AI-generated dialogue in the game.
- Not for children. Do not add child-safety framing; do add adult moderation (block, mute, report).
- Keep the 18+ venues behind the age gate. They must not reach real players before it ships.

## Commits

Focused Conventional Commits, for example `feat(net): add room copy directory` or `fix(audio): resume suspended context`.
