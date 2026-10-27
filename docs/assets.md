# Asset credits

Sources for third-party assets shipped in Daydaze. All audio is procedural.
Mixamo animations (Adobe), used under Mixamo's terms.

To add an asset, append a row under the appropriate group and a matching entry
in `src/game/credits.ts`. Keep all five fields identical; `credits.test.ts`
compares every row in every table, so new assets cannot silently miss credits.
Use plain text and absolute HTTP(S) URLs in cells (no literal pipe characters).
CC-BY entries must name the original author, exact license and source URL.
Record adapted assets too; describe the adaptation in Used for.

This ledger was seeded from the existing import scripts and shipped assets;
future imported packs belong here when they enter the game.


## 3D models

| Title | Author | License | URL | Used for |
| --- | --- | --- | --- | --- |
| MakeHuman | MakeHuman Community | CC0 1.0 | https://github.com/makehumancommunity/makehuman | Avatar bodies, morph targets, hair and clothing, adapted for Daydaze. |
| MPFB2 Mixamo-named rig | MakeHuman Community | CC0 1.0 | https://github.com/makehumancommunity/mpfb2 | The 52-bone skeleton and skin weights the doll is rigged with, fitted to the shaped body. |
| Stylized Nature MegaKit | Quaternius | CC0 1.0 | https://quaternius.com/packs/stylizednaturemegakit.html | Street trees, bushes, grass, flowers, ferns and rocks; optimized with near and far models. |
| Ultimate Animated Animals | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimateanimatedanimals.html | Petting farm at the Zoo (alpaca, donkey, cow) and the adoptable husky and Shiba Inu; horse, deer, fox and wolf built for farms. |
| Animated Fish Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/animatedfish.html | Aquarium shark, manta ray and fish; dolphin and whale ready for the ocean. |
| Cute Fish Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/cutefish.html | Aquarium reef fish. |
| Zebra (rigged) | Quaternius | CC0 1.0 | https://poly.pizza/m/iclPBR6SBZ | Zoo savanna zebras, with idle, walk and run clips. |
| Giraffe | elkiotbear | CC-BY 3.0 | https://poly.pizza/m/gTFDiaGp8D | Zoo savanna giraffes (static mesh, swayed by the client). |
| Elephant | jeremy | CC-BY 3.0 | https://poly.pizza/m/9J-cG39KYFC | Zoo elephants (static mesh, swayed by the client). |
| Lion | jeremy | CC-BY 3.0 | https://poly.pizza/m/cC_IFclYA4c | Zoo lions (static mesh, swayed by the client). |
| Penguin | jeremy | CC-BY 3.0 | https://poly.pizza/m/9Ift-39Akov | Zoo penguin pool (static mesh, swayed by the client). |
| Flamingo | Хмара Сергей | CC-BY 3.0 | https://poly.pizza/m/5hUIvLVFqet | Zoo flamingo pond (static mesh, swayed by the client). |
| Cat | Quaternius | CC0 1.0 | https://poly.pizza/m/qKICY6xla2 | Adoptable pet cat, with idle, walk, run and eat clips. |
| Bunny | Quaternius | CC0 1.0 | https://poly.pizza/m/irZjWFARyl | Adoptable pet rabbit, with idle, walk and run clips. |
| Nature Kit | Kenney | CC0 1.0 | https://kenney.nl/assets/nature-kit | Zoo fence panels and rocks. |
| Street Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/streetpack.html | Street lamp and stop and no-parking signs (Streetlight_Single, Sign_Stop, Sign_NoParking); lantern made see-through. |
| Fire Hydrant | Poly Haven | CC0 1.0 | https://polyhaven.com/a/fire_hydrant | Sidewalk hydrants, decimated to under 500 triangles. |
| Metal Trash Can | Poly Haven | CC0 1.0 | https://polyhaven.com/a/metal_trash_can | Sidewalk bins, decimated to about 300 triangles. |
| Painted Wooden Bench | Poly Haven | CC0 1.0 | https://polyhaven.com/a/painted_wooden_bench | Sidewalk benches. |
| Mailbox | CreativeTrio | CC0 1.0 | https://poly.pizza/m/2olZ0G8iur | Sidewalk mailboxes, decimated. |
| Parking Meter | Zsky | CC-BY 3.0 | https://poly.pizza/m/SIePMtqLF8 | Curbside parking meters, decimated. |
| Bike Rack | J-Toastie | CC-BY 3.0 | https://poly.pizza/m/DzsJ2LPVKZ | Sidewalk bike racks, decimated. |
| Bus Stop | Zsky | CC-BY 3.0 | https://poly.pizza/m/OWczicNWhO | Avenue bus shelters, decimated. |
| Palm Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/A6cKJYFsIb | Street and beach palms, decimated. |
| Planter and Bushes | J-Toastie | CC-BY 3.0 | https://poly.pizza/m/wn85Xr9lM3 | Sidewalk planter boxes, decimated. |


