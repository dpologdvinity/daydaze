# art/

Blender and Python scripts that build or convert every 3D asset the game ships, so each model in `public/` can be rebuilt from its downloaded source. Sources are free downloads (Quaternius, Kenney, Poly Pizza, Sketchfab, Poly Haven); the scripts normalize them (size, origin, facing, vertex colors) and the optimize step compresses them into `public/models/`. Every source is credited in `docs/assets.md` and `src/game/credits.ts`.

## Run a script

Blender runs headless. Inputs come from environment variables or arguments named in each script's header docstring, and many of them also have a wrapper in `scripts/import-*.sh`.

```sh
blender --background --factory-startup --python-exit-code 1 --python art/<folder>/<script>.py
```

Then compress the raw GLB (on demand, not a dependency):

```sh
npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt --texture-compress webp
```

Add `--flatten false --palette false --prune-attributes false` when node names, material names or UVs matter. Build output goes to a git-ignored `.cache/` inside the folder; the wrapper scripts then write to `public/`.

## Folders

| Folder | What it builds or holds | Main script | `public/` output |
| --- | --- | --- | --- |
| `animals/` | Quaternius animals and fish as one skinned, vertex-colored GLB each | `build_animals.py` | `public/models/animals/` |
| `beach/` | Sun bed, umbrella and towel cut from a beach diorama | `build_diorama.py` | none scripted (see `docs/assets.md`) |
| `bread/` | Baked goods cut from a bakery pack | `build_bread.py` (`inspect.py` finds the boxes) | none scripted |
| `butterfly/` | Decimated monarch butterfly for instancing | `build_butterfly.py` | `public/models/butterfly/butterfly.glb` |
| `cars/` | Quaternius vehicles to GLB with `paint`, `glass`, `trim`, `tyre` (tire), `rim` and `light` buckets | `import.py` | `public/models/cars/` |
| `city/` | Dream-city architecture and landmarks, the El train, the street kit | `build_dream_city.py`, `street_kit.py`, `el_train.py` | `public/models/city-dream/`, `street/kit.glb`, `el/` |
| `cove/` | Mermaid and the four singing shells | `build_mermaid.py`, `build_shells.py` | `public/models/cove/` |
| `crowd/` | Baked static crowd people from the live doll | `build-crowd.sh` | `public/models/crowd/` |
| `doll/` | The avatar: MakeHuman-based 3D doll, mocap clips, 2D trait art | `blender/build_doll.py` | `public/models/doll/` |
| `fair/` | Downloaded fairground models and the kiddie train | `build_fair.py`, `build_train.py` | `public/models/fair/` |
| `florist/` | Single flower stems from a nature kit | `import.sh` | `public/models/florist/` |
| `food/` | Fruit, burger and snack props as vertex-colored GLBs | `build.sh` | `public/models/props/` |
| `forest/` | Forest trail trees and plants | `build_forest.py` | `public/models/forest/` |
| `home/` | Apartment furniture | `build_home.py` | `public/models/home/` |
| `marina/` | Offshore fleet and the sailboat | `build_fleet.py`, `build_ships.py` | `public/models/marina/` (sailboat) |
| `meshy/` | Meshy-generated models and paintings: task logs, optimize and crop scripts | `optimize.sh`, `paintings.mjs` | `public/models/meshy/`, `public/art/` |
| `motels/` | Beachside cottages and Suburbia houses | `build_motels.py` | `public/models/beachside/`, `public/models/suburbia/` |
| `nature/` | Street trees and palms with far-distance twins | `build_trees.py`, `nature_lod.py` | `public/models/nature/`, `public/models/street/` |
| `ocean/` | Reef props and gulls | `fetch_ocean.py`, `build_ocean.py` | `public/models/ocean/` |
| `opponents/` | Paintball and Laser Tag opponents and their clips | `build_opponents.py`, `build_clips.py` | `public/models/opponents/` |
| `park/` | Band shell, instruments, dog park props | `build_bandshell.sh`, `build_dogpark.sh` | `public/models/park/` |
| `props/` | Meshy task ids for the apartment props (data only) | `meshy-tasks.json`, `meshy-refines.json` | none |
| `scifi/` | Sci-fi crates, desks, arcade cabinet, planet and stars | `build.sh`, `orbit.sh`, `cabinet.py` | `public/models/props/`, `public/models/space-*` |
| `seasons/` | Seasonal city dressing (tree, lantern, bat) | `build_seasonal.py` | none scripted |
| `showroom/` | Dealership showpiece cars | `build_showpieces.py` | none scripted |
| `speedway/` | Speedway cars, crowd, pit crew and Kenney racing kit | `build_speedway_assets.py` | `public/models/speedway/` |
| `street/` | Street furniture and the weathered boardwalk deck texture | `build_street.py`, `weather_deck.py` | `public/models/street/` |
| `sushi/` | Sushi restaurant props | `build.sh` | `public/models/props/` |
| `transit/` | Bus, van and bus stop, near and far twins | `import.py` | `public/models/transit/` |
| `vending/` | Vending machine, repainted for per-machine color | `build_vending.py` | `public/models/street/vending.glb` |
| `vendors/` | Food van, cone and cart | `build.py` | `public/models/vendors/` |
| `yards/` | Dumpster, fences, trash bag, basketball court | `build_yards.py` | `public/models/yards/` |

Helper scripts named `inspect.py` or `preview.py` print sizes or render quick previews of a source or a build; they write nothing to `public/`. The matching `scripts/import-*.sh` wrapper for a folder runs its Blender step and the optimize step together.

## Subfolders

Only these folders have their own README:

- [`doll/`](doll/README.md): the avatar pipeline.
- [`doll/traits/`](doll/traits/README.md): 2D trait images.
- [`crowd/`](crowd/README.md): crowd baking.
- [`city/sources/dream-landmarks.README.md`](city/sources/dream-landmarks.README.md): provenance of the dream-city landmark sources.

## Notes

- Set Blender shape keys to `value = 0` before exporting.
- Downloaded files are untrusted data: never run scripts shipped inside a pack.
- Record every new asset in `docs/assets.md` and `src/game/credits.ts`; a test checks they match.
