# Contributing to Daydaze

Thanks for helping build Daydaze. This page covers the local workflow, the
checks every change must pass, and how commits and pull requests are shaped.
For how the code fits together, read [ARCHITECTURE.md](ARCHITECTURE.md); for
the product and its rules, [docs/VISION.md](docs/VISION.md).

## Setup

- Node.js 22.18 or newer (`.nvmrc` pins 24; `nvm use` picks it up).
- `npm install`
- For the browser tests, once: `npx playwright install chromium`.
- For online play locally:
  `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`.

## Daily workflow

```bash
npm run dev               # client at http://localhost:5173
npm run dev:server        # optional: the Worker on 8787, for ?online=1
```

Useful URL flags: `?quality=low|high`, `?still=1` (a few frames, for
screenshots), `?debug=1` (room jump buttons), `?online=1`.

## Checks

Run these before you push; CI (`.github/workflows/ci.yml`) runs the same on
every push and pull request to `main` and fails fast.

| Command | What it checks |
| --- | --- |
| `npm run lint` | ESLint: TypeScript and React hooks rules |
| `npm run format:check` | Prettier (`npm run format` fixes) |
| `npm run typecheck` | strict TypeScript for the client, game logic and Worker |
| `npm test` | unit tests (Node's test runner) |
| `npm run test:coverage` | the same, with a coverage report in `coverage/` |
| `npm run build` | the production bundle in `dist/` |
| `npm run verify` | lint, tests, types, format and build together |

Browser and server suites are slower; run the parts you touched:

- `PORT=5196 npx playwright test -g "<name>" --workers=1` for the client
  (headless WebGL runs on the CPU; a first-load failure under heavy load is
  usually a flake, so rerun it alone once before debugging).
- `npm run test:e2e:online` (two browsers against a local Worker) after
  touching `src/net`, `src/client/net` or `server/`.
- `npm run test:e2e:sw` after touching `public/sw.js` or
  `src/client/serviceWorker.ts`.
- `npm run smoke:server` for the server end to end.

## Code standards

- **Rules in `src/game`, drawing in `src/client`.** Game logic is pure
  TypeScript with Node tests; no React or three.js imports there.
- **Tests with every change.** New logic gets unit tests; a bug fix starts
  with a failing test that reproduces it.
- **Strict types.** No `any`, no `as` where a type guard or `as const`
  works, no `@ts-ignore` or lint disables to get green: fix the cause.
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