Street furniture is built by `art/street/build_street.py` into `public/models/street/` (every model cut down to a few hundred triangles).

The animals and fish are converted by `art/animals/build_animals.py` (Blender:
one skinned mesh, colors baked to vertex colors, only the clips the game plays)
and compressed by `scripts/import-animals.sh` into `public/models/animals/`.

## Textures

| Title | Author | License | URL | Used for |
| --- | --- | --- | --- | --- |
| Anti Skid Tiles | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/anti_skid_tiles | Surface textures for the city, venues and furnishings. |
| Asphalt 02 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/asphalt_02 | Surface textures for the city, venues and furnishings. |
| Bamboo Wall | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/bamboo_wall | Surface textures for the city, venues and furnishings. |
| Beige Wall 001 | Dimitrios Savva, Rico Cilliers | CC0 1.0 | https://polyhaven.com/a/beige_wall_001 | Surface textures for the city, venues and furnishings. |
| Brick Wall 02 | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/brick_wall_02 | Surface textures for the city, venues and furnishings. |
| Brick Wall 13 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/brick_wall_13 | Surface textures for the city, venues and furnishings. |
| Brown Leather | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/brown_leather | Surface textures for the city, venues and furnishings. |
| Brushed Concrete | Dario Barresi, Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/brushed_concrete | Surface textures for the city, venues and furnishings. |
| Carpet | ambientCG | CC0 1.0 | https://ambientcg.com/view?id=Carpet015 | Surface textures for the city, venues and furnishings. |
| Carpet red | ambientCG | CC0 1.0 | https://ambientcg.com/view?id=Carpet006 | Surface textures for the city, venues and furnishings. |
| Checkered Pavement Tiles | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/checkered_pavement_tiles | Surface textures for the city, venues and furnishings. |
| Chrome | ambientCG | CC0 1.0 | https://ambientcg.com/view?id=Metal049A | Surface textures for the city, venues and furnishings. |
| Clay Roof Tiles | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/clay_roof_tiles | Surface textures for the city, venues and furnishings. |
| Coast Sand 01 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/coast_sand_01 | Surface textures for the city, venues and furnishings. |
| Cobblestone Floor 04 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/cobblestone_floor_04 | Surface textures for the city, venues and furnishings. |
| Concrete Wall 008 | Dario Barresi, Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/concrete_wall_008 | Surface textures for the city, venues and furnishings. |
| Corrugated Iron | Jenelle van Heerden, Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/corrugated_iron | Surface textures for the city, venues and furnishings. |
| Dark Wooden Planks | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/dark_wooden_planks | Surface textures for the city, venues and furnishings. |
| Denim Fabric | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/denim_fabric | Surface textures for the city, venues and furnishings. |
| Fabric Leather 02 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/fabric_leather_02 | Surface textures for the city, venues and furnishings. |
| Fabric Pattern 05 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/fabric_pattern_05 | Surface textures for the city, venues and furnishings. |
| Floor Tiles 06 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/floor_tiles_06 | Surface textures for the city, venues and furnishings. |
| Garage Floor | Jenelle van Heerden | CC0 1.0 | https://polyhaven.com/a/garage_floor | Surface textures for the city, venues and furnishings. |
| Gold | ambientCG | CC0 1.0 | https://ambientcg.com/view?id=Metal034 | Surface textures for the city, venues and furnishings. |
| Granite Tile | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/granite_tile | Surface textures for the city, venues and furnishings. |
| Herringbone Parquet | Jenelle van Heerden, Sergej Majboroda | CC0 1.0 | https://polyhaven.com/a/herringbone_parquet | Surface textures for the city, venues and furnishings. |
| Laminate Floor 02 | Dario Barresi, Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/laminate_floor_02 | Surface textures for the city, venues and furnishings. |
| Leafy Grass | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/leafy_grass | Surface textures for the city, venues and furnishings. |
| Leather White | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/leather_white | Surface textures for the city, venues and furnishings. |
| Long White Tiles | Jenelle van Heerden, Sergej Majboroda | CC0 1.0 | https://polyhaven.com/a/long_white_tiles | Surface textures for the city, venues and furnishings. |
| Marble 01 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/marble_01 | Surface textures for the city, venues and furnishings. |
| Marble Mosaic Tiles | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/marble_mosaic_tiles | Surface textures for the city, venues and furnishings. |
| Marble Tiles | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/marble_tiles | Surface textures for the city, venues and furnishings. |
| Metal Plate | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/metal_plate | Surface textures for the city, venues and furnishings. |
| Oak Wood Planks | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/oak_wood_planks | Surface textures for the city, venues and furnishings. |
| Painted Metal Shutter | Dario Barresi, Rico Cilliers, Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/painted_metal_shutter | Surface textures for the city, venues and furnishings. |
| Painted Plaster Wall | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/painted_plaster_wall | Surface textures for the city, venues and furnishings. |
| Palm Bark | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/palm_bark | Surface textures for the city, venues and furnishings. |
| Park Sand | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/park_sand | Surface textures for the city, venues and furnishings. |
| Patterned Paving | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/patterned_paving | Surface textures for the city, venues and furnishings. |
| Plastic | ambientCG | CC0 1.0 | https://ambientcg.com/view?id=Plastic010 | Surface textures for the city, venues and furnishings. |
| Quatrefoil Jacquard Fabric | colormass, Rico Cilliers | CC0 1.0 | https://polyhaven.com/a/quatrefoil_jacquard_fabric | Surface textures for the city, venues and furnishings. |
| Red Sandstone Pavement | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/red_sandstone_pavement | Surface textures for the city, venues and furnishings. |
| Rock Face | Greg Zaal, Dario Barresi | CC0 1.0 | https://polyhaven.com/a/rock_face | Surface textures for the city, venues and furnishings. |
| Rounded Square Tiled Wall | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/rounded_square_tiled_wall | Surface textures for the city, venues and furnishings. |
| Rubber Tiles | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/rubber_tiles | Surface textures for the city, venues and furnishings. |
| Rusty Metal | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/rusty_metal | Surface textures for the city, venues and furnishings. |
| Slate Floor | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/slate_floor | Surface textures for the city, venues and furnishings. |
| Sparse Grass | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/sparse_grass | Surface textures for the city, venues and furnishings. |
| Square Tiled Wall | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/square_tiled_wall | Surface textures for the city, venues and furnishings. |
| Square Tiles | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/square_tiles | Surface textures for the city, venues and furnishings. |
| Stone Tile Wall | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/stone_tile_wall | Surface textures for the city, venues and furnishings. |
| Terrazzo Tiles | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/terrazzo_tiles | Surface textures for the city, venues and furnishings. |
| Velour Velvet | colormass, Rico Cilliers | CC0 1.0 | https://polyhaven.com/a/velour_velvet | Surface textures for the city, venues and furnishings. |
| Wallpaper | ambientCG | CC0 1.0 | https://ambientcg.com/view?id=Wallpaper001A | Surface textures for the city, venues and furnishings. |
| White Plaster 02 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/white_plaster_02 | Surface textures for the city, venues and furnishings. |
| Wood Floor | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/wood_floor | Surface textures for the city, venues and furnishings. |
| Wood Plank Wall | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/wood_plank_wall | Surface textures for the city, venues and furnishings. |
| Wood veneer | ambientCG | CC0 1.0 | https://ambientcg.com/view?id=Wood049 | Surface textures for the city, venues and furnishings. |
| Aft Lounge HDRI | Greg Zaal | CC0 1.0 | https://polyhaven.com/a/aft_lounge | Environment lighting and reflections on the high quality tier. |
| Anniversary Lounge HDRI | Greg Zaal | CC0 1.0 | https://polyhaven.com/a/anniversary_lounge | Environment lighting and reflections on the high quality tier. |
| Cobblestone Street Night HDRI | Greg Zaal, Jenelle van Heerden | CC0 1.0 | https://polyhaven.com/a/cobblestone_street_night | Environment lighting and reflections on the high quality tier. |
| Kloofendal 48d Partly Cloudy (Pure Sky) HDRI | Greg Zaal, Jarod Guest | CC0 1.0 | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | Environment lighting and reflections on the high quality tier. |


