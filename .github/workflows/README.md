# .github/workflows

GitHub Actions for the repo: the merge gate (CI and browser suites), the auto-merge line, on-demand screenshots, recordings and profiles, security scans and housekeeping. The agent workflow that uses them is in `AGENTS.md` and `docs/agents/README.md`. Heavy work runs here so the owner's machine stays free; most workflows call scripts from [`../../scripts/`](../../scripts/README.md).

## Files

### Merge gate and tests

| File                 | Trigger                          | What it does                                                                                                                                                                              |
| -------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`             | push and PR to `main`; `v*` tags | Install, lint (ESLint, Ruff, markdownlint, knip, headers, dependency rules, spelling), format and type checks, unit tests with coverage, the build; drafts a GitHub release on a `v*` tag |
| `playwright.yml`     | push and PR to `main`; manual    | The browser suites (`browser` shards and `minigames`). Only tests a PR's changes reach run (`scripts/select-tests.ts`); `main` runs everything and records the test map                   |
| `verify.yml`         | push to `ci/**`; manual          | `npm run verify` on GitHub's runners for work branches                                                                                                                                    |
| `browser-test.yml`   | manual (`grep` input)            | Runs Playwright client tests matching a title fragment on any branch                                                                                                                      |
| `nightly-online.yml` | daily cron; manual               | The two-player online suite (`npm run test:e2e:online`) against a local Worker; opens or updates an issue on failure                                                                      |
| `node-min.yml`       | push and PR to `main`            | Unit tests on the minimum Node version in `package.json` `engines`; not a required check                                                                                                  |

### Auto-merge line

| File                       | Trigger                                         | What it does                                                                                                   |
| -------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `automerge.yml`            | PR opened, reopened or marked ready             | Turns on auto-merge for every non-draft PR                                                                     |
| `auto-update.yml`          | push to `main`; every 10 minutes; manual        | Brings the oldest auto-merge PR that fell behind up to date, one at a time (`scripts/next-update.ts`)          |
| `dependabot-automerge.yml` | PR to `main`                                    | Auto-merges Dependabot's grouped npm minor and patch PR; majors and the Actions group wait for a human         |
| `autofix.yml`              | PR to `main`                                    | Formats and applies safe ESLint, markdownlint and Ruff fixes through the autofix.ci app, which pushes a commit |
| `pr-title.yml`             | PR opened, edited, synchronized                 | Fails a PR whose title is not a Conventional Commit; not required                                              |
| `pr-labels.yml`            | PR opened or edited; issue labeled or unlabeled | Copies routing labels from linked issues onto the PR                                                           |
| `auto-assign.yml`          | issue or PR opened                              | Assigns the owner when nothing is assigned                                                                     |
| `claude.yml`               | `@claude` comments, reviews, new issues         | Runs Claude Code for the owner's requests; leaves a branch rather than a PR                                    |

### Screenshots, recordings and profiles

| File                 | Trigger                                                              | What it does                                                                                                      |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `screenshots.yml`    | manual (`shots`, `shards`); reusable                                 | Takes screenshots on any branch and publishes them to the `screenshots` branch                                    |
| `pr-screenshots.yml` | PR touching `src/client/**`, `src/game/**` or the screenshot scripts | Picks shots from the changed files (`scripts/pr-shots.ts`), calls `screenshots.yml` and comments with the links   |
| `record.yml`         | manual (`scene`, `game`, `clicks`, `seconds`, ...)                   | Records an MP4 of a scene or minigame                                                                             |
| `profile.yml`        | manual (`areas`, `sample_ms`); push to `perf/smooth`                 | Frame-time and CPU profile of city areas under SwiftShader (`scripts/perf-profile.ts`)                            |
| `archive-sweep.yml`  | daily cron; manual                                                   | Copies expiring artifacts to permanent releases on `dpologdvinity/daydaze-artifacts` (`scripts/archive-sweep.ts`) |
| `crowd-bake.yml`     | manual (`looks`); push to the crowd bake files                       | Bakes the crowd people, one job per look                                                                          |

### Security and housekeeping

| File                    | Trigger                                            | What it does                                                                              |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `codeql.yml`            | push and PR to `main` (code paths); weekly; manual | CodeQL scanning of TypeScript, JavaScript and the workflows                               |
| `gitleaks.yml`          | push and PR to `main`; weekly; manual              | Secret scan (config in `.gitleaks.toml`)                                                  |
| `dependency-review.yml` | PR changing `package.json` or the lockfile         | Blocks new dependencies with high or critical advisories                                  |
| `actionlint.yml`        | push and PR changing workflows; manual             | Lints the workflow files                                                                  |
| `link-check.yml`        | weekly; manual                                     | Checks links in README, CONTRIBUTING and `docs/`, and keeps one open issue of broken ones |
| `prune-branches.yml`    | weekly; manual (`dry_run`)                         | Deletes stale remote branches that are merged or abandoned                                |
| `deploy.yml`            | manual only                                        | Deploys the Worker and built client to Cloudflare, gated on the `production` environment  |

## Notes

- Never run `deploy.yml` or deploy otherwise without the owner's approval; it needs secrets only the owner provisions.
- Dispatch a workflow with `gh workflow run <file> --ref <branch> -f key=value`.
- A new workflow cannot be dispatched by hand until it is on `main`.
