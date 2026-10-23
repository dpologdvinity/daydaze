# Repository Guidelines

Daydaze is a multiplayer social hangout web game for adults who grew up on Club Penguin and Fantage. Read `docs/VISION.md` before any product or design decision. It records the audience, tone, age tiers, platform and open decisions.

## Status

3D (React Three Fiber). Built so far: the streamed city (Downtown and Nightlife Row, with Little Manila to the west, Chinatown and Koreatown to the east, the Arts District, Uptown and Suburbia to the north, and Beachside and the Fairground to the south) with traffic, doors and venue gates; the Velvet Room, Plaza, Pulse, The Violet Hour, food rooms, shops, apartment and jail; the Water Park, Amusement Park (nine rides, two coasters, the Midway booths) and Speedway; Nightlife Row's clubs and bars (The Skylark, Sugar Rush, Bassline, Karaoke Loft, La Noche, Player 2); the sports venues (the Dome, Seaside Stadium, the Gridiron, Skyline Driving Range, Flip City Gymnastics, Glow Bowl, Lagoon Links, the Courtside Club, Concrete Wave and the Roller Disco); the Starlight Galleria mall, Kamayan Hall, Starboard Marina (fishing) and Mermaid Cove (Siren Song); Photon Zone (laser tag), Splat City (paintball), Skyline Supply (groceries), Loft Studios (instruments) and the Daydaze Zoo; Gallery Row's Thrift Temple (vintage dyes, a daily find), Espresso Lab (barista shifts) and Gallery 44 (paint at the easel; your piece also hangs at home), Park Avenue's Dog-Ear Books, Sucre (the macaron tower) and the Marquise Rooftop pool, Beachside's Coconut Grove tiki bar, Swell Surf Co. (surfing) and the Boardwalk Arcade (Skee-Ball), Suburbia's Starlite Drive-In, and two counter games: Steam Ladle Ramen (Ramen Rush) and Belt Sushi Yard (Sushi Catch); a Take a photo button that saves a framed snapshot; your own car on the city streets (12 road cars, gas stations and fuel, rims, underglow and window tint); Green Haze, an 18+ weed and shroom lounge that only a development build with `?adult=1` may enter until the age check ships (`src/game/age.ts`); CC0 PBR textures (`scripts/fetch-textures.ts`, `surface()` in `src/client/city/worldTexture.ts`); prizes, personal bests and daily challenges for every scored game (`src/game/prizes.ts`, `challenges.ts`), Pulse's dance-off and the Beachside fireworks; a semi-realistic 3D doll built in Blender with a face and body closet; and 2,000+ handwritten NPC lines in `src/game/dialogue/`. The plan for everything else is `docs/plans/2026-10-14-master-roadmap.md` (milestones M0-M11); read it before starting new work. Specs live in `docs/specs/`.

## Layout

- `src/client/`: the Vite + React Three Fiber client (`world/`, `rooms/`, `avatar/`, `ui/`). Keep it thin; rules live in `src/game/`.
- `src/game/`: pure, tested game logic (looks, saves, walking, rooms, portals). No React or three.js.
- `src/net/`: network protocol and room server (pure TypeScript, tested).
- `server/`: Cloudflare Worker, Durable Objects and D1 schema. Pure, Node-tested modules sit in `server/src/`; the thin runtime adapters in `server/src/worker/` are type-checked with `server/tsconfig.json` against generated Workers types.
- `src/audio/`: procedural Web Audio synthesis (tested).
- `art/doll/blender/`: the 3D doll, built from MakeHuman's CC0 base mesh and asset pack. `fetch_makehuman.sh` downloads the inputs into `.cache/` (git-ignored); `blender --background --factory-startup --python art/doll/blender/build_doll.py` writes one GLB per part (body, each hair, outfit, swimsuit and shoe) to `.cache/out/`; `scripts/optimize-doll.sh` compresses them into `public/models/doll/`. `preview.py` renders a part combination for a quick look. The client side is `src/client/avatar/human/` (`HumanDoll.tsx`, makeup painted in `faceCanvas.ts`); the lab page is `/src/client/avatar/lineup.html?human=1&shot=face|body`.
- `art/doll/` (the rest): the older layered 2D doll art and its compositor (`art/doll/compositor.html`).
- `docs/VISION.md`: product decisions.
- `docs/specs/`: design specs. `docs/plans/`: implementation plans.

## Commands

Use Node.js 22.18 or newer; `.nvmrc` pins 24 for nvm and CI.

- `npm run dev`: start the client at `http://localhost:5173` (`npm run dev -- --port 5195` for another port).
- `npm run build` / `npm run preview`: typecheck, build `dist/`, and serve it.
- `npm test`: run all `src/**/*.test.ts` with Node's built-in test runner.
- `npm run typecheck`: strict TypeScript check, including the Worker (regenerates `server/worker-configuration.d.ts`).
- `npm run dev:server`: builds the app, then runs local `wrangler dev`, which serves `dist/` with the CSP from `public/_headers`. Apply migrations first with `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`.
- `npm run smoke:server`: starts a throwaway local `wrangler dev` and checks guests, rooms, chat, friends, blocks, reconnects and accounts end to end. Never run `wrangler deploy` or log in to Cloudflare without the user's approval.
- `npm run test:e2e:client`: Playwright browser tests for the client in `tests/client.spec.ts` (install the browser once with `npx playwright install chromium`). Headless WebGL runs on SwiftShader on the CPU, so it is slow: run only the tests you need (see Working here).
- `npm run test:e2e:online`: two browser players against a throwaway local Worker (`tests/online.spec.ts`, `playwright.online.config.ts`: wrangler on 8798, Vite on 5197). Slow, about 7 minutes; run it when you touch the online client or server.
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

