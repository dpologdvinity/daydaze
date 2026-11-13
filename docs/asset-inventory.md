# Asset inventory and use plan (2026-11-07)

Research only: nothing here changes game code. Owner's brief: "look through it
all; you don't have to use everything." Sources: `~/downloads/game/` (2.6 GB,
about 60 zips plus `animals/` and `hair/`), the two Mixamo manifests, and the
Mixamo library `mixamo/` (a symlink to `~/git/mixamo`, 1.2 GB).

How this was checked: every zip listed with `unzip -l`; license files read
(Quaternius, Kenney-style `License.txt`; WildMesh and other Sketchfab
`license.txt`); GLB headers parsed for triangle, skin and clip counts; models
with no license file in the zip were matched to their Sketchfab page through
the public Sketchfab search API (name plus face count). "Used" comes from
`docs/assets.md`, `src/game/credits.ts`, `public/models/**` and the `art/**`
and `scripts/import-*.sh` build scripts. Nothing from the downloads was
executed; unpacked samples were deleted from `/tmp/inventory`.

Legend: **P** = priority (high / med / low / skip). "Unverified" means the zip
carries no license file and two Sketchfab uploads share the name, so the
license below is the likely one: confirm on the download page before use.
Sketchfab "Free Standard" is Sketchfab's own license (not Creative Commons):
the files may not be redistributed, so treat it as unusable in a shipped game.

## Read this first

- **Mixamo is 1,303 clips, not ~630** (the figure in `docs/plans/2026-11-07-smooth-and-alive.md`).
  Only 87 are baked into the doll today (6.7%).
- **Quaternius' Universal Animation Library 1 and 2 are CC0**: 86 clips on a
  65-bone UE-style rig, never used. They are the cleanest source for farm
  work, tree chopping, climbing, sliding, driving and eating clips, with no
  Adobe terms attached.
- **All the real-car Sketchfab downloads are poor fits**: they carry real
  brands (the repo bans real brand names, `BANNED_BRANDS` in
  `src/client/rooms/speedway/carModels.ts`), weigh 146k to 490k triangles
  each (the whole low-tier scene budget is 300k), and most are NC or NC-SA.
  Quaternius' Realistic Car and Public Transport packs are the real answer
  (details below).
- Two thirds of the Sketchfab animals (all WildMesh "demo free" models, the
  100-animal pack, the turtles and reef shark, Munchkin Cat) are non-commercial.
  `docs/assets.md` already records that they are not used.
- Several zips are duplicates: Buildings Aug 2017 and Ultimate Textured Building
  Pack each exist twice; most WildMesh animals exist as an FBX zip and a glTF
  zip of the same model.

## 1. `~/downloads/game/` root: Quaternius packs (all CC0 1.0)

CC0 needs no credit; keep recording them in `docs/assets.md` as before.
Triangle counts for the older packs are not listed: they are classic
low-poly (hundreds to a few thousand triangles per model).

