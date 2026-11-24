# server/src

Pure, framework-free server logic: request routing and validation, rate limits, passwords and sessions, room rules, directory rules and progress grading. Everything here runs in Node tests; the Cloudflare-specific adapters that use these modules are in [`worker/`](worker/README.md). Shared game rules come from `src/game/` and the wire protocol from `src/net/`.

## Files

| File                                                | What it does                                                                                                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes.ts` (+ `routes.test.ts`)                    | Maps an HTTP method and path to a typed route: the fixed `/api` endpoints, a room's copy list, and room or apartment WebSockets. Unknown rooms and bad copy numbers match nothing |
| `validation.ts` (+ `validation.test.ts`)            | Validates every request body, socket attachment and query parameter, returning typed values or null                                                                               |
| `security.ts` (+ `security.test.ts`, `csp.test.ts`) | Allowed-origin parsing and checks, and the security headers applied to every response; `csp.test.ts` checks the CSP in `public/_headers`                                          |
| `cookies.ts` (+ `cookies.test.ts`)                  | The `dd_session` cookie: name, 30-day lifetime, attributes and reading the token back                                                                                             |
| `sessions.ts` (+ `sessions.test.ts`)                | Random session tokens, their SHA-256 digests for D1, player ids and crypto-random numbers                                                                                         |
| `passwords.ts` (+ `passwords.test.ts`)              | PBKDF2 password hashing and verification at the Workers iteration ceiling, and password length rules                                                                              |
| `rateLimit.ts` (+ `rateLimit.test.ts`)              | Token-bucket limiter and the named budgets (movement, chat, login, reports and more)                                                                                              |
| `authLimits.ts` (+ `authLimits.test.ts`)            | Rate limits for auth and sensitive actions, by IP address and by player                                                                                                           |
| `chatFilter.ts` (+ `chatFilter.test.ts`)            | Slur filter for chat and usernames; general swearing stays allowed                                                                                                                |
| `roomCore.ts` (+ `roomCore.test.ts`)                | Rules of one room copy: joining and capacity, area-of-interest visibility, position clamping, chat, emotes, game relays, blocks, kicks, bans and recent chat for reports          |
| `directoryCore.ts` (+ `directoryCore.test.ts`)      | Which room copies to list from their head counts, and which to join                                                                                                               |
| `progressCore.ts` (+ `progressCore.test.ts`)        | Grades client-reported scores and visits with the game's own rules, caps daily XP, and feeds the weekly boards                                                                    |
| `progressStore.ts` (+ `progressStore.test.ts`)      | The D1 side of progress: load and seed rows, write graded results with weekly rows, read boards; tested on in-memory SQLite                                                       |

## Subfolders

- [`worker/`](worker/README.md): the Worker entry and Durable Object adapters.
