# Downloaded assets

Source, author and license of every third-party asset in the game. CC0 needs
no credit; CC-BY must also appear on the in-game credits screen.

## Animated animals and fish (Quaternius, CC0)

| Pack | Author | License | Used for |
| --- | --- | --- | --- |
| Ultimate Animated Animals (Jul 2021), https://quaternius.com | Quaternius | CC0 1.0 | Petting farm at the Zoo (alpaca, donkey, cow); horse, deer, fox and wolf are built for pets and farms |
| Animated Fish Pack | Quaternius | CC0 1.0 | Aquarium shark, manta ray, fish; dolphin and whale ready for the ocean |
| Cute Fish Pack (Feb 2020) | Quaternius | CC0 1.0 | Aquarium reef fish |

Converted by `art/animals/build_animals.py` (Blender: one skinned mesh, colors
baked to vertex colors, only the clips the game plays) and compressed by
`scripts/import-animals.sh` into `public/models/animals/`. The pack has no
giraffe, zebra, elephant, lion, penguin or flamingo; those zoo animals are
still procedural (`src/client/rooms/Zoo.tsx`).
