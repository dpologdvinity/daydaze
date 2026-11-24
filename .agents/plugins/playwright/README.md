# .agents/plugins/playwright

An Antigravity plugin that gives the agent the Playwright MCP server for driving a browser. It is one of the plugins listed under `.agents/plugins/` in `AGENTS.md`; the tools agents have are inventoried in `docs/agents/TOOLS.md`.

## Files

| File | What it does |
| --- | --- |
| `plugin.json` | The plugin manifest: name `playwright`, version `1.0.0` and a one-line description |
| `mcp_config.json` | Starts the `playwright` MCP server through `npx -y @playwright/mcp@latest` |

## Notes

- This is separate from the project's own Playwright tests in `tests/`; those run through the `npm run test:e2e*` scripts.