| Pack (zip) | What is in it | Used now | Where it should go | P |
| --- | --- | --- | --- | --- |
| Animated Fish Pack (7 FBX/OBJ/blend: dolphin, whale, shark, manta, 3 fish; rigged, animated) | marine animals | Yes: aquarium, marina, ocean | Done | skip |
| Cute Fish Pack Feb 2020 (52 fish, FBX/OBJ/blend) | reef fish, flat colors | 18 species (`cute-*.glb`): the first 10, plus royal gramma, parrotfish, cardinalfish, Moorish idol, cowfish, humphead wrasse (Aquarium and Reef Dive) and betta, tetra (Aquarium) | The other ~34 (tuna, swordfish, sunfish, anglerfish, snapper, flatfish...) if a deep-sea tank ever needs them | low |
| Buildings Pack Jan 2019 (9: Building 1 to 4, House 1 and 2) | Cartoon houses and small blocks | No | Looks like toy blocks (see the preview); fights "too much like Lego". Skip, or Suburbia filler far from the player | skip |
| Buildings Pack Aug 2017 (10: Bank, Flat, Flat2, Hospital, House 1 to 5, Shop; two identical zips) | Same cartoon style | No | Hospital and Bank as distant Uptown skyline fillers only; the game has no hospital, bank or pharmacy | low |
| Downtown City MegaKit Standard (153 glTF, 306 FBX, PBR textures, 224 MB) | Brick, metal and trim facade modules, windows, doors, cornices, slate roofs, stoops, street, sidewalk and curb pieces, road decals, props (bollard, drain, manhole, planter, AC unit) | Partly: facade bays merged into `public/models/nyc/bays.glb` (`art/city/nyc_bays.py`); street pieces (crosswalk, stop, slow and double-yellow decals with the kit's paint atlas, `Sidewalk_Corner_Round_3m`, manhole, drain, bollard) merged into `public/models/street/kit.glb` (`art/city/street_kit.py`, `src/client/city/StreetPieces.tsx`) | Unused: `Street_*` (2 and 4 lane, intersections, curves: the city's own road boxes stay), `Decal_*` arrows, bike lane and curve stripes, other `Sidewalk_*` pieces, `Prop_Planter*`, `Prop_ACUnit`, `Roof_Slate*`, `Building_Large_2`/`Medium_2`/`Small_1` | high |
| Furniture Pack Mar 2019 (20) and Oct 2017 (23) | beds, sofas, desks, shelves, lamps | A few (armchair, vase, bookcase, closet) | Remaining sofas and desks for apartments and the Studio; overlaps the House Interior Pack | low |
| Junk Food Pack Apr 2017 (16) | burger, donut, cupcake, pizza, soda | Yes (soda cans, doughnuts) | Done | skip |
| Nature Crops Pack Jan 2020 (102) | crop growth stages | Yes (Sunny Acres Farm) | Done | skip |
| Public Transport Pack Feb 2017 (12: ambulance, bicycle, bus, school bus, taxi, cone, signs, train) | city vehicles | Bus; taxi and sedan come from the Car pack | Ambulance, school bus (summer camp or field trip), traffic cones (road works), square-frame bicycle for the boardwalk | med |
| Realistic Car Pack Nov 2018 (7: cop, 2 normal cars, SUV, 2 sports cars, taxi) | clean low-poly cars | Taxi, sedan, NASCAR bodies (models 1 to 4) | Cop car (police dialogue and the jail), SUV, both sports cars: the real replacements for the lofted traffic cars | high |
| Sci-Fi Essentials Kit Standard (37 glTF) | guns (pistol, revolver, rifle, SMG, sniper), crates, shelves, lockers, drones, mug | Cover and lockers (Photon Zone, Player 2, Orbit 9) | Toy-blaster props for Photon Zone and Paintball (game zones only, per the guns rule); `Prop_Mug`, `Prop_Chest` for dressing | low |
| Ships (6: boat, boat with sail, cruise ship, lifeboat, sail ship, Viking boat) | boats | Sailboat only | Cruise ship on the far horizon, lifeboat on the lifeguard tower and marina, Viking boat as a Renaissance-fair or Halloween prop | med |
| Street Pack (25: road tiles, bridges, elevated roads, lights, signs) | road kit | Streetlight and two signs | `Sign_Triangle`, `TrafficLight_2`; road tiles overlap the Downtown kit | low |
| Stylized Nature MegaKit Standard (68 glTF) | trees, bushes, grass, flowers, rocks | Yes (grass, ferns, bushes, flowers, rocks; Farm, Garden and Zoo trees) | More variants for Uptown and Suburbia (the full kit is 116; owner has the free 68) | med |
| Sushi Restaurant Kit May 2023 (117) | restaurant props and food | Yes | Done | skip |
| Textured Stylized Trees May 2020 (45: birch 10, dead birch 10, dead tree 10, pine 5, tree 10) | UV-textured trees | Forest Trail (a few); the city's five street trees (`Tree_1`, `5`, `6`, `8`, `10`; `art/nature/build_trees.py`) | Pine for Suburbia lawns and the Uptown park (birches are in); the other five `Tree_*` for more street variety | med |
| Train Pack Apr 2019 (14: freight, locomotive, wagons, 2 track pieces) | trains | El cars only (`art/city/el_train.py`) | Locomotive plus passenger wagon as an Amusement Park kiddie-train ride, or a freight crossing near Suburbia | med |
| Ultimate Animated Animals Jul 2021 (12) | animals with clips | 10 (alpaca, cow, donkey, husky, shiba, horse, deer, fox, wolf, more) | `Bull`, `Stag`, `Horse_White` for the petting farm and carousel | low |
| Ultimate Food Pack Oct 2019 (103) | groceries and dishes | Yes | Done | skip |
| Ultimate House Interior Pack Jun 2020 (123) | furniture and kitchen | About 40 for the apartment | Rooms still built from boxes: Haunted House `EscapeSet.tsx`, Jail cells, Bowling and Rooftop Bar decor | med |
| Ultimate Nature Pack Jun 2019 (150) | vertex-colored forest | Forest Trail | More for Larkspur Forest and Uptown | low |
| Ultimate Stylized Nature May 2022 (36 glTF plus PBR bark; 395 MB zip; license header says "Ultimate Platformer Pack") | birch, maple, normal, palm 5, pine, dead trees; bushes; flowers; grass; petals; rocks | Two palms (`PalmTree_1`, `PalmTree_3`, `art/nature/build_trees.py`) on Shore Boulevard and the beach | `MapleTree` and `BirchTree` for Uptown and Suburbia (3k to 4.6k triangles each: decimate), `Grass_*`, `Bush_*` and flowers for the lawns and dunes; only 36 glTF ship, the palms, normal and pine trees are FBX only | med |
| Ultimate Textured Building Pack Dec 2019 (102; 1 to 6 story bodies, balconies, columns, roofs, 5 shop signs, 5 doors plus double doors, AC units, pipes, staircases, casino sign; two identical zips) | UV-textured mid-rise buildings | No | Little Manila, Chinatown, Koreatown, the Arts District: mixed storefronts with signs (Bakery, Barbershop, Bookshop, Hardware, Pharmacy) so blocks stop looking identical. Check the atlas style against the NYC facades before committing | high |
| Universal Animation Library Standard (43 clips, 65-bone rig; plus RM root-motion file) | A_TPose, Crouch, Dance, Death, Driving_Loop, Idle_Talking, Interact, Jog, Jump start/loop/land, PickUp_Table, Pistol set, Punch, Push, Roll, Sitting enter/exit/idle/talking, Spell, Sprint, Swim fwd/idle, Sword, Walk, Walk_Formal | No | Bake onto the doll (see Mixamo section, item 2 of Use next) | high |
| Universal Animation Library 2 Standard (43 clips, plus Mannequin_F) | Chest_Open, ClimbUp_1m, Consume, Farm_Harvest, Farm_PlantSeed, Farm_Watering, Idle_FoldArms, Idle_Lantern, Idle_TalkingPhone, LayToIdle, OverhandThrow, Slide start/loop/exit, TreeChopping, Walk_Carry, Yes, Zombie set | No | Farm and forest chores, eating and drinking, throwing, carrying, sliding (Skatepark, Roller Disco) | high |
| Universal Base Characters Standard (Superhero male and female, 15k triangles each, 65-bone rig; 6 hairstyles, beard, eyebrows) | stylized bodies | Buzz, parted and slicked hair only (hair builds) | Same skeleton as the two Animation Libraries, so any of their clips plays unretargeted: far-LOD crowds and Paintball or Laser Tag opponents | med |

