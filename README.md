# Daydaze

A multiplayer social hangout game for people who grew up on Club Penguin and Fantage. Dress up a doll avatar, hang out in neon lounges and clubs, drive the city, and play minigames with friends.

Not intended for children.

## Status

A 3D game built with React Three Fiber: a streamed night city of eight neighborhoods with traffic and your own car, about 65 rooms (clubs, bars, restaurants, shops, a mall, parks, a zoo, an aquarium, a water park, an amusement park, a speedway, sports venues, an apartment and a jail), dozens of scored minigames with prizes and daily challenges, and a Blender-built 3D doll with a full closet. Online play (guests and accounts, shared rooms, chat, friends, block, mute and report, two-player cards) runs on a Cloudflare Worker with Durable Objects and D1. It is behind `?online=1` and not deployed yet.

See [docs/VISION.md](docs/VISION.md) for the product, [docs/plans/2026-10-23-next-steps.md](docs/plans/2026-10-23-next-steps.md) for what comes next. Working notes for coding agents live in a local, untracked `CLAUDE.md`.

## Develop

Requires Node.js 22.18 or newer (`.nvmrc` pins 24).

```bash
npm install
npm run dev            # client at http://localhost:5173
npm test               # unit tests
npm run verify         # tests, typecheck, format check and build
npm run test:e2e:client  # Playwright browser tests (slow: software WebGL)
```

Online locally: `npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc`, then `npm run dev:server` beside `npm run dev`, and open the client with `?online=1`.
