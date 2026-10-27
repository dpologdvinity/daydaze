# Daydaze: Vision and Decisions

Daydaze is a multiplayer social hangout game that brings back the feeling of Club Penguin and Fantage for the people who grew up playing them, now in their late teens and early twenties. It is not a kids' game.

The name is a mix of daydream, a buzzed daze, and "the good old days".

## The one-line pitch

GTA meets IMVU meets Fantage: an open city you drive, explore and get into trouble in (GTA), where you dress up and hang out with people in glam 3D spaces (IMVU), with the dress-up, minigames, pets and cosy nostalgia of the games you grew up on (Fantage).

## Who it is for

- Players who grew up on Club Penguin and Fantage, now 16 and older.
- Not intended for children.

## What it feels like

- An adult social nightlife hangout in the spirit of IMVU and Habbo: lounges, clubs, bars, VIP rooms, dressed-up avatars, neon interiors, people posing and chatting.
- Maximalist: dense, layered scenes, rich color, ornament, glow and constant small ambient motion.
- Avatars are glam fashion dolls: oversized head, huge lined eyes, big glossy lips, slim long-limbed body, platform shoes. Never use the name or logo of the doll brand that inspired them (it is a trademark of MGA Entertainment).
- Places to hang out plus a variety of minigames.
- Pet lions and a subtle lion theme are optional and low priority.
- Subtle mango references wherever they fit.
- No AI-generated dialogue.

## Age tiers

- Main world: 16+. Bars, clubs and nightlife with drinks are part of the main world.
- 18+ area: strip club and weed lounge. Suggestive, no nudity.
- Age confirmation is deferred. When it ships: birthdate entered at signup and locked, under 16 cannot create an account, the 18+ area unlocks automatically on the player's 18th birthday, and the birthdate is stored only on the server.
- Rule: 18+ venues must not go live to real players before the age gate ships.

## Platform

- Web game.
- Multiplayer on Cloudflare Workers, Durable Objects and D1. See `docs/specs/2026-10-14-online-foundation-design.md`.
- $0 hosting until real players arrive. Expected scale is 50 to 500 concurrent players at first.
- Anonymous guest play, plus optional accounts.
- Coins and purchases stay client-owned until trading or online leaderboards exist.

## Renderer: 3D (decided 2026-10-14)

Two throwaway prototypes of the same neon lounge were compared: 3D in the style of IMVU, and 2D in the style of Club Penguin and Fantage. The 2D version was polished but felt too flat, so Daydaze is 3D:

- React Three Fiber and three.js world, orbit camera, click-to-walk.
- Code-built fashion-doll avatar: doll proportions, toon shading with outlines, painted face layers (eyes, brows, lips, makeup) from `art/doll/`, tintable code-built hair and outfits, plus select hair and accessories generated with image-to-3D tools and auto-rigged.
- Minigames may stay as 2D overlays launched from the 3D world.
- The network protocol moves from 2D `x, y, heading` to a 3D position and rotation.

## What came from Club Lion

- `src/net/`: the network protocol and room server, with tests.
- `src/audio/`: procedural Web Audio synthesis (shared audio bus, instruments, jukebox), with tests. Sound files are allowed too (owner, 2026-10-26) where synthesis falls short: ambience, effects, voices.
- `art/doll/`: the layered 2D doll art (skin-tone bases, hair, brows, lips, makeup, clothes, jewelry) and its browser compositor (`art/doll/compositor.html`).
- `docs/specs/`: the online foundation design.