## 2. `~/downloads/game/` root: Sketchfab and other single-model zips

Licenses come from the zip where it had one, else from the Sketchfab API.
Triangle counts are Sketchfab's face counts or parsed from the GLB.

| Zip | Model, author, license | Size and rig | Used | Verdict | P |
| --- | --- | --- | --- | --- | --- |
| 1970-dodge-charger-rt-fast-and-furious-edition | Charger R/T, OUTPISTON, CC-BY-NC-SA | 146k tris, 1 clip | No | NC-SA, real brand: unusable | skip |
| 2024-porsche-992-gt3-r | Porsche 992 GT3 R, VTX (GLB extras: CC-BY-NC-SA) | 489k tris | No | NC-SA, real brand: unusable | skip |
| porsche-992-gt3-r-roxy | Porsche "Roxy", VTX (API: NC-SA; GLB extras say CC-BY: conflicting) | 470k tris | No | real brand, 470k tris: unusable | skip |
| dodge-charger-fast-furious-8 | Charger F&F 8, VTX, CC-BY-NC-SA (unverified; a CC-BY re-upload exists) | 371k tris, skinned | No | NC-SA, brand, IP | skip |
| barbie-dodge-pickup-custom-longcar-by-alexka | Barbie Dodge Pickup, CC-BY-NC | 117k tris (.7z) | No | NC | skip |
| nissan-r34-brians-fast-furious-wwwvecarzcom | Nissan R34, vecarz, CC-BY | 266k tris, 766 meshes | No | CC-BY but real brand and film IP, far too heavy | skip |
| jaguardaimler-xj-x308-pack | Jaguar XJ Sport pack, Fishboe, CC-BY | 26k tris, .blend | No | CC-BY; an unbadged saloon works if the logos are stripped (shape only, original name) | low |
| future-car | Future Car, 3DHaupt, CC-BY | 131k tris, .blend | No | Unbranded concept car; decimate to about 15k for the Dealership showroom or Orbit 9 | low |
| amusement-park | "Amusement park" Megame Studio (NC-SA) or assetfactory attractions pack (Free Standard): unverified | 76 MB FBX, 305k or 80k tris | No (the park uses Kenney and Quaternius) | Either license is unusable | skip |
| amusement-park-ticket-booth | Ticket booth, assetfactory, Free Standard | 3k tris | No | Not redistributable | skip |
| cotton-candy-stall | Steph (CC-BY-NC) or hdyeah (Free Standard): unverified | 4.5k tris, .blend | No | Both unusable | skip |
| beach-001 | Beach 001, DEEP C, Free Standard | 799k tris | No | Unusable and huge | skip |
| lets-go-to-the-beach-beach-themed-diorama | Beach diorama, Jef Belmans, CC-BY | 54k tris, FBX, 45 textures | No | Source of loungers, umbrellas, towels, boards: cut parts out in Blender (credit required) | med |
| bread-pack | Bread pack, Pasha, CC-BY | 297k tris, 88 textures, 84 MB GLB | No | Decimate each loaf to a few hundred tris: Ube Bakery, Patisserie, Sucre | med |
| food-collection-game-ready | Food Collection, Melon Polygons, CC-BY | 32k tris, FBX | No | Duplicates Quaternius food | low |
| foods-2 | Foods 2, Elbolillo, CC-BY | 18k tris, RAR inside | No | Possible extra dishes (contents not unpacked) | low |
| simple-food-background, simple-vendine-machine | trashbinkr, Free Standard | 1k to 5k tris | No | Not redistributable | skip |
| retro-vending-machine | Retro Vending Machine, Steven Janes, CC-BY (a 334-face upload also exists) | 8k tris, FBX | No | Street, arcade and store vending machines, instanced | med |
| mermaid | Mermaid, charliecatling, CC-BY 4.0 | 160 MB FBX, rigged | Yes (Mermaid Cove) | Done | skip |
| neighbourhood-city-modular-lowpoly | golukumar (Free Standard) or rexrain (CC-BY): unverified | 415k tris, 1,287 materials, GLB | No | Too heavy; unusable if Standard | skip |
| a-forest-3-with-a-road-at-night-for-game | dasy444, CC-BY | 152k tris, 39 MB FBX | No | Forest and road scene: reference only | low |
| rollercoaster-diorama-cartoon-style | Blenderkurt, CC-BY-NC | 463k tris, .blend, 1 clip | No | NC | skip |
| text-riding-a-roller-coaster | OuterspaceSoftware, CC-BY | 122k tris, GLB, 1 clip | No | Coasters exist (Kenney); too heavy | skip |
| wheel-of-brisbane-ferris-wheel-low-poly-free | JoTrain (Free Standard) or teacherap123 (CC-BY): unverified | 26k tris, 1 clip | No | Boardwalk Ferris wheel already done (Arif, CC-BY) | skip |
| sea-keep-lonely-watcher | Artjoms Horosilovs (NC-SA) or JesseL (CC-BY): unverified | 169k tris | No | Fantasy castle, off-tone | skip |
| subsurface-scattering-sss-demo-lara | Sketchfab demo, CC-BY | 179k tris | No | Real-world game character likeness; doll pipeline is MakeHuman | skip |
| angelica | Angelica, DarkNik, CC-BY | 144k tris, FBX | No | Wrong pipeline (doll is MakeHuman) | skip |

