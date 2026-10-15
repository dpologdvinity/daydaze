# Repository Guidelines

Daydaze is a multiplayer social hangout web game for adults who grew up on Club Penguin and Fantage. Read `docs/VISION.md` before any product or design decision. It records the audience, tone, age tiers, platform and open decisions.

## Status

3D (React Three Fiber). Built so far: the streamed city (Downtown and Nightlife Row) with doors and venue gates, the Velvet Room, Plaza, Water Park, Amusement Park and Speedway, plus 2,000+ handwritten NPC lines in `src/game/dialogue/`. The plan for everything else is `docs/plans/2026-10-14-master-roadmap.md` (milestones M0-M11); read it before starting new work. Specs live in `docs/specs/`.

## Layout

- `src/client/`: the Vite + React Three Fiber client (`world/`, `rooms/`, `avatar/`, `ui/`). Keep it thin; rules live in `src/game/`.
- `src/game/`: pure, tested game logic (looks, saves, walking, rooms, portals). No React or three.js.
- `src/net/`: network protocol and room server (pure TypeScript, tested).
- `server/`: Cloudflare Worker, Durable Objects and D1 schema. Pure, Node-tested modules sit in `server/src/`; the thin runtime adapters in `server/src/worker/` are type-checked with `server/tsconfig.json` against generated Workers types.
- `src/audio/`: procedural Web Audio synthesis (tested).
- `art/doll/`: layered 2D doll art and its compositor. Open `art/doll/compositor.html` in a browser to preview combinations.
- `docs/VISION.md`: product decisions.
- `docs/specs/`: design specs. `docs/plans/`: implementation plans.

## Commands

Use Node.js 22.18 or newer.

- `npm run dev`: start the client at `http://localhost:5173` (`npm run dev -- --port 5195` for another port).
- `npm run build` / `npm run preview`: typecheck, build `dist/`, and serve it.
- `npm test`: run all `src/**/*.test.ts` with Node's built-in test runner.
- `npm run typecheck`: strict TypeScript check, including the Worker (regenerates `server/worker-configuration.d.ts`).
- `npm run dev:server`: builds the app, then runs local `wrangler dev`, which serves `dist/` with the CSP from `public/_headers`. Apply migrations first with `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`.
- `npm run smoke:server`: starts a throwaway local `wrangler dev` and checks guests, rooms, chat, blocks, reconnects and accounts end to end. Never run `wrangler deploy` or log in to Cloudflare without the user's approval.
- `npm run test:e2e:client`: Playwright browser tests for the client in `tests/client.spec.ts` (install the browser once with `npx playwright install chromium`). Headless WebGL runs on SwiftShader on the CPU, so it is slow: pin it with `taskset -c 6-11` (see Working here).
- `npm run format` / `npm run format:check`: Prettier.
- `npm run verify`: tests, typecheck, format check and build.

Client URL flags: `?quality=low|high` forces a quality tier, `?still=1` renders a few frames and stops (for screenshots), `?debug=1` shows room jump buttons.

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

## Working here (agents)

- CPU: use cores 6-11 only. Prefix heavy commands with `taskset -c 6-11`; Playwright runs with `--workers=2`. Another project uses cores 0-5.
- Parallel work goes in git worktrees under `.worktrees/<name>` on a `feat/<name>` branch, with `node_modules` symlinked to the main checkout (`ln -s ~/git/daydaze/node_modules .worktrees/<name>/node_modules`); never `npm install` in a worktree. Editor diagnostics in worktrees ("Cannot find module") are LSP noise; trust `npm run verify`.
- Merge gate: rebase onto `main`, `npm run verify` green (it includes Prettier, so format your files), the client Playwright suite green, then `git merge --no-ff`, remove the worktree and branch, and push `main`. Pushing to `origin main` is allowed; deploying is not (ask first).
- Rooms share files (`src/game/rooms.ts`, `src/game/city/layout.ts`, `World.tsx`, `CameraRig.tsx`, `Overlay.tsx`, `DebugPanel.tsx`, `tests/client.spec.ts`), so keep edits there small and additive. A new room needs: the `RoomId` union, `ROOMS`, the key list in `rooms.test.ts`, `ROOM_HINTS`, `ROOM_SHOTS`, `SCENES`, and a city door or gate with an exit back to the sidewalk.
- Playwright: no `waitForTimeout`; wait on state via `data-*` attributes on the canvas (`data-frames` reaches `10`, plus per-room ones like `data-ride-state`). Use role locators and the `?debug=1` room buttons, not pixel clicks. A failure on the first cold load under heavy CPU is usually a flake: rerun once before debugging.
- Screenshots: `node --experimental-strip-types scripts/screenshots.ts <name>` against a dev server on 5195; one shot per process. Look at every screenshot before committing it.
- Render budget on the low tier: under 250 draw calls, under 300k triangles, at most 4 real lights. Use instancing and emissive materials; allocate nothing inside `useFrame`.
- NPC lines come from `pickLine` in `src/game/dialogue/`; add lines to the role files (10+ per situation, handwritten). Venue-specific lines use `when: { venue: "<room-id>" }`.
- Free resources when done: stop dev servers, delete `dist/` and `test-results/`, remove merged worktrees.
- 3D assets: optimize GLB files with `npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt --texture-compress webp` (run on demand, not a dependency: its `braces` dep has an unpatched advisory). Profile scenes with the Chrome DevTools MCP (telemetry off via env in `~/.claude/settings.json`).
- Blender: `blender-mcp-headless` (in `~/.local/bin`) starts Blender on a virtual display with the MCP add-on listening on port 9876; the `blender` MCP server (user scope) talks to it.

## Commits

Focused Conventional Commits, for example `feat(net): add room copy directory` or `fix(audio): resume suspended context`.
