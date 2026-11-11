# Tools available to agents (as of 2026-11-07)

Agent-only notes. Re-check with `claude mcp list` and `/plugin` (Claude),
`.codex/config.toml` (Codex) or `.agents/plugins/daydaze-3d/` (Antigravity)
when something seems missing; update this file when the owner changes them.

## MCP servers

| Server | Use | Notes |
|---|---|---|
| `threejs-devtools-mcp` | inspect the live three.js scene: scene tree, draw-call breakdown, materials, textures, instanced meshes, skeletons, perf snapshot | point it at the dev server (`set_dev_port`); LIVE PREVIEW tools change the browser only, never source. Claude, Codex and Antigravity |
| `chrome-devtools` | live Chrome on 127.0.0.1:9222: perf traces, console, network, screenshots | Claude, Codex and Antigravity |
| `context7` (plugin + standalone) | library docs (three, drei, R3F, Vite, Playwright…) | duplicate entries, harmless |
| `meshy` | AI 3D generation | Claude only; costs the owner credits: ask first; subscription ends ~2026-11-16 |

Browser tests use the repo's Playwright (`npm run test:e2e:*`), not an MCP server.

## Plugins

- User scope on: superpowers, code-review, code-simplifier, codex, commit-commands,
  context7, github, intelligent-compact, playground, ponytail, pyright-lsp,
  security-guidance, caveman.
- User scope off: feature-dev, pr-review-toolkit (for whole-branch reviews use
  the `code-review` plugin or a `general-purpose` agent with the
  superpowers code-reviewer prompt).
- Project: typescript-lsp only.

## Project skills (`.agents/skills/`, linked from `.claude/skills/`)

three-best-practices, r3f-best-practices, threejs-asset-pipeline,
threejs-shaders, threejs-3d-generator (Tripo), threejs-audio-generator
(ElevenLabs). Reinstall others from the sources in `skills-lock.json`.

## Other tools

- `.venv/bin/polydown`: Poly Haven downloads (`hdris`, `textures`,
  `models -mf gltf`, `-s 1k`, `-f <folder>`).
- `blender` 5.x at `blender` (batch: `--background --factory-startup --python`).
- gltf-transform via `npx -y @gltf-transform/cli@4.5.1` (flags in CLAUDE.md).
- Downloads: Kenney, ambientCG, Poly Haven direct; itch.io (Quaternius) blocks
  scripts — ask the owner. Owner zips: `~/downloads/game/`.

## External agent sessions (2026-10-26)