## 3. `~/downloads/game/animals/` (87 files, many are FBX or glTF twins of one model)

| Models | Author, license | Notes | Used | Verdict | P |
| --- | --- | --- | --- | --- | --- |
| Alligator, Bear, Bighorn, Boar, Buffalo, Deer (two uploads), Deer 2.0, Fox, Goose, Guineafowl, Honey badger, Horse, Hyena, Lioness, Moose, Mountain goat, Pheasant, Rabbit, Warthog, Wildebeest, Wolf (WildMesh "Realistic ... DEMO FREE") | WildMesh 3D, **CC-BY-NC 4.0** (license.txt) | rigged, with clips | No | Unusable | skip |
| Ultimate Animal Pack, 100 animals | WildMesh 3D, **CC-BY-NC 4.0** | 410k tris in one scene | No | Unusable | skip |
| Munchkin Cat | Nyilonelycompany, **CC-BY-NC-SA 4.0** | | No | Unusable | skip |
| Green sea turtle 46A, Loggerhead 47A, Caribbean reef shark 54A | DigitalLife3D, **CC-BY-NC** | 8k to 21k tris, 1 clip each | No | Unusable | skip |
| Vetulicola cuneata | Oxford Univ. Museum of Natural History, **CC-BY-NC** | | No | Unusable | skip |
| Wolf with animations | 3DHaupt, **CC-BY-NC-SA** | 2.8k tris, 5 clips | No | Unusable | skip |
| Nile crocodile swimming | Monster, **CC-BY-NC-ND** (a CC-BY re-upload exists: unverified) | 21k tris | No | Unusable unless the page says CC-BY | skip |
| Chicken rig | FourthGreen (NC) or Maf'j Alvarez (CC-BY): unverified | 0.4k to 1.5k tris | Maf'j's chicken is in the farm | Already covered | skip |
| Realistic Animated Bear, Elk, Doe; Elk Animated Stylized | WildMesh 3D, **CC-BY 4.0** | 5k to 8k tris, 53 to 81 clips | Yes (zoo bear, elk, uptown doe) | Done | skip |
| Realistic Animated Donkey | WildMesh 3D, CC-BY 4.0 | rigged | Quaternius donkey is used instead | Spare for the petting farm | low |
| Stylized Animals BIG PACK | WildMesh 3D, CC-BY 4.0 | 45k tris, 24 static meshes (elk, moose, pronghorn, bear, doe, bighorn, deer) | No | Static distant wildlife in Larkspur Forest and the Uptown park | low |
| Tarisland Dragon (high poly) | Doctor A., CC-BY | 40k tris, 27 clips, RAR | No | Decimate; Halloween, Haunted House or a festival float (owner decision: Western dragon) | med |
| Animated Dragon, three motion loops | LasquetiSpice, CC-BY | 19.5k tris, clips: idle, running, flying | No | Same uses, lighter | med |
| Animated flying fluttering butterfly | LasquetiSpice, CC-BY | 9k tris, clips: hover, idle, take off and land | No | Decimate to a few hundred tris and instance in the park, forest and gardens | med |
| An Animated Cat | Evil_Katz, CC-BY | 7k tris, 63 joints, 1 clip | Quaternius cat used | Spare | low |
| Horse Rigged (game ready) | abhayexe, CC-BY | 2.9k tris, 41 joints, 1 clip | Quaternius horse used | Spare | low |
| Cat in Motion, Medium-poly cat, Curious Pink Pig | iRahulRajput, CC-BY, Meshy-AI generated | static meshes (no rig, despite the name) | No | Skip | skip |
| White Tiger rigged, Running Tiger, Tiger | MotionStreamStudios, Amil, Blender Artist, CC-BY | 4.6k to 33k tris | Blender Artist tiger used | Done | skip |
| Labrador Dog, Blue Whale, Elephant, Flamingo, Zebra and the rest of the zoo | various, CC-BY or CC0 | | Yes (already in `docs/assets.md`) | Done | skip |
| Soda Cans | Yanez Designs, CC-BY | 14k tris | No | Vending-machine stock if the vending machine ships | low |
| VR Store | Michael Zhang, CC-BY | 96k tris, 93 files | No | Interior set for Video Store or Player 2; heavy | low |

