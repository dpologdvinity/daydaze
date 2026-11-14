# Daydaze: agent instructions

Canonical instructions for every coding agent (Claude Code loads this through
the `@AGENTS.md` line in `CLAUDE.md`; Codex, Antigravity and opencode read it
directly).

Daydaze is a 3D (React Three Fiber) multiplayer social hangout web game for
adults who grew up on Club Penguin and Fantage. Read `docs/VISION.md` before any
product or design decision: it records the audience, tone, age tiers, platform
and open decisions.

## Where the work is

- What exists: the rooms in `src/game/rooms.ts`, the city in
  `src/game/city/layout.ts`, and `git log`.
- What to build next: `docs/plans/2026-11-14-next.md` (the current plan:
  fix the red CI on `main` first), then the "Use next" list in
  `docs/asset-inventory.md`. `docs/plans/2026-11-11-handoff.md` is the
  previous handoff (done).
- `docs/plans/2026-10-23-next-steps.md` is the running log and gotchas list;
  `docs/plans/2026-10-14-master-roadmap.md` holds milestones M0-M11. Specs live
  in `docs/specs/`, plans in `docs/plans/`.
- Owner-only tasks (keys, secrets, DNS, sign-offs) go in `STEPS-FOR-OWNER.md`
  (repo root, git-excluded).

## Layout

- `src/client/`: the Vite + R3F client (`world/`, `city/`, `rooms/`, `avatar/`,
  `ui/`, `net/`). Keep it thin; rules live in `src/game/`.
- `src/game/`: pure, tested game logic. No React or three.js.
- `src/net/`: network protocol, room server and the framework-free browser
  client (`src/net/client/`). Pure TypeScript, tested.
- `server/`: Cloudflare Worker, Durable Objects and D1 schema. Pure modules in
  `server/src/` are Node-tested; the runtime adapters in `server/src/worker/` are
  type-checked against generated Workers types.
- `src/audio/`: procedural Web Audio synthesis (tested).
- `art/`: Blender scripts that build or convert every 3D asset, so assets are
  reproducible. The doll is `art/doll/blender/` (MakeHuman CC0 base).
- `docs/agents/`: the agent workflow itself: shared brief for build agents
  (`agent-rules.md`), tool inventory (`TOOLS.md`), merge scripts (`scripts/`)
  and a free-model benchmark (`investigations/opencode/`).

## Commands

Node.js 22.18 or newer (`.nvmrc` pins 24).

