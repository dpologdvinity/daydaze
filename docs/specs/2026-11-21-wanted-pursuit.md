# Player pursuits and City Jail

Status: Approved scope for [#209](https://github.com/dpologdvinity/daydaze/issues/209).

## Player flow

A completed theft at the Thrift Temple raises the wanted level to at least
two stars. The stars appear immediately. On returning to the street, the
player can flee on foot or by car. While a pursuer can see the player, heat
holds. Breaking sight starts a search timer, and surviving the search clears
the wanted level. Existing pedestrian collisions and hit-and-runs feed the
same heat meter.

A close officer can catch a wanted player on foot. A wanted driver is caught
after three continuous seconds below 1 m/s with an active cruiser within
3.5 m. Speeding up or getting out of range resets the arrest timer. Arrest
clears wanted heat, ends the active driving session, and sends the player
to City Jail. The existing shopkeeper catch sequence still handles store
warnings, fines, and jail. The apartment practice shelf keeps its practice
behavior.

Jailed players can wait out their saved sentence, pay coin bail, or shorten
their sentence through the existing rhythm game's scoring rules. The
existing jail activities remain available. Release returns the player to the
jail gate and uses the handwritten release dialogue.

## Approach

Extend the existing heat store and pure wanted rules. Add a player pursuit
that reuses the cruiser visuals and siren from the ambient chase in #191.
The ambient event runs on its own schedule, so a player's wanted level can
drive an encounter anywhere in the city.

The chase follows the player's current local simulation. Sight and arrest
rules live in pure game logic. The client applies them using scene positions
and drives the existing travel and save paths. A five-star HUD reports the
wanted level and whether police are pursuing or searching. Reuse the
existing 13+ content rules, vehicle assets, and render budget.

The alternative is to build the full five-tier response from the Thrill
Systems brief in this PR. That adds spike strips, roadblocks, searchlights,
resprays, fixer contacts, paid vehicle impound, and pursuit replication.
The proposal here delivers the shoplifting-to-jail loop in #209 with a
shared five-star foundation. Those additional city systems need their own
design and coverage. Courier cargo and duel escrow consequences depend on
the systems tracked in #251 and #252.

## Acceptance checks

- A completed in-store theft raises heat and the HUD displays it.
- A pursuit responds to heat, holds it during sightings, and clears after
  the player escapes the search.
- A driver's arrest timer resets when the capture conditions are interrupted.
- Capture clears heat and enters the existing jail flow exactly once.
- The rhythm activity reduces the saved sentence only on a qualifying
  result. An expired or cleared sentence releases the player at the gate.
- Store warnings, fines, practice, pedestrian hits, and ambient chases keep
  their existing behavior.
- Pure rules are tested before implementation. A browser test exercises the
  flow through the shop, street, and jail.