Unusable by license (counted in "NC / ND" below): the 21 WildMesh demo animals,
the 100-animal pack, Munchkin Cat, 3 DigitalLife3D models, Vetulicola, the
3DHaupt wolf, the crocodile (unless the CC-BY upload), and in section 2 the
Charger '70, Porsche GT3 R and Roxy, Charger F&F 8, Barbie pickup,
rollercoaster diorama, amusement-park (either upload), ticket booth, beach 001,
cotton-candy stall, the two trashbinkr zips, and probably the neighbourhood,
sea keep and Brisbane wheel zips.

## 4. `~/downloads/game/hair/` (12 zips, all CC-BY per Sketchfab; another agent, `hair`, is on this)

| Zip | Author | Contents | Notes | P |
| --- | --- | --- | --- | --- |
| 12-real-time-woman-hairstyles-collection-02 and -09 | Vincent Freelance | 12 styles each (24), FBX | 600k to 690k tris combined (about 50k per style): needs hard decimation and alpha cards | med |
| free-21-realtime-man-hairstyles-collection (zip and GLB twin) | Vincent Freelance | 21 men's styles, FBX/GLB | 915k tris combined | med |
| free-male-fashion-hair-collection-01-lowpoly | Vincent Freelance | male fashion set, FBX | 694k tris combined | med |
| hair-pack-part-1, -2, -3 | rendysix | GLB packs | 168k, 176k, 37k tris | med |
| female-hairs | miccall | .blend | 51k tris | low |
| female-hair-3d-model-free | iGauravRajput, Meshy-AI generated | 1 GLB, 1.2M tris | skip (AI generated, huge) | skip |
| two-long-ponytails-with-little-bows-with-bones | zHairezt | FBX with bones | 9.6k tris; bones allow sway | med |
| voluminous-long-ponytail-with-bones | zHairezt | FBX with bones | 23k tris | med |

`docs/plans/2026-11-07-smooth-and-alive.md` section 4
is the hair plan and the `hair` agent owns it. The two ponytail
packs are the only hair with bones; they pair with a secondary-motion pass.

## 5. Mixamo (`mixamo/`, 1,303 FBX, 1.2 GB) and the two manifests

Adobe's terms allow baked clips in a shipped game but not redistributing the
FBX files; `art/doll/blender/mocap.py` bakes onto the doll's 52-bone rig.

| Category | FBX | Baked now (`mocap.py`) | Notes |
| --- | --- | --- | --- |
| walking (with styled, turns, strafing, backwards, carrying, idle-transitions) | 151 | 10 walk gaits | Styled: catwalk 01 to 03, high knees, old man, cowgirl, swagger 1 to 3, strut, sexy walk; turns, 180s, arcs, start/stop all unbaked |
| running | 6 | jog | Sprint, run forward 1 and 2, idle-to-sprint, run-to-dive |
| idle | 78 | 6 idles + 15 poses | 29 female and male standing poses, wiping sweat, terrified, thankful, smoking, tablet |
| dancing | 137 | 29 | Unbaked: Thriller 1 to 4 and idle, YMCA, Gangnam Style, Hokey Pokey, Chicken Dance, Moonwalk, headspin, twerk, shopping-cart dance, Northern Soul floor and spin combos, hip-hop variants (17 takes), swing (5), samba (8) |
| dance-poses | 10 | 0 | Held poses |
| gestures (cheering 28, clapping 18, emotions, greetings 19, pointing 10, waving 5, yes-no 9) | 185 | 6 (clap, cheer, fist pump, wave) | Greetings: bows, salute; emotions: crying, angry, happy, defeated; seated claps, yells, cheers |
| talking | 25 | 6 (chatting, question, laugh, sing, sit-chat) | Telling a secret, arguing, rapping, phone calls, texting while walking, watercooler, meetings |
| sitting | 61 | 11 | Stand-to-sit, sit-to-stand, typing, disbelief, wheelchair, honking horn (a car seat clip) |
| standing-up | 12 | 0 | Kip-up, crouch-to-stand |
| laying | 42 | 3 | Sleeping, inhaler, pill, petting (animals) |
| swimming | 9 | 2 | Swimming-to-edge, dynamic poses |
| drinking | 16 | 2 | Drinking fountain, plain drinking; 8 drunk clips (18+ only, `ADULT_OK`) |
| crouching | 53 | 0 | Sneak, crouched walks (8 directions), kneel |
| jumping | 16 | 0 | Box jump, landings, quick steps, wall run |
| climbing | 8 | 0 | Ladder (5), stairs (3) |
| reactions | 41 | 0 | Trips, shoves, big hits (4 directions), injured walks, landing hard |
| poses | 13 | 0 | Cards, examine, watering, action poses |
| sports (baseball, golf, soccer, workout) | 188 | 2 (dig, spike stand-ins) | Golf 20+ (drive, chip, putt, victory, bad shot), baseball hit, goalkeeper, soccer, squats and kettlebell |
| combat (blades, blocking, grappling, kicking, punching) | 137 | 0 | Hits and kicks; useful for an arcade fighter mini game only |
| weapons (bow, melee, pistol, rifle) | 115 | 0 | Rifle and pistol walks, reload, fire: Paintball and Photon Zone only (guns only in game zones) |

