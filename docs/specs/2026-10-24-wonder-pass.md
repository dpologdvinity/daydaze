# Spec: the wonder pass (2026-10-24)

Seven tracks that take Daydaze from "a lot of features" to "a place people
love and come back to". Each track has a goal, the player-facing result,
requirements, and how we know it's done. The order of work is in
[the plan](../plans/2026-10-24-wonder-pass.md).

The bar for every track is the owner's rule: every aspect full of wonder,
nothing half-done. A feature is not finished until it looks, sounds and
feels right in the 3D world, works on the low tier, has tests, and has been
seen in a screenshot.

## Shared definitions

- **In-world game:** a game whose action happens in the 3D room: the doll
  animates, the room reacts (props, particles, lights, NPCs), and sound
  follows the action. A side panel may show the score and controls, never
  the game itself.
- **Done (all tracks):** unit tests for the rules, a Playwright test for the
  flow, low-tier budget held (< 250 draw calls, < 300k triangles, ≤ 4 real
  lights), `npm run verify` green, a screenshot reviewed, reduced-motion
  respected, keyboard and touch playable, and docs updated.

---

## Track 1. In-world games

**Goal.** Every game built as a panel becomes an in-world game.

**Games and what "in-world" means for each:**

| Game | Where | Doll | Room reacts | Sound |
|---|---|---|---|---|
| Karaoke | Karaoke Loft stage | walks to the mic, sings pose loop, sways on the beat | lyric-free note lanes on the big screen, stage lights pulse per hit, booth NPCs cheer on streaks | backing track whose beat drives the chart (BPM from the jukebox); each hit plays the melody note |
| Beach volleyball | city beach net | dig and spike clips | a ball arcs over the net (physics-lite parabola), two NPC opponents move and dig, sand puffs | thump on contact, crowd on a kill, surf bed |
| Pool volleyball | Water Park pool | waist-deep in the water | same as beach, with splashes | splash on contact |
| Cliff dive | Water Park tower | climbs, performs the trick (rotation keyed to the trick), enters the water | splash size follows the entry grade, a judge NPC holds up a score card | wind whoosh, entry splash scaled by grade |
| Speed slide | Water Park slides | rides the slide (existing `startRide`) with a tuck pose at bends | a rival NPC rides the twin slide; bend markers flash on time | rush loop, whoosh per tuck, splash finish |
| Water-gun battle | Water Park pool | holds a water gun, aims | floaties bob on the pool; hit floaties spin and splash | squirt and splash sounds |
| Cook-off | Kamayan Hall kitchen | stands at the stove, chops/stirs per ingredient | ingredients appear in the wok/plate as added, steam, a rival cook at the next stove (or the online rival's doll) | sizzle, chop, a gong for the result |
| Target range | Photon Zone range lanes | holds a light pistol or rifle | glowing targets slide on lanes, hits burst into light | zap, hit chime |
| Haunted escape | Haunted House | walks room to room | each depth is a different room set; wrong doors trigger an in-world scare (a doll head turns, candles out, a sheet slides) | creaks, a stinger on scares |

**Requirements.**
- New doll animations (Mixamo first, `mocap.py` retarget; hand-keyed poses
  in `moves.ts` where no clip fits): dig, spike, dive (pencil, swan,
  backflip, twist), tuck, sing, stir/chop, aim pistol, aim rifle.
- Props built as instanced, low-poly meshes with emissive materials; no new
  real lights.
- The engines stay pure in `src/game/`; a per-game scene component reads the
  session store and animates.
- Karaoke chart generated from the jukebox track's tempo so notes land on
  the beat; the chart and the audio share one clock.
- Camera: each game has a camera shot (`CameraRig.tsx`).

**Done when** each game above passes the shared definition of done and a
player can play it without looking at the side panel except for the score.

---

## Track 2. Real players

**Goal.** Daydaze is live on the internet, safely.

**Owner-blocked prerequisites** (tracked in `STEPS-FOR-OWNER.md`): GitHub
billing, the D2 age-gate design, the D1 deploy approval, a domain,
Cloudflare secrets.

**Requirements.**
- **Age gate (D2):** birthdate at signup, stored and locked server-side;
  under 16 can't sign up; 18+ unlocks automatically; guests never see 18+
  rooms. Server checks every 18+ room join.
- **Deploy (D1):** `.github/workflows/deploy.yml` with the owner's secrets,
  D1 migrations, `ALLOWED_ORIGINS`, measured PBKDF2 cost, smoke test against
  production.
- **Online on by default** once deployed (`?online=0` to opt out).
- **Landing page:** a fast static page (no 3D) with screenshots, a short
  pitch in the brand voice, and "Play" (no account needed).
- **Share links:** `/?join=<room>.<copy>` opens straight into a friend's room
  copy; a "Copy invite link" button on the room card.
- **Onboarding:** first visit walks the player through name, quick doll
  pick (3 presets plus "customize"), walking, the city map, and one game, in
  under a minute, skippable.

**Done when** a stranger can open the URL on a phone, play as a guest within
a minute, send a friend a link that drops them in the same room copy, and
the 18+ area is unreachable for anyone under 18.

---

## Track 3. Fast to playable

**Goal.** A first visit is interactive within 5 s on a mid phone on 4G, and a
return visit within 2 s.

**Requirements.**
- **Interactive lobby:** while the world streams, the player is already in a
  lightweight scene (the Plaza at low detail, or a 2D lobby) with chat and
  the closet working.
- **Shader warm-up:** compile the common materials during the loading veil
  (`gl.compile`) so the first frames don't stall.
- **Dialogue split:** the 202 KB of NPC lines load lazily (`loadDialogue()`,
  like `loadMocap`), prefetched at idle.
- **Service worker:** cache-first for hashed assets, models and textures;
  network-first for HTML; versioned cache names; no caching of `/api` or
  `/ws`.
- **Asset diet:** shrink the low-poly hair GLBs (some are 180–290 KB);
  texture sizes per tier.
- **Budgets enforced in CI:** initial JS (gzip) < 600 KB, Downtown cold
  transfer < 5 MB, measured by a script in CI.

**Done when** the lab numbers (Fast 4G, mid-phone CPU throttle) meet the goal
in three runs, and CI fails if the budgets regress.

---

## Track 4. Reasons to come back

**Requirements.**
- **Event calendar:** a weekly schedule of club nights (Pride night, Y2K
  night, Latin night, chiptune night) and city events, visible on the city
  map with countdowns; events change music, lights and NPC lines.
- **Collections:** a photo album (places visited, snapshots from Take a
  photo), closet sets with a reward for completing one, a sticker book for
  game grades.
- **Apartment visits online:** your apartment becomes a per-owner room copy
  (`apartment.<ownerId>`); friends can visit when the door is unlocked.
- **Server economy (A5) and leaderboards:** coins and bests move to D1 with
  server-validated awards (a score is accepted only from a server-known game
  session with plausibility checks); weekly leaderboards per game.

**Done when** a player has a different thing to do each day of the week and
a visible reason to return tomorrow (a streak, an event countdown, an
unfinished set).

---

## Track 5. Deeper social play

**Requirements.**
- **Multiplayer games over the relay:** karaoke duet (alternating lines,
  combined score), beach volleyball 2v2 (two players per side, the server
  relays hits; host-authoritative rally), races against friends (shared seed
  and start time).
- **Piggyback emote:** the follower's doll attaches to the lead's back bone
  with a carry pose; both move as one.
- **Passengers:** friends ride in your car (a seat on the car, the driver's
  moves carry the passenger).
- **Party invites:** invite friends to a room copy; a party sticks together
  through doors.
- Every multiplayer interaction respects block and mute.

**Done when** two friends can sing a duet, play 2v2, race and ride together,
verified by the online Playwright spec.

---

## Track 6. Doll diversity (B7)

**Requirements.**
- **Hair:** locs, box braids (strand), cornrows, bantu knots, twist-out,
  puffs, buzz cut, shaved sides, bald, edges/baby hair.
- **Bodies:** a wider body range, including plus-size, that every outfit
  fits (shape keys).
- **Head and accessories:** hijab, head wrap, turban, bindi, hearing aids.
- **Skin:** vitiligo, birthmarks; monolid eye option.
- **Mobility:** a wheelchair (model plus seated locomotion) usable in every
  room, and prosthetics.
- All parts go through `art/doll/blender/` and `scripts/optimize-doll.sh`,
  with low-poly twins.

**Done when** each item is pickable in the closet, renders correctly with
every outfit, and the lineup page shows them all.

---

## Track 7. Faster, sturdier tests

**Requirements.**
- **Cloud CI** runs the browser suite on every PR once billing is fixed
  (sharded, with retries only for known-flaky first loads).
- **Deterministic clocks** for timed tests (dance-off, events) so a slow
  machine can't miss a window.
- **A GPU-backed option** for local runs if one becomes available; until
  then, keep `--workers=1` under load.

**Done when** the full browser suite runs green in CI on a PR with no reruns
in five consecutive runs.

---

## Open questions for the owner

1. Karaoke: original melodies only (procedural), or covers of public-domain
   tunes?
2. Volleyball 2v2: is host-authoritative (one player's client decides
   rallies) acceptable, or must the server decide?
3. Leaderboards: global or per-friend-group first?
4. Landing page: same domain (`/`) with the game at `/play`, or the game at
   `/` with a separate marketing site?
5. Event calendar themes: which nights matter most to you?