- Codex: plugin `codex` (agent `codex:codex-rescue`, `/codex:setup` ready, ChatGPT login). Headless build tasks: `codex exec -s workspace-write -c sandbox_workspace_write.network_access=true --add-dir ~/git/daydaze/.git --add-dir /tmp --add-dir ~/git/daydaze/node_modules -C <worktree> - < task.md` (owner says use `codex --yolo`, the alias of `--dangerously-bypass-approvals-and-sandbox`; Claude Code's auto-mode classifier blocked that on 2026-10-26 until the owner adds a Bash permission rule for it, so the sandboxed form is the fallback).
- Antigravity: plugin `cc-gemini-plugin` (agent `cc-gemini-plugin:gemini-agent`). Use its bridge, not raw `agy --print` (print mode can't approve edits): `node ~/.claude/plugins/cache/cc-gemini-plugin/cc-gemini-plugin/2.0.0/skills/gemini-integration/scripts/gemini-bridge.mjs --cwd <worktree> --format stream-json --timeout 5400 -- "<task>"`. Its Claude models hit the account quota on 2026-10-26 (resets ~2026-10-31), and Gemini 3.8 Flash hit it the same evening (resets ~2026-10-31 too). Quota was back on 2026-11-06 (models: gemini-3.8-flash-high/medium/low, claude-sonnet-4-6, claude-opus-4-6-thinking, gpt-oss-120b-medium; pick with `--model`). Its long runs tend to stall waiting on backgrounded commands: give it bounded tasks and tell it to run commands in the foreground.
- Give each its own worktree and Vite port; they read `docs/agents/agent-rules.md` (download-first, flock browser runs).

## API keys in .env (owner-added 2026-10-26; git-ignored, never print or commit)

- `GEMINI_API_KEY`: Google Gemini API (concept sheets, texture, decal and sky references). Paid per call: use sparingly; ask the owner before bulk use.
- `TRIPO_API_KEY`: Tripo 3D generation (`scripts/tripo.sh`). Costs credits: ask the owner first. Free downloads come first.
- `ELEVENLABS_API_KEY` (owner plan, 2026-10-26): 40k credits/month; Sound Effects, Music, Voice Design, TTS, Speech to Text, Dubbing, Image & Video; all endpoints. Use for ambience, sound effects, music beds and (owner-approved) voiced lines. Budget: keep a running tally of credits spent per task in its report; generate once, save the files under public/audio/ (compressed, e.g. Opus/OGG or MP3 at modest bitrate), never call the API at runtime. The threejs-audio-generator skill covers the workflow.
- `POLLINATIONS_API_KEY` (owner-added 2026-10-26): Pollinations.ai image/text generation; optional, not needed so far.
- `MESHY_API_KEY`: Meshy premium bought 2026-10-16; the owner cancels before the next renewal (~2026-11-16). 2,680 credits left on 2026-10-26, lost at cancellation: propose worthwhile uses before then, ask before spending. Costs: text/image-to-3D 20-35, rig 5, animate 3 per action.
- `POLYPIZZA_API_KEY` (owner-added 2026-10-26, in `.env` and `.envrc`): `GET https://api.poly.pizza/v1.1/search/<query>` with header `x-auth-token`; results carry Title, Creator, Licence and a GLB Download URL; `/v1.1/model/<id>` for one model.
- `FREESOUND_API_KEY` (owner-added 2026-10-26): Freesound APIv2 text search with `token=`; CC0 previews (HQ MP3/OGG) download with the token; originals need OAuth. Prefer real CC0 recordings, ElevenLabs when nothing fits.
- `ITCH_API_KEY` (owner-added 2026-10-26): itch.io server-side API (`https://itch.io/api/1/<key>/...`): lists the owner's own uploads and purchases (`my-owned-keys`); it does not download arbitrary free packs, so free itch.io packs still need the owner unless they are in the owner's library.
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT` (owner-added 2026-10-26): Cloudflare and R2 credentials. Standing rule unchanged: never deploy, publish, upload to R2 or change Cloudflare resources without the owner's explicit approval for that action. Possible future use (ask first): host large assets (models, audio) on R2 instead of in the repo.
- `SKETCHFAB_API_TOKEN` (owner-added 2026-10-26, in `.env` and `.envrc`): scripted Sketchfab downloads. `GET https://api.sketchfab.com/v3/models/<uid>/download` with `Authorization: Token <token>` returns a temporary glTF zip URL. CC0/CC-BY only (check `license`); never NC/ND/Standard. Credit CC-BY in docs/assets.md + credits.ts.
- `tripo3d` 1.0.0 Python SDK is installed in the repo's uv `.venv` (owner, 2026-10-26): `.venv/bin/python -c "import tripo3d"`; uses `TRIPO_API_KEY`. Costs credits: ask first.
- ElevenLabs CLI: `npx -y @elevenlabs/cli@latest onboard ...` (key read from `.env`; it made `.env` owner-only readable). Never print the env file; verify with `onboard check`.

## Packages and tools added 2026-10-26

- `@three.ez/instanced-mesh` (MIT): InstancedMesh2 with per-instance frustum culling, LOD and sorting: use it for trees, furniture, crowds and facades instead of plain InstancedMesh with `frustumCulled = false`.
- `three-mesh-bvh` (MIT): BVH-accelerated raycasts/collisions (walking, cars, pets, camera).
- `@elevenlabs/elevenlabs-js` (dev): offline sound/music generation (`scripts/gen-sounds.mjs`).
- KTX-Software 4.4.2 in `~/.local/opt/ktx` (`toktx`, `ktx` on PATH via `~/.local/bin`): KTX2/Basis GPU textures, e.g. `npx -y @gltf-transform/cli@4.5.1 etc1s in.glb out.glb` or `uastc`; three needs `KTX2Loader` with the basis transcoder (drei `useGLTF` accepts it).
- ffmpeg (Homebrew) for audio transcoding.
- `cloudflare` SDK: npm (devDependency, 7.3.0) and Python (in the uv `.venv`), owner-installed 2026-10-27, for future R2/infra scripts. Any call that creates, uploads, deploys or changes Cloudflare resources needs the owner's explicit approval first.
- `scripts/with-env.sh <command>`: runs a command with the .env keys loaded (owner permission rule in .claude/settings.json).
