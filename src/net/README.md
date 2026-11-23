# src/net

The network protocol and shared data shapes for multiplayer. The room server, validators and in-memory loopback live here as pure TypeScript with no browser APIs; the Cloudflare Worker in `server/` and the browser client in [`client/`](client/README.md) both import them, so the two sides agree on every message.

## Files

| File                                               | What it does                                                                                                                                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `networkProtocol.ts` (+ `networkProtocol.test.ts`) | The wire protocol: limits, WebSocket close codes, and the client and server message types (join, leave, update, chat, home, emote, game relay, snapshots and deltas) with their validators.                                                      |
| `roomNetworkSync.ts` (+ `roomNetworkSync.test.ts`) | The `NetworkTransport` interface, an in-memory spatial room server (`SpatialRoomServer`) that validates every message and sends snapshots, deltas and occupancy, a loopback pair for tests, and entity interpolation for drawing remote players. |
| `identity.ts` (+ `identity.test.ts`)               | Who a session belongs to, as the server reports it, with a validating parser.                                                                                                                                                                    |
| `friends.ts` (+ `friends.test.ts`)                 | The friends list shape from `GET /api/friends`: mutual friends with their room copy, incoming and outgoing requests. Shared by the Worker and the client.                                                                                        |
| `mutes.ts` (+ `mutes.test.ts`)                     | Players you have muted, kept in this browser only and validated on load.                                                                                                                                                                         |
| `progress.ts` (+ `progress.test.ts`)               | What the server says about an account's progress (totals, what a score paid, weekly boards), validated before use.                                                                                                                               |

## Subfolders

| Folder                        | What it holds                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------ |
| [`client/`](client/README.md) | The framework-free browser client: online session, socket, API calls and sync. |

## Notes

- Treat everything from the network as untrusted: validate before use. Threat model and known gaps are in `docs/security.md`.
