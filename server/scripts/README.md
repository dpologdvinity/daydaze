# server/scripts

Scripts for exercising the Worker locally.

## Files

| File        | What it does                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smoke.mjs` | End-to-end check against a throwaway local `wrangler dev`: two guests join one room copy and see each other's join, movement and chat. Run with `npm run smoke:server`; it never touches Cloudflare |
