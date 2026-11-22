# Daydaze: agent instructions

Canonical instructions for every coding agent (Claude Code loads this through
the `@AGENTS.md` line in `CLAUDE.md`; Codex, Antigravity and opencode read it
directly).

Daydaze is a 3D (React Three Fiber) multiplayer open-city web game for
adults: GTA-style city life plus IMVU-style dress-up hangouts. Read
`docs/VISION.md` before any product or design decision: it records the
audience, tone, age tiers, platform and open decisions.

## Where the work is

- What exists: the rooms in `src/game/rooms.ts`, the city in
  `src/game/city/layout.ts`, and `git log`.
- What to build next: `docs/plans/2026-11-14-next.md` (the current plan;
  item 1, the red CI on `main`, is done), then the "Use next" list in
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

Node.js 22.18 or newer (`.nvmrc` pins 26).

| Command                             | What it does                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Client on `http://localhost:5173` (`-- --port 5195` for another)                                                                                |
| `npm run build` / `npm run preview` | Vite build of `dist/` / serve it                                                                                                                |
| `npm test`                          | Node test runner over `src/`, `server/` and `scripts/` `*.test.ts`                                                                              |
| `npm run test:coverage`             | Same, with coverage into `coverage/`                                                                                                            |
| `npm run lint`                      | ESLint (first regenerates `server/worker-configuration.d.ts`, which the type-aware rules need to resolve Worker types)                          |
| `ruff check .`                      | Python lint for the Blender and asset scripts (`pipx run ruff==0.17.2 check .` if Ruff is not installed)                                        |
| `npm run lint:md`                   | markdownlint-cli2 over the Markdown docs                                                                                                        |
| `npm run typecheck`                 | Strict `tsc`, plus the Worker (regenerates `server/worker-configuration.d.ts`)                                                                  |
| `npm run format` / `format:check`   | Prettier                                                                                                                                        |
| `npm run verify`                    | lint, test, typecheck, format check, build, perf budget: the merge gate                                                                         |
| `npm run test:e2e:client`           | Playwright client tests (`tests/client.spec.ts`)                                                                                                |
| `npm run test:e2e` / `test:e2e:sw`  | Playwright minigames / service-worker configs                                                                                                   |
| `npm run test:e2e:online`           | Two browser players against a local Worker (~7 min)                                                                                             |
| `npm run dev:server`                | Build, then local `wrangler dev` on 8787 (apply migrations first: `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`) |
| `npm run smoke:server`              | End-to-end check of a throwaway local Worker                                                                                                    |
| `npm run perf:budget`               | Check `dist/` against the performance budget (run after build)                                                                                  |

Client URL flags: `?quality=low|high|ultra`, `?still=1` (render a few frames and
stop, for screenshots), `?debug=1` (room jump buttons), `?time=HH:MM` (pin the
hour), `?night=<club-night-id>`, `?online=1` (multiplayer), `?adult=1`
(dev-only 18+ preview), `?timescale=0.1` (slow the player and every doll to a
tenth, so a frame strip on the slow software renderer catches a half-second
move; the `walkStrip` shots in `scripts/screenshots.ts` use it).

