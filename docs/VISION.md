# Daydaze: Vision and Decisions

Daydaze is a multiplayer social hangout game that brings back the feeling of Club Penguin and Fantage for the people who grew up playing them, now in their late teens and early twenties. The game is rated for 13 and older, with separate 18+ servers for adult content.

The name is a mix of daydream, a buzzed daze, and "the good old days".

## The one-line pitch

GTA meets IMVU meets Fantage: an open city you drive, explore and get into trouble in (GTA), where you dress up and hang out with people in glam 3D spaces (IMVU), with the dress-up, minigames, pets and cosy nostalgia of the games you grew up on (Fantage).

## Who it is for

- Players who grew up on Club Penguin and Fantage, now in their late teens and twenties; open to everyone 13 and older.
- Not for children under 13 (no accounts under 13, so no COPPA data from children).

## What it feels like

- An adult social nightlife hangout in the spirit of IMVU and Habbo: lounges, clubs, bars, VIP rooms, dressed-up avatars, neon interiors, people posing and chatting.
- Maximalist: dense, layered scenes, rich color, ornament, glow and constant small ambient motion.
- Avatars are glam fashion dolls: oversized head, huge lined eyes, big glossy lips, slim long-limbed body, platform shoes. Never use the name or logo of the doll brand that inspired them (it is a trademark of MGA Entertainment).
- Places to hang out plus a variety of minigames.
- Pet lions and a subtle lion theme are optional and low priority.
- Subtle mango references wherever they fit.
- No AI-generated dialogue.

## Age tiers

Decided 2026-10-26 (replaces the 16+ main world of 2026-10-14):

- 13+ servers (the default): the whole city and its games, dress-up, pets, sports, nightlife venues as dance clubs. Bars serve mocktails and sodas; no alcohol, no drunk effects, no weed, shrooms or 18+ venues. Teen safety applies: chat filter, block, mute and report, moderation.
- 18+ servers: the same city plus alcohol with drunk effects, Green Haze (weed and shrooms), the strip club and the other 18+ venues. Suggestive, no nudity. Only age-checked players 18 and older can join; under-18s can never join an 18+ server, so teens never share chat or rooms with 18+ content.
- Age confirmation is deferred. When it ships: birthdate entered at signup and locked, stored only on the server; under 13 cannot create an account; 18+ servers unlock on the player's 18th birthday.
- Rule: no 18+ content (alcohol, drugs, 18+ venues) reaches real players before the age check and 18+ servers ship; until then it stays behind the development flag.
- Drinks, venues and brands in the game are made up; no real alcohol or tobacco brands.

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
