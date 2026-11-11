# Agent workflow log

How the owner's rules for running coding agents on Daydaze evolved, oldest
first. Each entry is a rule the owner gave (quoted where it was said out loud),
why it exists and how the lead session applies it. The rules in force are
folded into `AGENTS.md` and `agent-rules.md`; this log keeps the reasoning and
the order they were learned in. Later entries supersede earlier ones where
they conflict (for example, the agent limit grew from 2 to 4).

## 2026-10-14: Full repo autonomy

User (2026-10-14): "u dont need control to commit, merge, or push. u are in full control of this repo. u may do whatever u need and install/activate anything necessary (if safe)".

**Why:** user wants momentum, not approval prompts.
**How to apply:** in ~/git/daydaze, commit/merge/push to origin main without asking. Deploying to Cloudflare (wrangler deploy/login) still not mentioned — ask first. `git push origin main` works (first blocked by the auto-mode classifier, allowed after the user re-granted).

## 2026-10-15: Fewer agents, long commands in the background

User (2026-10-15): "it would be faster if u stopped using the agents and did everything in the main chat", then "if ur running a command thats gonna take a long time, make it a task or have an agent do it / but dont have more than 2 agents at once".

**Why:** agent startup, thinking overhead and merge collisions made 4-8 parallel agents slower than one focused thread; blocking foreground commands stall the chat.
**How to apply:** do feature work inline. Run long commands (verify, Playwright, screenshots, builds) with `run_in_background` and keep working. Agents only for side jobs (setup, long checks), never more than 3 at once ("u can have up to three agents if necessary"). Old feature agents were stopped; their work is wip commits on feat/<name> branches in .worktrees/. No CPU core limit. Full Playwright suite runs in GitHub Actions; locally run only the touched feature's tests. Merge each branch as soon as it passes.

## 2026-10-16: Keep working between items

User (2026-10-16): "why did u stop working" / "keep working. whenever u finish working on something, move onto a new thing. build the world."

**Why:** ending a turn after a report stalls the project; the user checks in occasionally and expects progress meanwhile.
**How to apply:** after committing one feature, pick the next from the user's queue or the roadmap (docs/plans/2026-10-14-master-roadmap.md) and keep going in the same turn. Report briefly between items without stopping. Only stop for genuinely blocking decisions (paid Meshy calls, deploys, destructive git).

## 2026-10-24: Perfection and wonder

Strive for perfection and greatness: every aspect should be full of wonder and spectacular. Never half-ass anything. Every code file needs a header comment and docstrings on exports; the repo needs proper documentation.

**Why:** stated 2026-10-24 as the user's number one rule after an overnight run of lean, panel-only game slices.

**How to apply:** prefer the full experience (3D, sound, feel) over panel-only slices when building features; flag honestly when something is a stopgap. Add/keep a file header + export docstrings in every file touched.

## 2026-10-26: Up to four agents

Owner (2026-10-26): "u can have up to three sonnet agents running at a time", then "u can have up to 4 agents running (if it makes things faster) lets develeop faster", and "u can have agents building while u plan and tell them what to do".

**Why:** speed. The earlier 1-agent limit (2026-10-17) was for machine load (load average ~40 with 3 agents + Playwright).
**How to apply:** at most 4 concurrent agents (Sonnet for builds); main session plans and directs. Still only one Playwright run at a time across all agents. Supersedes the 2026-10-15 agent limit.

## 2026-10-26: The lead manages, agents build in worktrees

Owner (2026-10-26): "u shouldve have an agent work on trees. i think this would be a lot faster if u just manage the agents and they work... in worktrees... u can merge the worktrees/branches and assign new tasks to them. do whatever u think will be fastest and most cost-efficient, while ensuring quality".

**Why:** speed; several agents build at once while main reviews.
**How to apply:** main session plans, dispatches up to 4 agents (`agent-limit`) each on a `.worktrees/<name>` + `feat/<name>` branch, reviews their screenshots/diffs, merges on green, assigns the next task. Keep small glue edits inline. Serialize browser runs with `flock /tmp/daydaze-pw.lock` (one Playwright/screenshot at a time); each agent uses its own Vite port.

## 2026-10-26: Download, don't build

Owner: "before building something in 3d, you should first search the internet for it" and again 2026-10-26: "why are u trying to build stuff when u can download it from online and tweak them?"

