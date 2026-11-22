# Trivia, game-show and murder-mystery nights (#216)

Scheduled nights run on the event-night system in `src/game/events.ts`, with a
host NPC and handwritten lines. This spec covers the first slice, trivia night,
and records what follows.

## Slice 1: trivia night (this PR)

Trivia night already exists as a weekly night (Tuesdays, Cellar 214 and the
Skate-Up Diner): the music, glow and the regulars' talk. What it lacked was
anything to do. Now, while it is on:

- A quiz host stands in each club (`TRIVIA_HOSTS` in `src/game/triviaNight.ts`).
  Tapping them says a line from the DJ role's `event-trivia-night` bank.
- A glowing pad in front of the host opens Throwback Trivia as a hosted round
  (`hostedTrivia`). The questions, clock and payout are the cabinet's; the
  host welcomes you, reacts to every answer and says a closing line by score
  (`src/minigames/trivia/host.ts`, five banks of ten or more handwritten lines).
- Off the night there is no host, no pad and no keyboard button (`hotspotsIn`
  takes the clock and hides a night's spots otherwise).

No save changes: a hosted round pays through the existing trivia grade payout,
and the night's attendance already earns fame XP (`rewardVisit`). Nothing here
touches alcohol; the host and lines are all-ages.

## Follow-ups

- Game-show night: a buzzer-and-wheel format in the Hotel Rooftop.
- Murder-mystery night: a handwritten clue script, suspects as NPCs, an
  accusation at the end, in the Back Room.
- Trivia night teams and a scoreboard shared between players online.
- A double-points final question, and a themed bank per week.