In development, `` ` `` opens the dev panel (stats, wireframe, free cam,
room/game/event jumps, a live hour, inspector, scene tree) and `__dd` in the
console holds the scene, renderer and player; every control, handle and URL
flag is in `docs/dev-tools.md`. It is dev-only: keep its call sites behind
`import.meta.env.DEV` dynamic imports so production never ships it.

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

- **Always work in a worktree.** Other agents are working in the main checkout
  (`~/git/daydaze`) at the same time. It always stays on `main`. Never switch
  its branch, and never commit, stash or discard anything in it. Only read
  there (`git status`, `log`, `diff`, `fetch`). Start every change, even one
  line, with `git worktree add -b <type>/<name> .worktrees/<name> origin/main`.
- **Run `docs/agents/scripts/setup-git.sh` once per clone.** Worktrees share
  the remote refs, so parallel fetches otherwise fail with `cannot lock ref`
  after git's 100 ms default lock timeout.
- **You own your PR until it merges.** When your issue is done, open a PR.
  - If a check fails, fix it.
  - If CodeRabbit comments, consider each suggestion: fix it, or reply why not.
  - If the PR produced screenshots (the `pr-screenshots.yml` comment, or runs
    you dispatched), look at every one and judge whether it looks good enough.
    Fix what doesn't before you mark the PR ready (auto-merge then merges it)
    or merge it yourself.
  - Bypass-merge (`gh pr merge <n> --admin --merge`) only when all of these
    hold; otherwise leave it to auto-merge:
    - every check is green;
    - every screenshot the PR produced has been looked at and looks good
      enough;
    - the work is finished: every item in the issue and the PR's checklist is
      done, and the PR is not a draft;
    - every review comment is answered and its thread resolved;
    - the branch is up to date with `main`;
    - updating from `main` merged cleanly, with no conflicts to fix (if you
      fixed any, wait for the checks to pass again).
  - You are not done until the PR is merged. Then delete your worktree and
    branch.
- Parallel agents each work in a git worktree, `.worktrees/<name>` on
  `feat/<name>`, with `node_modules` and, when present, `.cache` symlinked from
  the main checkout (never `npm install` in a worktree). Build agents get
  `docs/agents/agent-rules.md` as
  their brief.
- CI does the heavy lifting so the owner's machine stays free:
  - Pushing `feat/**`, `fix/**`, `perf/**` or `ci/**` runs `npm run verify`
    (`verify.yml`). Locally, run single checks under `nice -n 19`.
  - Browser tests: `gh workflow run browser-test.yml --ref <branch> -f grep="<test title>"`.
  - Screenshots: `gh workflow run screenshots.yml --ref <branch> -f shots="<tokens>"`
    (registry names, raw queries like `room=city&at=10,5&turn=4`, `spot=<building>`,
    or `tour`; see `docs/dev-tools.md`), then `gh run download <id> -n screenshots`
    or open `https://github.com/dpologdvinity/daydaze/tree/screenshots/<branch-with-dashes>`.
    Look at every screenshot. `tree/screenshots/main` is the whole game as of
    the last game-affecting push to `main`.
    PRs that change room, city, avatar or HUD code get the matching shots
    automatically (`pr-screenshots.yml`, picked by `scripts/pr-shots.ts`) and a
    comment linking the artifact, kept 7 days.
    Every screenshot and recording run is also kept forever as a release on
    `dpologdvinity/daydaze-artifacts` (`scripts/archive-run.sh`; the PR
    comment and the run summary link it).
  - Screen recordings of any scene or minigame (MP4):
    `gh workflow run record.yml -f scene="room=karaoke" -f seconds=30`, or
    `-f game=trivia -f clicks=Play`; then `gh run download <id> -n recording`.
    Options are in `scripts/record.ts`.
  - Artifacts expire, so `archive-sweep.yml` copies screenshots, recordings,
    Playwright reports and profiles to permanent releases on
    `dpologdvinity/daydaze-artifacts` daily (`scripts/archive-sweep.ts`);
    builds and coverage come back from any commit and are left to expire.
  - `ci.yml` and `playwright.yml` run on pushes and pull requests to `main`;
    `deploy.yml` runs only by hand. A PR that touches only docs or editor/lint
    config skips the browser steps (`scripts/docs-only.ts`) and reports green.
    Other PRs run only the browser tests their changes reach: main's full
    runs record which files each test loads (`tests/test-map.ts`), and
    `scripts/select-tests.ts` picks the tests from that map, falling back to
    the full suite for anything it can't vouch for. main always runs the full
    suite. A new spec file must call `recordTestMap(test)` like the others.
- Merge gate: nobody pushes to `main`. GitHub merges a PR only when it is up
  to date with `main` and every required check passes (the browser suites
  included), so two PRs that are green alone cannot merge into a red `main`.
  The one exception is the bypass-merge above: a PR that meets all of its
  conditions may merge without waiting for the checks again. The
  `automerge` workflow turns auto-merge on for every PR that is not a
  draft (when it opens or is marked ready). To do it by hand:
  `gh pr merge <n> --auto --merge`, or
  `docs/agents/scripts/land.sh <branch> <worktree> "<message>"`, which pushes,
  opens the PR, turns auto-merge on, waits for the merge and removes the
  worktree and branch. The `auto-update` workflow brings the oldest
  auto-merge PR up to date whenever `main` moves, one at a time; a PR with a
  failing check or a conflict is skipped until it's fixed. A commit that only
  merges `main` into a PR whose browser suites already passed re-runs just the
  fast checks (`scripts/main-merged-only.sh`), so catching up costs minutes.
  Pull your branch (`git pull --no-rebase`) before pushing: the workflow adds
  merge commits.
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

## Issues and pull requests

Work the way a team does: every problem is an issue, every change is a pull
request. Use the `gh` CLI.

- **Search before you file.** `gh issue list --search "<keywords>"` and
  `gh pr list`; comment on an existing issue instead of opening a duplicate.
  Check for another agent's issue, branch or worktree before starting work on
  the same thing.
- **File an issue for anything you find that is not your current task**: a bug,
  a flaky test, a gap in the docs, a CI problem, a follow-up you chose to skip.
  Do not fix it in the same branch. Title it like a Conventional Commit subject
  (`fix(net): ...`), say what you saw, how to reproduce it, which files, and
  what you expect. Add labels (`bug`, `enhancement`, `documentation`,
  `security`, `performance`, and one `area: *`) and assign it to the owner
  (`--assignee dpologdvinity`). Never put secrets in an issue.
- **Work from an issue when one exists**: comment when you start, and
  reference it in the PR description with `Closes #n` (or `Refs #n` if it
  stays open), and in the commit body if you like. The PR then gets the
  issue's labels automatically
  (`pr-labels.yml`), and keeps them in step if the issue's labels change.
  When you finish something that has no issue, the PR is enough.
- **One pull request per branch**, with the Conventional Commit subject as the
  title and `.github/pull_request_template.md` filled in: what and why, how it
  was checked (verify, the touched feature's Playwright tests, screenshots you
  looked at), and the linked issue. Open it as a draft while the work is in
  progress. `docs/agents/scripts/land.sh` can open and land it for you. The
  Claude GitHub Action can't open PRs, so it leaves a branch and the main
  session opens the PR.
- **Reviews and CI**: do not merge a PR with a red check, or with checks that
  never ran (a bypass-merge that meets every condition above is fine), and do not
  push to `main` around CI. Answer review comments with a commit or a reply,
  and resolve the thread. Close issues you have fixed with a comment pointing
  at the commit or PR.
- **Keep them small and current**: split a PR that mixes unrelated changes,
  close issues that are done or no longer true, and delete the branch after
  the merge.

## Code Review Rules

For reviewers (`@codex review`, `@claude`, people): flag these, most serious
first. Formatting and lint are CI's job; don't comment on them.

- Age gating: alcohol, drunk effects, drugs or 18+ venues reachable without
  `ADULT_OK` (`src/client/adult.ts`, `src/game/age.ts`); real alcohol or
  tobacco brands anywhere.
- Trust boundaries: data from the network, the server or `localStorage` used
  without validation; secrets or keys in code, logs or issues.
- Types: `any`, `as` assertions where a type guard or `as const` works, `!`
  non-null assertions.
- Render cost: allocations inside `useFrame`, new real lights past four, or
  meshes that should be instanced (low-tier budget: 250 draw calls, 300k
  triangles).
- Content rules: AI-generated NPC dialogue, or fewer than 10 handwritten lines
  for a situation; an asset missing from `docs/assets.md` and
  `src/game/credits.ts`.
- A new room missing any item of the checklist under Rules.
- Pure logic in `src/game/` without a test, or a bug fix without a test that
  failed before it.
- A code file without its header comment.

## Asset pipeline

- glTF: `npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt --texture-compress webp`
  (on demand, not a dependency). Add
  `--flatten false --palette false --prune-attributes false` when node names,
  material names or UVs matter. Set Blender shape keys to `value = 0` before
  export.
- Blender runs headless:
  `blender --background --factory-startup --python-exit-code 1 --python <script>`.
  Dolls: `build_doll.py` (add `DOLL_SEX=male` for the `-m` files), then
  `bash scripts/optimize-doll.sh`; mocap clips: `art/doll/blender/mocap.py`
  (Mixamo FBX in the git-ignored `mixamo/`).
- Poly Haven: `.venv/bin/polydown`. Kenney, ambientCG and Poly Haven allow
  scripted downloads; itch.io does not, so ask the owner.

## Environment variables

Secrets live in a git-ignored `.env` (loaded by direnv's `.envrc`). Run commands
that need keys through `bash scripts/with-env.sh <command>`; never print `.env`.
Each key and what it's for is in `docs/agents/TOOLS.md`.

| Variable                                                        | Used by                                             |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `MESHY_API_KEY`                                                 | The `meshy` MCP server in `.mcp.json`               |
| `TRIPO_API_KEY`                                                 | `scripts/tripo.sh`                                  |
| `ELEVENLABS_API_KEY`                                            | Offline sound generation (`scripts/gen-sounds.mjs`) |
| `SKETCHFAB_API_TOKEN`, `POLYPIZZA_API_KEY`, `FREESOUND_API_KEY` | Asset search and download                           |
| `GEMINI_API_KEY`, `POLLINATIONS_API_KEY`, `ITCH_API_KEY`        | Optional reference images and owner library         |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `R2_*`         | Owner-approved infrastructure only                  |

## Commits

Focused Conventional Commits, for example `feat(net): add room copy directory`
or `fix(audio): resume suspended context`.
