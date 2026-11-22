# Contributing to Daydaze

Thanks for helping build Daydaze. This page covers the local workflow, the
checks every change must pass, and how commits and pull requests are shaped.
For how the code fits together, read [ARCHITECTURE.md](ARCHITECTURE.md); for
the product and its rules, [docs/VISION.md](docs/VISION.md).

## Setup

- Node.js 22.18 or newer (`.nvmrc` pins 26; `nvm use` picks it up).
- `npm install`
- For the browser tests, once: `npx playwright install chromium`.
- For online play locally:
  `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`.

## Daily workflow

```bash
npm run dev               # client at http://localhost:5173
npm run dev:server        # optional: the Worker on 8787, for ?online=1
```

Useful URL flags: `?quality=low|high|ultra`, `?still=1` (a few frames, for
screenshots), `?debug=1` (room jump buttons), `?online=1`.

Press `` ` `` in the running game for the dev panel: draw calls and FPS,
wireframe, a free camera, jumps to any room, game or event, a live clock, an
object inspector, a scene tree and render controls. It only exists in
development. [docs/dev-tools.md](docs/dev-tools.md) explains each control,
the `__dd` console handles and every URL flag.

## Checks

Run these before you push; CI (`.github/workflows/ci.yml`) runs the same on
every push and pull request to `main` and fails fast. A pull request merges
only when it is up to date with `main` and every required check passes; turn
on auto-merge (the `automerge` workflow does it for every PR that is not a
draft; by hand: `gh pr merge <n> --auto --merge`) and the `auto-update` workflow
keeps it up to date until GitHub merges it.

| Command                 | What it checks                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | ESLint; the rules, and why each is on, are in `eslint.config.mjs`                                                                                                                   |
| `npm run lint:md`       | markdownlint-cli2 on the Markdown docs (rules in `.markdownlint-cli2.jsonc`)                                                                                                        |
| `npm run lint:dead`     | Knip: unused files, exports and dependencies (`knip.jsonc`)                                                                                                                         |
| `npm run lint:headers`  | every code file starts with a header comment                                                                                                                                        |
| `npm run lint:deps`     | dependency-cruiser: the layer rules in `.dependency-cruiser.cjs` (game is pure, no cycles)                                                                                          |
| `npm run lint:spelling` | cspell, American English only; add a legitimate word (a name, a Tagalog dish) to `cspell-words.txt`, one per line in sorted order, and fix real typos and British spellings instead |
| `npm run format:check`  | Prettier (`npm run format` fixes)                                                                                                                                                   |
| `npm run typecheck`     | strict TypeScript for the client, game logic and Worker                                                                                                                             |
| `npm test`              | unit tests (Node's test runner)                                                                                                                                                     |
| `npm run test:coverage` | the same, with a coverage report in `coverage/` and the [coverage minimums](#coverage-minimums) enforced                                                                            |
| `npm run build`         | the production bundle in `dist/`                                                                                                                                                    |
| `npm run verify`        | every check in this table, then the build and the perf budget: the merge gate                                                                                                       |

### Coverage minimums

`npm run test:coverage` fails (and so does the CI test job) when coverage
drops under a floor. It writes `coverage/summary.txt` and `coverage/lcov.info`
first, so the CI "Coverage summary" step still shows the numbers.

- Whole project: Node's native `--test-coverage-lines`,
  `--test-coverage-branches` and `--test-coverage-functions` flags in the
  `test:coverage` script in `package.json` (currently 96 / 92 / 92).
- `src/game/` (the game rules) and `src/net/` (the network protocol): the
  floors in `MINIMUMS` in `scripts/check-coverage.ts`, checked from the lcov
  report because Node's flags only work project-wide. Currently lines 98%,
  branches 94%, functions 96% for `src/game/`, and lines 96%, branches 91%,
  functions 87% for `src/net/`. A directory with no files in the report fails.

The floors sit about a point under the measured numbers, so normal churn
passes and a real drop fails. When you add tests that raise coverage, raise
the matching floor in the same commit (round down, then take one point off),
never lower one to get a change through; to lower a floor, say why in the
pull request.

### Pre-commit hook

`npm install` installs a [lefthook](https://lefthook.dev) pre-commit hook
(`lefthook.yml`; it also works in git worktrees). On staged files only, in
parallel, it runs Prettier `--check` (fix with `npm run format`), ESLint on
`*.{js,mjs,ts,tsx}`, `gitleaks git --staged` and actionlint on staged
workflows. The last two are skipped with a message if the binary is not
installed. It runs no typecheck or tests: CI runs the full checks anyway. In an
emergency, skip it with `LEFTHOOK=0 git commit` or `git commit --no-verify`.

Browser and server suites are slower; run the parts you touched:

- `PORT=5196 npx playwright test -g "<name>" --workers=1` for the client
  (headless WebGL runs on the CPU; a first-load failure under heavy load is
  usually a flake, so rerun it alone once before debugging).
- `npm run test:e2e:online` (two browsers against a local Worker) after
  touching `src/net`, `src/client/net` or `server/`.
- `npm run test:e2e:sw` after touching `public/sw.js` or
  `src/client/serviceWorker.ts`.
- `npm run smoke:server` for the server end to end.
- `npm run build && npm run perf:budget` after adding a dependency or a
  module the entry imports: initial JS must stay under 600 KB gzipped.

## Code standards

- **Rules in `src/game`, drawing in `src/client`.** Game logic is pure
  TypeScript with Node tests; no React or three.js imports there.
- **Tests with every change.** New logic gets unit tests; a bug fix starts
  with a failing test that reproduces it.
- **Strict types.** No `any`, no `as` where a type guard or `as const`
  works, no `@ts-ignore` or lint disables to get green: fix the cause.
- **Header comment on every code file.** `npm run lint:headers` fails on a
  tracked `.ts`, `.tsx`, `.mjs` or `.js` file under `src/`, `server/src/`,
  `scripts/` or `tests/` that doesn't start with `//` or `/*` (after an
  optional shebang).
- **No `new` inside `useFrame`.** ESLint (`no-restricted-syntax`) flags it;
  hoist the object to a module constant or `useMemo`/`useRef`. A one-off
  branch (run once on sit-down, say) may use an
  `eslint-disable-next-line ... -- reason`.
- **Validate untrusted input** (network messages, `localStorage`, saves)
  before using it.
- **Comments.** Every file starts with a comment saying what it's for;
  exported functions, components and types have docstrings; explain the why
  where the code can't.
- **Rendering budget** on the low tier: under 250 draw calls, 300k triangles
  and 4 real lights; allocate nothing inside `useFrame`.
- **Content rules:** all audio is synthesized (no audio files); NPC lines are
  handwritten (no generated dialogue); never use the trademarked doll brand
  name; keep the 18+ venues behind the age gate. American spelling.

## Commits and pull requests

- [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): description`, for example `feat(net): add room copy
directory` or `fix(audio): resume suspended context`. Types: `feat`,
  `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`.
- Small, atomic commits: one logical change each.
- Branches: `feat/<name>`, `fix/<name>` or `docs/<name>`. Rebase on `main`
  before merging; keep `main` green.
- A pull request says what changed and why, how it was tested (commands and
  results), and includes a screenshot for visible changes.
- Never commit secrets (`.env` is ignored) or agent and editor scratch files.