Manifests: `~/downloads/game/mixamo-manifest (1).json` lists 147 dance names
and `mixamo-manifest.json` two reaction names; they are the owner's download
queue (descriptions only), not assets. Of the 147 dance names, Thriller,
YMCA, Gangnam Style, Hokey Pokey, Chicken Dance, Moonwalk, Headspin and
Twerk exist in `mixamo/dancing`; Can Can does not.

**File-size strategy.** 87 clips make `anims.glb` 1.5 MB (about 17 KB a clip),
so the whole library baked would be about 20 MB per sex: too much to load at
once. Keep a core file (the 87 plus run/sprint, start/stop and turns, up to
about 150 clips, 2.5 MB) and split the rest into on-demand packs, each 0.3 to
0.8 MB, loaded by `import()` the first time a room needs them (the doll
already ships `anims.glb` and `anims-m.glb`): locomotion-extra, social,
seated, sports-golf, sports-ball-and-gym, dance-2 (clubs), reactions, laying,
climbing, weapons (Paintball and Photon Zone), drunk (never in the 13+ build).
Clip ids in `mocap.ts` stay stable; add a pack name per clip.

**Recommended next bake (about 350 of 1,303 clips).**

1. Locomotion: Sprint, Run Forward 1 and 2, Idle-To-Sprint, strafes, walking backwards, start/stop, 90 and 180 degree turns, old-man, cowgirl and swagger walks, crouch-walk, sneak, jump and land (about 60).
2. Social: all Talking (7), telling a secret, arguing, rapping, phone calls, texting-walking; emotions (crying, angry, happy, thankful, terrified, sad idle, disappointed); greetings (bows, salute, acknowledge, beckon); yes/no/shrug; pointing (about 55).
3. Seated: stand-to-sit, sit-to-stand, typing, seated claps, cheers and yells (Dome, Stadium, Gridiron, Drive-In), seated idle and talk variants (about 40).
4. Dance 2: Thriller 1 to 4, YMCA, Gangnam, Hokey Pokey, Chicken Dance, Moonwalk, headspin, shopping cart, hip-hop and swing variants (about 45).
5. Venue sports: golf (Driving Range, Lagoon Links), baseball hit (Dome), goalkeeper and soccer (Seaside Stadium), kettlebell, squat and snatch (Gym) (about 45).
6. Reactions: trips, shoves, hits, hard landings for laser tag, paintball, bumper cars and water guns (about 20).
7. Laying, climbing (ladder, stairs), swimming extras (about 30).
8. Weapons for Paintball and Photon Zone only: rifle and pistol walk, aim, reload (about 20).

## 6. What looks worst now and which pack fixes it

| Problem | File | Fix |
| --- | --- | --- |
| **Done in feat/real-cars (traffic, player cars, dealership); parked kerb cars still lofted.** Procedural lofted traffic and road cars (12 roster shapes) | `src/client/city/carGeometry.ts`, `src/game/driving/carBody.ts`, `src/client/city/Traffic.tsx`, `src/client/rooms/speedway/CarMesh.tsx`, `carModels.ts` | Realistic Car Pack (cop, SUV, 2 sports cars, 2 normal cars, taxi) plus Public Transport (ambulance, school bus): meshopt, near and far LODs, paint, wrap, rim and tint on named material slots. Add Jaguar-style saloon and the future car if more variety is needed |
| Box loungers on the pool deck | `src/client/rooms/waterpark/Deck.tsx` (`loungerFrame`) | Beach diorama parts (CC-BY) or the already-shipped Orange Chaise Lounge (`public/models/beach/`) |
| Box-built rooms: Haunted EscapeSet, Galleria, Violet Hour decor, Bowling, Rooftop Bar | `src/client/rooms/haunted/EscapeSet.tsx`, `Galleria.tsx`, `violethour/Decor.tsx`, `Bowling.tsx`, `RooftopBar.tsx` | House Interior Pack and Furniture packs |
| **Done 2026-11-13 (feat/opponents).** Opponents of the two tag games were dolls in a laser vest | `src/client/rooms/LaserTag.tsx` (`Rivals`), `shared/Opponent.tsx`, `src/game/opponents.ts` | Universal Base Characters, clothed per team and holding the Sci-Fi Essentials pistol, on UAL pistol, jog, crouch, hit and death clips (`art/opponents/`) |
| Repeated identical buildings in the east and west districts | `src/client/city/NycFacades.tsx`, `CityHouses.tsx`, `src/game/city/layout.ts` | Ultimate Textured Building Pack |
| Sparse grass on lawns and dunes (the trees are done) | `src/client/city/CityPark.tsx` | Ultimate Stylized Nature grass and flowers |
| Instant sit and pop-in poses, one jog, foot sliding | `src/game/gaits.ts`, `art/doll/blender/mocap.py` | Mixamo locomotion and seated packs, UAL |
| No ambient life in parks (no butterflies, no birds beyond gulls and ducks) | `src/client/city/ParkWildlife.tsx` | Butterfly pack, stylized static wildlife |

## 7. Use next (prioritized)

