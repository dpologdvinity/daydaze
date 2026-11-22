# Recurring NPCs remember the player (#223)

## Goal

Staff and regulars who stand in a venue (`TalkingNpc` with `greet`) greet a
returning player differently from a stranger, and use their name once they have
met a couple of times.

## Design

- **Memory** (`src/game/npcMemory.ts`): per NPC, `{ visits, last }`: the number
  of distinct days the player met them, and the last day (`dayOf`). Keyed by
  `npcKey(venue, name)`, a lowercase slug like `piercing:vix`.
- **Greeting rule** (`greetingFor`): no record, or the first meeting still
  going today, is `greeting-first`; seven or more days since `last` is
  `greeting-returning`; anything else is `greeting-regular`. A role that lacks
  the warmer situation falls back to the colder one (`greeting-returning`, then
  `greeting-regular`, then `greeting-first`, then tapped, then idle).
- **Name** (`nameFor`): from the second visit day on, counting the arrival
  itself, `context.name` is the player's name; before that the placeholder
  keeps its neutral fallback ("friend").
- **Save**: `SaveV1.npcs`, an additive field. `cleanNpcMemories` drops any
  malformed entry, clamps numbers, and keeps at most `MAX_NPCS` records (the
  most recently met), so a hand-edited or runaway save cannot grow without
  bound. It belongs to the player: it travels with their save (including the
  account's cloud save, which has room for it at 150 short records) and is
  never shown to other players or sent into a room.
- **Wiring**: `TalkingNpc` reads `npcDesk` (a store the app mirrors from the
  save), says the greeting, then posts the meeting; the app folds it into the
  save through `meet`, as `shiftDesk` does for paid shifts.
- **Lines**: handwritten `greeting-regular` and `greeting-returning` banks
  (10+ lines each) for the cashier and server roles, and `greeting-returning`
  for the bartender, which already has `greeting-regular`.

## Not in this change

Perks at high familiarity and reacting to what the player did lately: filed as
follow-up issues.
