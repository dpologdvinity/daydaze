# src/net/client

The framework-free browser client for online play. `src/client/` joins rooms through `OnlineSession.ts` (only with `?online=1`; offline the game stays single-player). It uses the protocol and validators in [`../`](../README.md) and talks to the Worker's `/api` and `/ws` routes.

## Files

| File                                                     | What it does                                                                                                                                 |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `OnlineSession.ts` (+ `OnlineSession.test.ts`)           | The online session: joins a room copy, sends movement at 12 Hz, interpolates remote players 100 ms in the past and reports its status.       |
| `WebSocketTransport.ts` (+ `WebSocketTransport.test.ts`) | Wraps an injected WebSocket as a `NetworkTransport` that reconnects with jittered backoff and stops for good on final close codes.           |
| `backoff.ts` (+ `backoff.test.ts`)                       | Reconnect delay: exponential with jitter, capped. Pure.                                                                                      |
| `connectionNote.ts` (+ `connectionNote.test.ts`)         | The HUD line explaining why online play is reconnecting, offline or closed, with a message per final close code.                             |
| `api.ts` (+ `api.test.ts`)                               | Typed client for the Worker's `/api` routes. Every response is validated and a call never throws; it resolves to an `ApiResult`.             |
| `saveSync.ts` (+ `saveSync.test.ts`)                     | Uploads a signed-in player's save a few seconds after the last change, so a burst of edits is one upload.                                    |
| `progressSync.ts` (+ `progressSync.test.ts`)             | Glue between the local save and the server-owned progress: adopt the server's XP and title, retry a busy server, and word the results. Pure. |
| `fakes.ts`                                               | Test doubles: a scriptable socket (`FakeSocket`) and manual timers (`FakeTimers`).                                                           |

## Notes

- Sockets and timers are injected, so everything is tested in Node with the fakes and no network.
