# src/game/dialogue

Handwritten NPC line banks, one file per role, and the picker that chooses a line. NPCs in `src/client/` call `pickLine` (`pick.ts`); the banks load as a separate chunk through `loadDialogue()`.

## Files

| File                         | What it does                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                   | The vocabulary: role ids (`ROLE_IDS`), situations, time of day, neighborhoods, placeholders and the shapes of lines, conditions and banks.                          |
| `index.ts`                   | Registry of every role's bank (`LINE_BANKS`). A missing bank is a type error.                                                                                       |
| `pick.ts` (+ `pick.test.ts`) | Picks a line for a role and situation: falls back to tapped, then idle; filters by venue, neighborhood, time and age tier; avoids recent lines; fills placeholders. |
| `content.test.ts`            | Checks every role has the required situations, enough lines, known placeholders only, and no banned brands, slurs or drug words.                                    |

The role banks, each `<role>.ts`:

| Area               | Files                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bars and clubs     | `bartender.ts`, `bouncer.ts`, `regular.ts`, `club-dancer.ts`, `dj.ts`, `coat-check.ts`, `orbit.ts` (Orbit 9 club; spread into the role banks)                                                      |
| Weekly nights      | `eventNights.ts`, `eventNights2.ts` (regulars, DJs and hosts for the nights in `../events.ts`)                                                                                                     |
| Shops and food     | `cashier.ts`, `guard.ts`, `server.ts`, `florist.ts`, `stylist.ts`, `nail-tech.ts`, `street-food-vendor.ts`, `produce-vendor.ts`                                                                    |
| Parks and outdoors | `bandleader.ts`, `gardener.ts`, `hiker.ts`, `lifeguard.ts`, `swimmer.ts`, `snack-cashier.ts`, `ticket-cashier.ts`, `carnival-barker.ts`, `cotton-candy-vendor.ts`, `ride-operator.ts`, `potter.ts` |
| Streets and travel | `pedestrian.ts`, `motorist.ts`, `taxi-driver.ts`, `dealer.ts`, `police.ts`, `captain.ts`, `crew.ts` (yacht), `pit-crew.ts` (Speedway)                                                              |

## Notes

- Dialogue is handwritten, never AI-generated. Each situation needs 10 or more lines; venue lines use `when: { venue: "<room-id>" }`.
- Read banks through `pickLine`, never directly.
- Adding a role means a new role file, its id in `ROLE_IDS` and an entry in `index.ts`.
- `street-food-vendor.ts` reuses existing handwritten copy until distinct voices are supplied.
- `dealer.ts` lines tagged `tier: "adult"` only play on 18+ servers (see [`../age.ts`](../age.ts)).