**Why:** downloaded models look far better than procedural boxes ("looks like legos") and are faster to get.
**How to apply:** every agent task brief says download-first (poly.pizza direct GLB, Kenney, Quaternius, ambientCG, Poly Haven, Sketchfab CC0/CC-BY, opengameart, owner's packs in /tmp/daydaze-city). Code = placement, animation, logic, glue. Procedural only if nothing exists, and the report says what was searched. Shared brief: /tmp/daydaze-agent-rules.md.

2026-11-07 owner: "actually use the stuff I gave you … look through it all." Before any 3D/animation work, check docs/asset-inventory.md (inventory of ~/downloads/game, hair, animals and the mixamo/ library with a use plan) and prefer those assets; owner was frustrated they sat unused.

## 2026-10-26: Internet resources allowed

The owner said (2026-10-26): "u can find resources on the internet to use. u can research things / look things up. if u need any files from the internet, download them."

**Why:** procedural-only assets looked like legos; they want real variety and texture.
**How to apply:** search for and download CC0/permissive assets (Poly Haven, ambientCG, Kenney, Quaternius, Poly Pizza, Sketchfab CC0/CC-BY with credit, Mixamo for animations) and reference material; keep licenses compatible and credit CC-BY in docs. Still never deploy without asking.

## Clean up as soon as you are done

When done with anything cached or temporary, delete it right away: build outputs (dist), Playwright test-results/reports and /tmp outputs, throwaway scripts, screenshots not committed, idle dev servers and browsers, merged worktrees and branches.

**Why:** User wants machine resources freed promptly (disk, RAM, CPU).

**How to apply:** After each task: kill servers you started, remove temp files and test-output dirs, `git worktree remove` + delete merged branches. Tell subagents to do the same.

## Codex models and effort

Owner: Codex models allowed: gpt-6.1-sol, gpt-6.1-terra, gpt-6-sol, gpt-6-luna (cheapest). Effort low or medium only. Pick model + effort per task. Run 2-3 Codex agents at once.

**Why:** cost. **How to apply:** `codex exec -m <model> -c model_reasoning_effort=<low|medium> ...` (default config is gpt-6.1-sol high: always override). Mechanical/bounded tasks: gpt-6-luna or gpt-6-sol low; feature work with 3D integration: gpt-6.1-terra medium; hardest: gpt-6.1-sol medium.

## 2026-11-07: Free opencode models for small tasks

opencode 1.18.7 at ~/.local/bin/opencode. Run: `opencode run -m opencode/<model>-free --dir <worktree> "<task>"` (model via -m; Google's suggested runner script was broken). Free models: beam-free, deepseek-v4.1-flash-free, flint-40b-free, glm-5.3-flash-free, mimo-v2.6-flash-free, nemotron-3-ultra-free, nemotron-3.5-lightning-free, nemotron-3.5-super-vl-free.

Test (CI action upgrade, same brief): glm-5.3-flash-free did it fully (right versions, ran actionlint, committed, useful note). deepseek-v4.1-flash-free made the right edits but its actionlint download failed and it didn't commit. nemotron-3-ultra-free: "Model is unavailable".

**How to apply:** give them small, verifiable tasks in their own worktree; always re-verify (tags, lint, tests) before merging. Not for big features.

## 2026-11-07: Sonnet-only agents, save tokens

Spawn subagents on Sonnet only (not Opus). Save tokens without lowering quality: do cheap mechanical work (rebase/verify/merge chains) in background bash instead of agents, keep agent count modest. Codex is out of usage until 2026-11-10: don't use it before then.

**Why:** owner wants to stretch usage; Claude agents share one usage limit and all ran out together twice on 2026-11-06.
**How to apply:** prefer merging what exists over starting new features so the owner sees progress; related `codex-models`, `manage-agents`.

## 2026-11-07: Heavy work moves to GitHub Actions

2026-11-07: the local /tmp/daydaze-pw.lock (one CPU-rendered browser at a time, 12 cores saturated) bottlenecked every agent for hours; owner said "do something to deal with the bottlenecks" and "automate things". Fix: `.github/workflows/browser-test.yml` (input grep) and `screenshots.yml` (input shots, artifact "screenshots") run on free GitHub runners (public repo), ~2 min each, in parallel. Agents push feature branches and dispatch them.

**How to apply:** brief every agent with this (docs/agents/agent-rules.md has the commands); keep local browser runs as a last resort; merges via /tmp/land.sh (backup docs/agents/scripts/).

Also 2026-11-07: owner asked for a fix that doesn't require stopping their own work. verify.yml runs `npm run verify` on GitHub (~1.5 min vs ~10 min local) for pushed feat/fix/perf/ci branches; /tmp/land.sh rebases, pushes ci/land-<w>-<sha>, waits for that run, merges. Local heavy work only under `nice -n 19`.

Free offloading (owner 2026-11-07: "anything that makes things faster as long as it's FREE"): the owner's downloads are uploaded as release files to the private repo dpologdvinity/daydaze-assets (releases "packs", "hair", "animals"; `gh release download <tag> -R dpologdvinity/daydaze-assets -p '<file>'`); Mixamo FBX library is the private repo dpologdvinity/mixamo. CORRECTION 2026-11-07: Agent `isolation: "remote"` silently falls back to a LOCAL worktree (.claude/worktrees/agent-*) here — it does NOT offload CPU. Keep agents light: renice the session (`renice -n 19 -p <claude pid>`; children inherit), push heavy work (verify, browsers, profiling) to GitHub workflows, local Blender/gltf-transform only under nice -n 19, one Blender at a time.

## 2026-11-07: Never kill a process you didn't start

On 2026-11-07 the city agent killed an unknown "pt_main" process at ~325% CPU while cleaning up its own profiler: almost certainly the owner's own PyTorch job. The owner uses this machine alongside the agents.

**Why:** killing an unknown process can destroy the owner's work; there's no undo.
**How to apply:** brief every agent: kill only PIDs you launched and recorded ($!); never `pkill -f`, never kill for CPU usage. Rule is in docs/agents/agent-rules.md.
