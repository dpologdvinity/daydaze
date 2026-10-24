# Plan: the wonder pass (2026-10-24)

Implements [the spec](../specs/2026-10-24-wonder-pass.md). Tasks are ordered
so each one ships on its own (merge on green), the highest-value player
experience comes first, and owner-blocked work waits on
`STEPS-FOR-OWNER.md` without stalling anything else. Sizes: S < half a day,
M about a day, L several days.

Every task follows the spec's definition of done: unit tests for rules, a
Playwright test for the flow, low-tier budget, `npm run verify`, a reviewed
screenshot, reduced motion, keyboard and touch, docs updated. A code review
(`superpowers:requesting-code-review`) closes each phase.

## Phase 0. Foundations (do first, unblock everything)

| # | Task | Size | Notes |
|---|---|---|---|
| 0.1 | Deterministic event clocks for tests | S | Dance-off and event clocks take a fixed `?t=` start so slow loads can't miss a window; fix the flaky dance-off test. |
| 0.2 | Animation pipeline check | M | Search `./mixamo` for dig, spike, dive, tuck, sing, stir, aim; list gaps; add found clips to `MIXAMO_CLIPS`, rerun `mocap.py`. Hand-key the rest in `moves.ts`. |
| 0.3 | In-world game kit | M | `src/client/rooms/shared/game3d/`: a ball (parabola + bounce), splash and burst particles (instanced), a score-card prop, a camera-shot helper, a "doll plays clip X" hook. Unit-test the pure motion maths in `src/game/`. |
| 0.4 | Dialogue split | S | `loadDialogue()` like `loadMocap`; prefetch at idle; `pickLine` returns `"..."` until loaded (tests await it). |

## Phase 1. In-world games (Track 1)

Order by how often players see them. Each game is one task; each ends with
its engine untouched (already tested) and a new scene component.

| # | Task | Size | Depends on |
|---|---|---|---|
| 1.1 | Karaoke on stage: mic walk-up, sing loop, note lanes on the big screen, chart from the track's tempo on one shared clock, stage lights per hit, cheering NPCs | L | 0.2, 0.3 |
| 1.2 | Beach volleyball: ball arcs, two NPC opponents, dig and spike clips, sand puffs, camera | L | 0.3 |
| 1.3 | Pool volleyball: the beach scene reused in the pool, splashes | S | 1.2 |
| 1.4 | Cliff dive: tower climb, trick rotations, graded splash, judge card | M | 0.2, 0.3 |
| 1.5 | Speed slide: ride the slide with tuck poses, rival on the twin slide, flashing bend markers | M | 0.3 |
| 1.6 | Water-gun battle: floaties on the pool, aim with the doll, hit spin and splash (replaces the Gallery dialog) | M | 0.3 |
| 1.7 | Cook-off at the stove: chop and stir clips, ingredients appear in the wok, steam, rival cook (NPC or the online rival) | M | 0.2 |
| 1.8 | Target range lanes: light pistol and rifle, sliding targets, light bursts (replaces the Gallery dialog) | M | 0.3 |
| 1.9 | Haunted escape in the house: a room set per depth, in-world scares | L | 0.3 |

## Phase 2. Fast to playable (Track 3)

| # | Task | Size |
|---|---|---|
| 2.1 | Shader warm-up during the loading veil (`gl.compile` on common materials) | S |
| 2.2 | Interactive lobby while the world streams (chat, closet live; low-detail Plaza) | M |
| 2.3 | Service worker: cache-first hashed assets, models, textures; network-first HTML; skip `/api` and `/ws`; versioned caches; update prompt | M |
| 2.4 | Asset diet: re-simplify low-poly hair, per-tier texture sizes | M |
| 2.5 | Perf budgets in CI: a script that builds, measures initial JS and Downtown cold transfer, and fails over budget | S |

## Phase 3. Real players (Track 2) — gated on the owner

| # | Task | Size | Gate |
|---|---|---|---|
| 3.1 | Landing page (static, screenshots, Play as guest) | M | domain decision (open question 4) |
| 3.2 | Share links `/?join=<room>.<copy>` and "Copy invite link" | S | none |
| 3.3 | First-visit onboarding (name, preset doll, walk, map, one game; skippable) | M | none |
| 3.4 | Age gate: birthdate at signup, server-locked, 16+ signup, auto 18+, server checks on 18+ joins | L | D2 design approval |
| 3.5 | Deploy: secrets, D1, migrations, PBKDF2 measurement, production smoke test | M | D1 approval, billing, secrets |
| 3.6 | Online on by default after deploy (`?online=0` opts out) | S | 3.5 |

## Phase 4. Social play (Track 5)

| # | Task | Size |
|---|---|---|
| 4.1 | Party invites: a party sticks together through doors | M |
| 4.2 | Passengers in your car | M |
| 4.3 | Piggyback emote (attach to the back bone, carry pose) | M |
| 4.4 | Race friends (shared seed and start time) | M |
| 4.5 | Karaoke duet (alternating lines, combined score) | M (after 1.1) |
| 4.6 | Beach volleyball 2v2 (host-authoritative rally; see open question 2) | L (after 1.2) |

## Phase 5. Coming back (Track 4)

| # | Task | Size |
|---|---|---|
| 5.1 | Event calendar: weekly club nights on the map, themed music, lights and NPC lines | M |
| 5.2 | Collections: photo album, closet sets with rewards, a sticker book | M |
| 5.3 | Apartment visits: per-owner room copies, friends visit when unlocked | M |
| 5.4 | Server economy (A5): coins and bests in D1, server-validated awards | L (after 3.5) |
| 5.5 | Weekly leaderboards | M (after 5.4) |

## Phase 6. Doll diversity (Track 6)

Blender work in `art/doll/blender/`, one part family per task, each with a
low-poly twin and a closet entry.

| # | Task | Size |
|---|---|---|
| 6.1 | Textured hair: locs, box braids, cornrows, bantu knots, twist-out, puffs | L |
| 6.2 | Short hair: buzz cut, shaved sides, bald, edges | M |
| 6.3 | Body range including plus-size, with outfit shape keys | L |
| 6.4 | Head and accessories: hijab, head wrap, turban, bindi, hearing aids | L |
| 6.5 | Skin and face: vitiligo, birthmarks, monolid option | M |
| 6.6 | Wheelchair (model and seated locomotion everywhere) and prosthetics | L |

## Phase 7. Tests (Track 7)

| # | Task | Size |
|---|---|---|
| 7.1 | Browser suite on PRs in CI (sharded), once billing is fixed | S |
| 7.2 | Flake sweep: deterministic clocks and state waits everywhere | M |

## Running order

Phase 0 → Phase 1 (1.1, 1.2 first) with Phase 2 tasks interleaved between
games → Phase 4.1–4.3 → Phase 5.1–5.3 → Phase 6 → Phase 3 and 5.4/5.5 as soon
as the owner unblocks them → Phase 7 when CI can run.

## Tracking

`docs/plans/2026-10-23-next-steps.md` stays the running list; each finished
task here is marked there with its commits. Owner-only items live in
`STEPS-FOR-OWNER.md`.