| Command | What it does |
| --- | --- |
| `npm run dev` | Client on `http://localhost:5173` (`-- --port 5195` for another) |
| `npm run build` / `npm run preview` | Vite build of `dist/` / serve it |
| `npm test` | Node test runner over `src/`, `server/` and `scripts/` `*.test.ts` |
| `npm run test:coverage` | Same, with coverage into `coverage/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | Strict `tsc`, plus the Worker (regenerates `server/worker-configuration.d.ts`) |
| `npm run format` / `format:check` | Prettier |
| `npm run verify` | lint, test, typecheck, format check, build, perf budget: the merge gate |
| `npm run test:e2e:client` | Playwright client tests (`tests/client.spec.ts`) |
| `npm run test:e2e` / `test:e2e:sw` | Playwright minigames / service-worker configs |
| `npm run test:e2e:online` | Two browser players against a local Worker (~7 min) |
| `npm run dev:server` | Build, then local `wrangler dev` on 8787 (apply migrations first: `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`) |
| `npm run smoke:server` | End-to-end check of a throwaway local Worker |
| `npm run perf:budget` | Check `dist/` against the performance budget (run after build) |

Client URL flags: `?quality=low|high`, `?still=1` (render a few frames and
stop, for screenshots), `?debug=1` (room jump buttons), `?time=HH:MM` (pin the
hour), `?night=<club-night-id>`, `?online=1` (multiplayer), `?adult=1`
(dev-only 18+ preview), `?timescale=0.1` (slow the player and every doll to a
tenth, so a frame strip on the slow software renderer catches a half-second
move; the `walkStrip` shots in `scripts/screenshots.ts` use it).

## Online

`?online=1` joins rooms through `src/net/client/OnlineSession.ts`; without it,
or when `/api` is unreachable, the game stays single-player, so offline tests
never touch the network. In development run `npm run dev:server` next to Vite
(`vite.config.ts` proxies `/api` and `/ws`; set `WORKER_PORT` if 8787 is taken).
A Vite port other than 5173 must be in `ALLOWED_ORIGINS`
(`server/wrangler.jsonc`). Threat model and known gaps: `docs/security.md`.

## Rules

- TypeScript strict. No `any`, no `as` assertions where a type guard or
  `as const` works. Validate anything from the network or `localStorage`.
- Every file starts with a header comment like its neighbors. American spelling.
- Test-first for pure logic in `src/game/`; a bug fix starts with a failing test.
- Ages: the game is 13+. Alcohol, drunk effects, drugs and 18+ venues exist only
  behind `ADULT_OK` (`src/client/adult.ts`, rules in `src/game/age.ts`) until
  the age check and 18+ servers ship. No real alcohol or tobacco brands.
- No AI-generated dialogue. NPC lines are handwritten in `src/game/dialogue/`
  (10+ per situation; venue lines use `when: { venue: "<room-id>" }`).
- Audio is procedural Web Audio first; CC0 or credited sound files where
  synthesis falls short.
- Download, don't build: before making any 3D model, texture or animation,
  search for a free one (CC0 preferred, CC-BY credited). Record every asset in
  `docs/assets.md` and `src/game/credits.ts` (a test checks they match).
- Render budget on the low tier: under 250 draw calls, under 300k triangles,
  at most 4 real lights. Instance; allocate nothing inside `useFrame`.
- A new room needs: the `RoomId` union, `ROOMS`, the key list in
  `rooms.test.ts`, `ROOM_HINTS`, `ROOM_SHOTS`, `SCENES`, and a city door or gate
  with an exit back to the sidewalk. Edits to shared room files stay small and
  additive.

## Agent workflow

- Parallel agents each work in a git worktree, `.worktrees/<name>` on
  `feat/<name>`, with `node_modules` symlinked from the main checkout (never
  `npm install` in a worktree). Build agents get `docs/agents/agent-rules.md` as
  their brief.
- CI does the heavy lifting so the owner's machine stays free:
  - Pushing `feat/**`, `fix/**`, `perf/**` or `ci/**` runs `npm run verify`
    (`verify.yml`). Locally, run single checks under `nice -n 19`.
  - Browser tests: `gh workflow run browser-test.yml --ref <branch> -f grep="<test title>"`.
  - Screenshots: `gh workflow run screenshots.yml --ref <branch> -f shots="<names>"`,
    then `gh run download <id> -n screenshots`. Look at every screenshot.
  - `ci.yml` and `playwright.yml` run on pushes and pull requests to `main`;
    `deploy.yml` runs only by hand.
- Merge gate: rebase onto `main`, verify green, the touched feature's Playwright
  tests green, then `git merge --no-ff`, remove the worktree and branch, push
  `main`. `docs/agents/scripts/land.sh` automates this against GitHub CI.
- Playwright: no `waitForTimeout`; wait on `data-*` attributes on the canvas
  (`data-frames` reaches `10`). Use role locators and the `?debug=1` room
  buttons. Headless WebGL is CPU SwiftShader, so run only the tests you need; a
  cold first-run failure is usually a flake, rerun once.
- Processes: kill only PIDs you started (find them with `ss -ltnp`), never
  `pkill -f`. Stop dev servers and delete `dist/` and `test-results/` when done.
- Never deploy, run `wrangler deploy` or log in to Cloudflare without the
  owner's approval (`.claude/settings.json` denies it). Meshy and Tripo cost
  credits: ask first.
- Tools for agents (MCP servers, plugins, CLIs) are listed in
  `docs/agents/TOOLS.md`; keep it current. MCP servers are shared in
  `.mcp.json` (Claude), `.codex/config.toml` (Codex), `.agents/plugins/`
  (Antigravity) and `opencode.json`. Vendored skills: `.agents/skills/`
  (linked from `.claude/skills/`, sources in `NOTICE.md`).

## Asset pipeline

- glTF: `npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt --texture-compress webp`
  (on demand, not a dependency). Add
  `--flatten false --palette false --prune-attributes false` when node names,
  material names or UVs matter. Set Blender shape keys to `value = 0` before
  export.
- Blender runs headless: `blender --background --factory-startup --python <script>`.
  Dolls: `build_doll.py` (add `DOLL_SEX=male` for the `-m` files), then
  `bash scripts/optimize-doll.sh`; mocap clips: `art/doll/blender/mocap.py`
  (Mixamo FBX in the git-ignored `mixamo/`).
- Poly Haven: `.venv/bin/polydown`. Kenney, ambientCG and Poly Haven allow
  scripted downloads; itch.io does not, so ask the owner.

## Environment variables

Secrets live in a git-ignored `.env` (loaded by direnv's `.envrc`). Run commands
that need keys through `bash scripts/with-env.sh <command>`; never print `.env`.
Each key and what it's for is in `docs/agents/TOOLS.md`.

| Variable | Used by |
| --- | --- |
| `MESHY_API_KEY` | The `meshy` MCP server in `.mcp.json` |
| `TRIPO_API_KEY` | `scripts/tripo.sh` |
| `ELEVENLABS_API_KEY` | Offline sound generation (`scripts/gen-sounds.mjs`) |
| `SKETCHFAB_API_TOKEN`, `POLYPIZZA_API_KEY`, `FREESOUND_API_KEY` | Asset search and download |
| `GEMINI_API_KEY`, `POLLINATIONS_API_KEY`, `ITCH_API_KEY` | Optional reference images and owner library |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `R2_*` | Owner-approved infrastructure only |

## Commits

Focused Conventional Commits, for example `feat(net): add room copy directory`
or `fix(audio): resume suspended context`.
