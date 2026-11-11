# How Daydaze is built with agents

Daydaze is built by AI coding agents directed by one human owner. The owner
sets direction, taste and hard rules; a lead agent session plans the work,
briefs parallel build agents, reviews their output by eye and merges it; CI
does the heavy lifting. This folder is the playbook.

## The loop

1. **Owner sets direction.** Product decisions live in `docs/VISION.md`; the
   roadmap and each work pass in `docs/plans/` (milestones, then dated plans
   such as the wonder pass or "smooth and alive").
2. **The lead plans.** One session reads the current handoff
   (`docs/plans/*-handoff.md`), splits the next items into independent
   branches and decides which can run in parallel without touching the same
   files.
3. **Agents build in isolation.** Up to four build agents run at once, each in
   its own git worktree (`.worktrees/<name>` on `feat/<name>`, `node_modules`
   symlinked from the main checkout), all briefed with the same rules:
   [`agent-rules.md`](agent-rules.md).
4. **CI does the heavy work.** Agents push their branch; GitHub Actions runs
   the merge gate (`verify.yml`), targeted Playwright tests
   (`browser-test.yml`) and screenshots (`screenshots.yml`), so the owner's
   machine stays free.
5. **The lead reviews by eye.** Every screenshot is looked at and judged
   against the owner's quality bar; work below it goes back to the agent.
6. **Land on green.** [`scripts/land.sh`](scripts/land.sh) rebases the branch
   onto `main`, re-verifies it on GitHub, merges `--no-ff`, pushes and removes
   the worktree.
7. **Hand off.** At the end of a session the lead writes the next handoff, so a
   fresh session picks up with no lost context.

## What is here

| Path | What it is |
| --- | --- |
| [`../../AGENTS.md`](../../AGENTS.md) | Canonical project rules for every agent (Claude Code, Codex, Antigravity, opencode) |
| [`agent-rules.md`](agent-rules.md) | The brief every build agent gets: asset pipeline, budgets, CI commands, process safety |
| [`workflow-log.md`](workflow-log.md) | The owner's workflow rules in the order they were learned, with the reason for each |
| [`TOOLS.md`](TOOLS.md) | MCP servers, plugins, CLIs and API keys available to agents |
| [`scripts/`](scripts/) | `land.sh` (merge on green), `keepboth.sh` and `union_assets.py` (additive conflict helpers) |
| [`investigations/opencode/`](investigations/opencode/) | A benchmark of free opencode models on small coding tasks |
| [`../plans/`](../plans/) | Roadmap, dated plans, the running gotchas log and session handoffs |
| [`../../.agents/skills/`](../../.agents/skills/) | Vendored third-party skills (sources in `NOTICE.md`) |

## Lessons that shaped it

- Parallel agents only pay off with isolation: separate worktrees, separate
  dev-server ports and a strict "edits to shared files stay small and
  additive" rule.
- Agents must not load the owner's machine. Verify, browsers and profiling
  moved to GitHub's runners; local Blender and glTF work runs under `nice`, one
  Blender at a time.
- Download, don't build: agents produced "lego" geometry until every brief
  required searching for free CC0/CC-BY assets first.
- Screenshots beat claims. A green test suite says nothing about how a scene
  looks, so every visual change is reviewed from images.
- Process safety is a hard rule after an agent killed one of the owner's own
  jobs: agents kill only PIDs they started.
