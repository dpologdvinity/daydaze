# Daydaze

A multiplayer social hangout game for people who grew up on Club Penguin and
Fantage. Dress up a doll avatar, hang out in neon lounges and clubs, drive the
city, and play minigames with friends.

Not intended for children.

## What's in it

- **A night city** of eight neighborhoods, streamed in chunks, with traffic,
  doors into about 65 rooms, fireworks over the beach and a Pride parade on
  the boardwalk. Drive your own car (12 models, wraps, rims, underglow,
  tint, a horn, a radio and headlights), fill up at gas stations.
- **Places**: clubs and bars (Pulse, The Skylark, Sugar Rush, Bassline,
  Karaoke Loft, La Noche, Player 2, a speakeasy), restaurants, shops and the
  Starlight Galleria, a zoo, an aquarium, a water park, an amusement park,
  a speedway, sports venues, a marina, your apartment and a jail.
- **Games**, each with prizes, personal bests and daily challenges: bowling,
  tennis, mini golf, skate, surfing, Skee-Ball, curling, fishing, laser tag,
  paintball, races, counter games (ramen, sushi, boba, halo-halo, a Filipino
  cook-off), a karaoke rhythm game, cliff dives, a speed slide, beach and
  pool volleyball, a haunted house escape, the Midway and arcade cabinets.
- **A semi-realistic 3D doll** built in Blender, with a face and body closet,
  outfits, shoes, piercings, makeup, walk styles, dances and pronouns.
- **Online** (guests and accounts with cloud saves, shared rooms, chat with
  a strict filter option, friends, block, mute and report, Crazy Eights,
  couple emotes like hugs and slow dances, cook-offs) on a Cloudflare Worker
  with Durable Objects and D1. It's behind `?online=1` and not deployed yet.

All music and sound is synthesized in the browser. NPC lines are handwritten.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): how the code is laid out and fits
  together.
- [docs/VISION.md](docs/VISION.md): the product, audience and tone.
- [docs/plans/2026-10-23-next-steps.md](docs/plans/2026-10-23-next-steps.md):
  what's done and what's next.
- [docs/security.md](docs/security.md): threat model and known gaps.
- [docs/deploy.md](docs/deploy.md): deploying the Worker.
- `docs/specs/`: design specs.

## Develop

Requires Node.js 22.18 or newer (`.nvmrc` pins 24).

```bash
npm install
npm run dev               # client at http://localhost:5173
npm test                  # unit tests (game rules, protocol, server)
npm run typecheck         # strict TypeScript, including the Worker
npm run verify            # tests, typecheck, format check and build
npm run test:e2e:client   # Playwright browser tests (slow: software WebGL)
npm run test:e2e:online   # two browsers against a local Worker
npm run smoke:server      # the server end to end
```

URL flags: `?quality=low|high` forces a quality tier, `?still=1` renders a
few frames and stops (for screenshots), `?debug=1` shows room jump buttons,
`?online=1` turns on online play.

### Online locally

```bash
npx wrangler d1 migrations apply DB --local --config server/wrangler.jsonc
npm run dev:server        # builds, then wrangler dev on port 8787
npm run dev               # in another terminal; Vite proxies /api and /ws
```

Then open `http://localhost:5173/?online=1`.

## Contributing

- Keep rules in `src/game` (pure, tested) and drawing in `src/client`.
- Add or update tests with every change; for a bug, write the failing test
  first. Run `npm run verify` and the browser tests for what you touched.
- Every file starts with a comment saying what it's for; exported functions
  and components have docstrings.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/),
  small and focused: `feat(net): add room copy directory`.
- Validate anything from the network or `localStorage` before use. Keep the
  18+ venues behind the age gate.