The 3D client uses it behind `?online=1` (`src/client/net/`: `online.ts` joins the current room and keeps the look in sync; `OnlinePeers.tsx` draws everyone else's doll, car, name, buzz and chat bubble, and sends your moves; `PeerCard.tsx` and `FriendsPanel.tsx` handle friends, mute, block and report). Friends are mutual requests in D1 (`server/migrations/0002_friends.sql`); where they are comes from the Directory, which each room copy tells who is in it. Without the flag, or when `/api` can't be reached, the game stays single-player, so offline tests never touch the network.

In development, run `npm run dev:server` (wrangler dev on port 8787) next to Vite; `vite.config.ts` already proxies both paths, so cookies stay same-origin. If 8787 is taken, run wrangler on another port and start Vite with `WORKER_PORT=<port>`; a Vite port other than 5173 must be in `ALLOWED_ORIGINS` (`wrangler dev --var ALLOWED_ORIGINS:http://localhost:5199`). Stop wrangler by PID (`ss -ltnp`), not `pkill -f`. The proxy, for reference:

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

- CPU: no core limit; use what the machine has. Headless WebGL is CPU-bound SwiftShader (a GPU path through WSL's D3D12 was tried and hangs), so run only the browser tests you need.
- Parallel work goes in git worktrees under `.worktrees/<name>` on a `feat/<name>` branch, with `node_modules` symlinked to the main checkout (`ln -s ~/git/daydaze/node_modules .worktrees/<name>/node_modules`); never `npm install` in a worktree. Editor diagnostics in worktrees ("Cannot find module") are LSP noise; trust `npm run verify`.
- Merge gate: rebase onto `main`, `npm run verify` green (it includes Prettier, so format your files), and the Playwright tests for the feature you touched green (`npx playwright test -g "<your feature>"`). The full browser suite runs in GitHub Actions only when started by hand ("Run workflow" in the Actions tab), to save the private repo's minutes, so run the relevant browser tests locally before pushing. Merge each branch as soon as it passes, so branches don't drift: `git merge --no-ff`, remove the worktree and branch, push `main`. Pushing to `origin main` is allowed; deploying is not (ask first).
- Rooms share files (`src/game/rooms.ts`, `src/game/city/layout.ts`, `World.tsx`, `CameraRig.tsx`, `Overlay.tsx`, `DebugPanel.tsx`, `tests/client.spec.ts`), so keep edits there small and additive. A new room needs: the `RoomId` union, `ROOMS`, the key list in `rooms.test.ts`, `ROOM_HINTS`, `ROOM_SHOTS`, `SCENES`, and a city door or gate with an exit back to the sidewalk.
- Playwright: no `waitForTimeout`; wait on state via `data-*` attributes on the canvas (`data-frames` reaches `10`, plus per-room ones like `data-ride-state`). Use role locators and the `?debug=1` room buttons, not pixel clicks. A failure on the first cold load under heavy CPU is usually a flake: rerun once before debugging.
- Screenshots: `node --experimental-strip-types scripts/screenshots.ts <name>` against a dev server on 5195; one shot per process. Look at every screenshot before committing it. While iterating, check one small shot at a time; render the full set only at the end.
- Render budget on the low tier: under 250 draw calls, under 300k triangles, at most 4 real lights. Use instancing and emissive materials; allocate nothing inside `useFrame`.
- NPC lines come from `pickLine` in `src/game/dialogue/`; add lines to the role files (10+ per situation, handwritten). Venue-specific lines use `when: { venue: "<room-id>" }`.
- Free resources when done: stop dev servers, delete `dist/` and `test-results/`, remove merged worktrees.
- 3D assets: optimize GLB files with `npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt --texture-compress webp` (run on demand, not a dependency: its `braces` dep has an unpatched advisory). Profile scenes with the Chrome DevTools MCP (telemetry off via env in `~/.claude/settings.json`).
- Blender: the `blender` MCP server (project scope, in the git-ignored `.mcp.json`) runs `~/.local/bin/blender-mcp-launch`, which starts headless Blender (`blender-mcp-headless`, virtual display, add-on on port 9876) when nothing listens there. Batch builds don't need it: `blender --background` runs the doll scripts directly.
- glTF gotchas: run gltf-transform with `--flatten false --palette false --prune-attributes false` (as `scripts/optimize-doll.sh` does), or node extras, material names and the UVs the client paints on disappear; set Blender shape keys' `value = 0` before export, or glTF writes them as default weights of 1.
- Dev servers: kill a stray `vite` by the node PID; `pkill -f vite` also matches and kills the shell running it.

## Commits

Focused Conventional Commits, for example `feat(net): add room copy directory` or `fix(audio): resume suspended context`.