1. **Mixamo locomotion pack** (sprint, run, strafe, backwards, start/stop, turns, extra walk styles, crouch, jump) -> `art/doll/blender/mocap.py` and `src/game/gaits.ts` -> replaces the single jog, sliding turns and the slow walk the owner complained about.
2. **Quaternius Universal Animation Library 1 and 2 (CC0)** -> retarget Farm_Harvest, Farm_PlantSeed, Farm_Watering to Sunny Acres Farm; TreeChopping to Larkspur Forest; Driving_Loop to the player's car; Consume (eating), Interact, PickUp_Table, Push, Roll, ClimbUp, Slide, OverhandThrow, Walk_Carry to the matching rooms -> replaces idle and emote stand-ins in those places and needs no Adobe terms.
3. **Quaternius Realistic Car Pack (cop, SUV, 2 sports, 2 normal) and Public Transport (ambulance, school bus, cones)** -> `Traffic.tsx` and the road cars -> replaces `carGeometry.ts` lofted bodies (the owner's "cars are ugly").
4. **Downtown City MegaKit street, decal, sidewalk and prop pieces** -> done (crosswalks, corner blocks, double yellow lines, manholes, drains, bollards; broad wear patches on the road). Left: the arrows, bike-lane and curve decals, planters.
5. **Ultimate Textured Building Pack** -> done (`game/city/districts.ts`, `public/models/districts/lots.glb`): eleven finished buildings recolored per district along Little Manila, Chinatown, Koreatown, Arts District and Uptown blocks, with shop boards in each district's language; the pack's roof AC units and pipes come with them. Left: wall-mounted AC units and drainpipes from the modular parts, the pack's Bakery/Bookshop sign meshes.
6. **Ultimate Stylized Nature plus Textured Stylized Trees** -> done for the street trees (five Textured Stylized trees, near and far twins, per-tree green with some autumn turning) and the two beach palms. Birches and maples for Suburbia and the park are in (`street-tree-6` to `9`). Left: Ultimate Stylized grass and flowers for the lawns and dunes.
7. **Mixamo social and gesture pack** (talk, laugh, secret, argue, phone, emotions, greetings, yes/no, point) -> NPC conversations in `Pedestrians.tsx` and `src/game/dialogue`, plus the player's emotes. Done 2026-11-13 (`feat/gestures`): most of it was already baked (the `social` pack had 54 clips); 17 more conversation beats (general chat, whisper, a woman's phone call, agreeing and long nods, an annoyed head shake, so-so, two dismissals, aw shucks, a standing shout, furious, accusing, hand up, eye roll, pat on the back, scheming) took the pack from 661 KB to 831 KB (the man's 663 KB to 834 KB). `src/game/dance/conversation.ts` runs a standing group: one speaker per five-to-ten-second turn, listeners reacting at moments of their own, a tone per group (friendly, easy, gossip, heated, excited). Sidewalk huddles (`game/city/chatGroups.ts`, `ChatGroups.tsx`) and two venue huddles (`game/chatSpots.ts`: Galleria, Marina) use it. Laughing, Whisper and Phone call joined the emote menu; a sitter's held clip (seated clap, typing, table idle, chosen sit pose) now goes over the network (`sit@45:seat-clap`). `scripts/mocap-metas.ts` documents re-baking one pack. Left: `TalkingNpc`'s lines carry no mood, so a tapped NPC's gesture is still picked by her seed; the far crowd (Kenney figures) stays walking only.
8. **Mixamo seated pack** (stand-to-sit, sit-to-stand, typing, seated clap, cheer, yell) -> Dome, Seaside Stadium, Gridiron, Drive-In, cafes, the Apartment desk -> replaces popping into a seat. Done 2026-11-13 (`feat/seat-moves`): the clips were already baked (`seated` pack, 29 clips); the work was the root move. `src/game/seatMove.ts` turns her back to the seat and eases her root onto it (and back off on standing) under the `sit-down-ual`/`sit-down` and `stand-up-ual` clips, each sped to about a second (`transitions.ts`, which also holds each clip's measured hip reach); a click mid-sit reverses it from where it is. Seated emotes (`dance/seatActions.ts`: clap, cheer, fist pump, victory, laugh, point and others play their seated takes; clap and cheer joined the emote menu), the cafe tables' `sit-at-table` hold and the apartment desk chair's `seat-typing` hold are `Seat.hold`. Watchers get a `rise@y` pose so they play the stand-up too. Left: the stands' crowd fans are instanced Kenney models, not dolls, so they sit still; other players do not see a seated emote (the action string carries only sit/lie/rise); `type-start` and `type-stop` stay baked but unplayed.
9. **Mixamo venue sports packs, on demand** (golf, baseball, goalkeeper and soccer, workout) -> Skyline Driving Range, Lagoon Links, the Dome, Seaside Stadium, the Gym -> replaces the two stand-in sports emotes.
10. **Mixamo dance 2** (Thriller, YMCA, Gangnam, Hokey Pokey, Chicken Dance, Moonwalk, headspin, shopping cart, hip-hop and swing variants) -> Pulse, Roller Disco, Karaoke Loft, a Halloween club night, Skyline Supply (shopping cart) -> grows the 29-dance set.
11. **Beach diorama (Jef Belmans, CC-BY)** -> cut loungers, umbrellas, towels, boards into the Water Park deck, Beachside and the hotel rooftop -> replaces the box loungers in `Deck.tsx`. Done 2026-11-12 for the Water Park deck and the hotel rooftop (sun bed, umbrellas in three palettes, towel; `art/beach/build_diorama.py`); Beachside already wears downloaded loungers and umbrellas, and the diorama has no boards.
12. **Mixamo reactions** (trips, shoves, hits, hard landings) -> laser tag, paintball, water guns, bumper cars, Skatepark falls, sidewalk trips -> replaces freezing on a hit.
13. **Universal Base Characters with UAL pistol and punch clips** -> Paintball and Laser Tag opponents -> replaces capsule bodies. Done 2026-11-13: `art/opponents/build_opponents.py` and `build_clips.py` (pistol, jog, crouch, hit and death clips; no punch clip yet), `scripts/optimize-opponents.sh`, `public/models/opponents/`, `src/client/rooms/shared/Opponent.tsx`; `src/game/opponents.ts` maps the rival AI's state to a clip.
14. **Quaternius Ships (cruise ship, lifeboat, Viking boat, sail ship)** -> Starboard Marina and the offshore horizon -> adds scale and life beyond the one sailboat. Done 2026-11-12 (`art/marina/build_fleet.py`, `src/game/ships.ts`): liner, sail ships and Viking boat on the horizon of the marina and Beachside, a lifeboat at the marina.
15. **Animated butterfly (CC-BY, decimated, instanced)** -> DONE (2026-11-13): `world/Butterflies.tsx` flocks over the park lawns, Larkspur Forest's glades and the Community Garden; 160-triangle model, one draw call, wings flap in a shader.
16. **Quaternius Train Pack locomotive and passenger wagon with track** -> an Amusement Park kiddie train ride or a freight crossing -> reuses the unused half of the pack.
17. **Bread pack (Pasha, CC-BY)** -> DONE (2026-11-13): twelve items cut and decimated (`art/bread/build_bread.py`, `public/models/bakery/`, 1.2 MB): trays on Purple Pandesal's counter, pies and tarts in Sucre's case, a baguette tray at Daisy's Bakehouse. `rooms/shared/Bakes.tsx` draws them, one instanced draw per material.
18. **Retro Vending Machine (Steven Janes, CC-BY) plus Soda Cans** -> DONE with a swap (2026-11-13): Steven Janes' upload is a fuel pump and the local FBX is a hollow shell, so the snack machine is MadeByYeshe's CC-BY "90s Retro Vending Machine" (262 triangles) in Skyline Supply, Player 2, Boardwalk Arcade and along the avenue pavements, with a soda menu (`game/vending.ts`). The Soda Cans model (14k triangles) is still unused: a can-drop sound stands in.
19. **House Interior Pack remainder** -> DONE (2026-11-13): the Haunted escape hall (furniture, curtains, scare chairs, music-box stand, the lobby sideboard), Jail (bunks, desk, toilet, bin), Glow Bowl (couches, plants, bins) and the Skylark (fire-pit loveseats) wear pack models. Still boxes: the haunted clock (no match in the pack; the crib, rocking horse and crates wear stand-ins), Bowling counter and ball racks, the Skylark bar, kiosk and high tables.
20. **Dragon (LasquetiSpice, CC-BY, 3 loops) or Tarisland dragon** -> Halloween and Haunted House scene, or a festival float -> ask the owner first (Western dragon vs Lunar New Year).
21. **Hair packs** -> owned by the `hair` agent; Vincent Freelance and rendysix packs need heavy decimation; zHairezt ponytails are the only bone-rigged hair.
22. **Dealership showroom cars: Future Car (3DHaupt) and Jaguar XJ saloon** -> DONE (2026-11-13): two unbadged showpieces on plinths in Daydaze Motors, shown as the made-up Aurelia Grand Saloon (the XJ Sport, 8.6k triangles, every badge material replaced by chrome and the JAGUAR plates painted out of its Details texture) and Comet Zero (the Future Car, 14.5k triangles). `art/showroom/build_showpieces.py`, `public/models/showroom/`.
23. **Cute Fish Pack leftover species** -> DONE (2026-11-13): eight more species (royal gramma, parrotfish, cardinalfish, Moorish idol, cowfish, humphead wrasse in the Reef Dive logbook and the Aquarium; betta and tetra in the Aquarium), 30 KB each, built by `art/animals/build_animals.py`.
24. **Sci-Fi Essentials guns** -> Photon Zone and Paintball marker props, game zones only.

## 8. Counts for the lead

Unusable (NC, NC-SA, ND or non-redistributable "Free Standard"), by download:
about 45 distinct models across roughly 55 zips, because many are FBX and
glTF twins. By name: the 21 WildMesh demo animals (listed above), the
100-animal pack, Munchkin Cat, green and loggerhead sea turtles, reef shark,
Vetulicola, the 3DHaupt wolf, the Nile crocodile, the Chicken Rig (FourthGreen
version), the 1970 Charger, 2024 Porsche, Porsche "Roxy", Charger F&F 8, the
Barbie pickup, the rollercoaster diorama, the amusement park, ticket booth,
cotton-candy stall, Beach 001, the Simple Food and Simple Vendine machine
zips, and (unverified, probably) the neighbourhood city, sea keep and Brisbane
wheel zips. The Mixamo FBX files are usable only baked, never redistributed.
