# .agents/plugins/daydaze-3d

An Antigravity plugin that gives the agent browser and three.js debugging MCP servers for the 3D game. It is one of the plugins listed under `.agents/plugins/` in `AGENTS.md`; the tools agents have are inventoried in `docs/agents/TOOLS.md`.

## Files

| File | What it does |
| --- | --- |
| `plugin.json` | The plugin manifest (its name, `daydaze-3d`) |
| `mcp_config.json` | MCP servers it starts through `npx`: `chrome-devtools` (attached to a Chrome with remote debugging on `127.0.0.1:9222`) and `threejs-devtools-mcp` (project scope) |

## Notes

- `chrome-devtools` needs a Chrome already running with remote debugging on port 9222; start it yourself, and stop it when done.
