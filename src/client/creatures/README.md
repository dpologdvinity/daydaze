# src/client/creatures

Animated animals and pets drawn with a skeleton and clips. Used by the zoo, aquarium and ocean rooms, the park wildlife in [`../city/`](../city/README.md) and the player's pet. Behavior rules are in `src/game/` (`creature.ts`, `zoo.ts`, `pet.ts`).

## Files

| File              | What it does                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Creature.tsx`    | One animated creature: the species GLB is loaded once, each instance gets its own skeleton clone and mixer, and a `drive` callback says where it is each frame |
| `Wanderer.tsx`    | A creature that loops round its pen: idles, walks, grazes and stops to look at a visitor                                                                       |
| `Swimmer.tsx`     | A fish, shark or ray following a path that is a pure function of time; slower under reduced motion                                                             |
| `PetFollower.tsx` | The player's pet: trots after her through the city and rooms, sits when she sits, sleeps in the apartment                                                      |
| `glow.ts`         | Self-lit creature materials, so fish in a lit tank glow from inside                                                                                            |