## Animations

| Title | Author | License | URL | Used for |
| --- | --- | --- | --- | --- |
| Mixamo animations | Adobe | Mixamo terms | https://www.mixamo.com/ | Retargeted character walks, idles, dances and gestures. |

| CMU motion capture | CMU Graphics Lab | CMU terms: free to copy, modify and redistribute | http://mocap.cs.cmu.edu/ | Retargeted walks and dances, using BVH conversions from una-dinosauria/cmu-mocap. |


## Code libraries

| Title | Author | License | URL | Used for |
| --- | --- | --- | --- | --- |
| three.js | three.js authors | MIT | https://github.com/mrdoob/three.js | 3D rendering and animation. |
| React Three Fiber | Poimandres contributors | MIT | https://github.com/pmndrs/react-three-fiber | React renderer for three.js. |
| drei | Poimandres contributors | MIT | https://github.com/pmndrs/drei | Scene helpers and model loading. |
| React Three Postprocessing | Poimandres contributors | MIT | https://github.com/pmndrs/react-postprocessing | Postprocessing effects. |
| React | Meta Platforms, Inc. and affiliates | MIT | https://github.com/facebook/react | Game interface and UI rendering. |

## Doll build inputs

- Base mesh, morph targets, default skeleton: MakeHuman `makehuman/data`, commit `a8bc2d54` (CC0 1.0, `LICENSE.ASSETS.md`), fetched by `art/doll/blender/fetch_makehuman.sh`.
- Hair, clothes, shoes and far-LOD body proxies: MakeHuman system asset pack (`makehuman_system_assets_cc0.zip`, CC0 1.0), same script.
- Skeleton `rig.mixamo.json` (52 bones named `mixamorig:*`) and skin weights `weights.mixamo.json`: MPFB2 `src/mpfb/data/rigs/standard/`, commit `6ff1eb35`. CC0 1.0: MPFB's rigs and weights are assets (its `LICENSE.md`, section C); only its program code is GPL, and none of it is used.

`art/doll/blender/build_doll.py` shapes the mesh, fits the MPFB2 skeleton to
it and writes the GLB parts; `scripts/optimize-doll.sh` compresses them into
`public/models/doll/`.

Only the clips listed in `mocap.py`'s `CLIPS` ship, retargeted onto our own skeleton and baked into `public/models/doll/anims.glb` and `anims-m.glb` (keyframes only, no Mixamo character or mesh). Never commit the FBX files or a GLB that carries a Mixamo character.
