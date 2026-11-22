# Hunger and thirst (#221)

## Why

The food rooms, street vendors and vending machines relieve a need that only
weed created (#274). #221 wants everyone to feel a soft pull toward them.

## Decisions

- Builds on `src/game/food/needs.ts`: one `Needs` pair (`hunger`, `thirst`,
  each 0 to 1) for every player, 13+ included. No new store, no new relief
  path: held food, quick snacks, street food and vending drinks already go
  through `consumeFood`.
- **Build rate:** hunger fills in 30 minutes of play, thirst in 20, so a
  session notices them once or twice. Weed's munchies and dry mouth are an
  adult-only extra rate on top (unchanged: `felt / 120` and `felt / 90` per
  second). Needs no longer fade on their own: only food and drink relieve them.
- **Effects, all gentle:** past 0.6 the walk eases down to 90% at full; the
  HUD (`FoodHud`) shows a "Hungry" / "Thirsty" heading with two meters and a
  hint toward a snack or Plate Rush; eating or sipping when hungry toasts a
  handwritten line. Nothing blocks movement, rooms or minigames.
- **Alcohol** still never relieves thirst and stays behind `ADULT_OK`; drinks at
  13+ are mocktails and sodas.
- **No save change.** Needs live in memory like the buzz, so a reload starts
  fed. Persisting them (and the careers/progress saves other work touches) is
  left out on purpose.
- Not built: a look change (flushed or tired doll) when a need is high.
