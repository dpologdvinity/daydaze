# Substances (18+ tier): design

Status: approved direction from the owner on 2026-11-17 ("more natural movement;
a doll should only look like it's on something when it is; add more
substances; research it so it's accurate"). Research with sources:
`docs/research/substances.md`. Everything here exists only at the adult tier
(`allows(tier, "drugs")`, `src/game/age.ts`), today the dev-only `?adult=1`.

## Principles

1. **Sober looks sober.** A sober doll never plays the busy loops (checking over
   both shoulders, wiping a brow, the bouncy happy idle). Those loops, and every
   substance's body language, play only while a meter is felt.
2. **Accurate, then compressed.** Each item's timeline is the researched real one
   (onset, come-up, peak, comedown, in real minutes). It is squeezed into play
   time by one curve for every substance:
   `gameSeconds = 20 × realMinutes^0.6`. This keeps every substance's order and
   proportions: nitrous is over in under a minute, cocaine in a few, a trip
   lasts longest. It also keeps the short ones playable and the long ones from
   eating a whole session. Examples: a 3 min balloon lasts 39 s, 1 h of cocaine
   lasts 3.9 min, a 7 h edible lasts 12.5 min, a 10 h tab lasts 15.5 min.
3. **Phases, not just a level.** Bodies change with the phase. Mushrooms make you
   yawn in the come-up. Molly makes you gurn at the peak. Cocaine crashes into a
   sniffing, irritable comedown. Each dose has a curve: nothing during onset, a
   smooth rise (come-up), a plateau (peak), then a smooth fall (comedown).
   Doses of one substance add up, capped at 1. A delayed onset is real and is
   gameplay: an edible that hasn't landed is the classic redose trap.
4. **Body language is mostly calm loops plus occasional one-shot tics.** Under a
   substance the doll plays that substance's loops at its pace (`rate`). About
   half of the 11 s idle slots open with one _tic_ (a yawn, a laugh, a sniff)
   played once, never looped. A looped yawn is exactly the "looks weird"
   problem this work fixes.
5. **Screen effects follow the real perception and skip the myths.** Weed gives
   a faint glow, not hallucinations. Cocaine gives no visual distortion. Ketamine
   gives double, choppy vision and a far-away room, not a psychedelic swirl.
   Nothing flashes faster than 3 Hz, and reduced motion keeps colors but stops
   movement.

## Code shape

- `src/game/effects/substances.ts` (pure, tested) holds:
  - `DOSES`: each menu item's substance, strength and real timeline.
  - `gameSeconds`, `doseLevel`, `phaseOf`, and `readMeters` (doses taken, now →
    per-substance level and phase).
  - `BODY` (substance × phase → loops, tics, rate), plus `strongest` and
    `highParams` (the screen look).
- `src/client/effects/high.ts` keeps the doses taken and the play clock.
  `take(dose)` is gated on `allows(tier, "drugs")`. The dev panel (`?debug=1`)
  can skip ahead a minute.
- `src/game/dance/idlePlan.ts` `bodyIdle()` picks loop or tic from `BODY`.
  `pickClip` takes the doll's `body`, and `HumanDoll` passes it for the
  player's doll from the live meters; a peer's doll gets `under` (the substance
  from the move action's `^x` tag, `peerAction.ts`) and stands at its peak body.
- `src/client/effects/DrunkPost.tsx` holds the post passes; each substance adds
  its uniforms to `DrunkEffect`. Acid also adds `TracerEffect`: it keeps two
  ping-ponged history targets (`max(current, old * 0.86)`) and draws one extra
  fullscreen quad only while acid is felt (high tier only).

## The plan, one worktree each (merge, delete, then the next)

| #   | Worktree          | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `substance-model` | The model above; weed (joint, edible) and mushroom tea retuned to the research; the drugs gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2   | `alcohol`         | Done: the buzz is blood alcohol (`game/effects/buzz.ts`). A drink absorbs over 35-50 real minutes (a fizzy cocktail fastest, a neat shot slowest, slower and lower after food). The liver clears a steady 0.015% an hour, and water doesn't speed it up. Each effect starts at its researched BAC: warm colors at once, the view's sway (nystagmus) from 0.06, body sway from 0.08, slurred chat from 0.10, double vision from 0.12. The body goes tipsy, then drunk, then sloppy, and a hangover (glare, yawns) follows a night past 0.08; water eases it. Alcohol's clock is linear (the liver works by the hour), matched to the shared curve at 90 minutes (×18). Drunk idle/walk clips need Mixamo (owner).                  |
| 3   | `acid`            | Done: LSD tab (`tab`, ~100 µg, 15.5 min of play, the longest). Come-up yawns, then an energetic, exploring peak (an idle rate above 1), then a wired-but-tired tail. The screen gets radiant color (saturation plus a little contrast), mushrooms' breathing and hue drift at lower depth, faint six-fold hue bands round the edge (`geometry`) and afterimage `tracer`s. Reduced motion keeps the color and drops the bands, breathing and tracers. Acid's tinny, echoing sound is an open audio issue.                                                                                                                                                                                                                          |
| 4   | `molly`           | Done: MDMA pill (`pill`, 80-120 mg, 10 min of play). Tingly come-up, a dancing, swaying peak (idle rate 1.1, dance clips as tics), a low tired tail. The screen gets neon glow and radiance, mild tracers (below acid's) and a tiny ~1 Hz eye `wiggle` (nystagmus); no geometry, since it is not a psychedelic. Her own doll opens her eyes wide, smiles (the `smile` key), gurns (the `gurn` key, grinding about once a second; held still under reduced motion) and her pupils blow wide (the eye shader's `uPupil`) (#76). Reduced motion keeps the color and drops tracers and wiggle. Hugging, rubbing arms and shivering clips need new doll assets (tracked in a GitHub issue). Sweating, thirst and heat belong to row 8. |
| 5   | `cocaine`         | Done: a line (`line`, 30-60 mg, 4.5 min of play, the shortest). A restless come-up, a fast-talking, gesturing, upright peak (idle rate 1.2, social emotes as tics) and a flat, irritable crash. No screen effect at all (no distortion at normal doses); her own doll opens her eyes wide (no smile), her pupils widen and her jaw clenches at half molly's strength (#76). A second line stacks (the redose urge). Sniffing and nose-wipe clips (#91) and walking faster (#90) are tracked in issues; the craving and stacked-dose anxiety belong to row 8.                                                                                                                                                                      |
| 6   | `ketamine`        | Wobbly, high-stepping walk, blank stare, slow; double/choppy vision, room stretching; a strong dose is a k-hole (sit or lie, can't move)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 7   | `nitrous`         | A balloon: seconds to peak, sudden sway so she sits, slack face, then a laugh; wah-wah phaser sound, muffled audio, tunnel blur                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 8   | `substance-hints` | In progress: weed toasts done (cotton mouth, edible redose warning, start-low advice, weed + alcohol combo, panic tip). Molly water and heat, no ket or GHB with drink, and remaining combination effects next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Candidates for later (one line each in the research): poppers (fits the queer
clubs), 2C-B, speed, mephedrone, nicotine (smoking-area spot, no brands),
caffeine and energy drinks (also fine at 13+). GHB is the drink-spiking drug;
leave it out unless the owner asks.

Missing clips the research calls signature, which need Mixamo downloads by the
owner (see `STEPS-FOR-OWNER.md`): drunk idle, drunk walk, sniffing or nose rub,
rubbing eyes, dizzy or stumbling idle.
