# Asset credits

Sources for third-party assets shipped in Daydaze. Game music is procedural; ambience, sound effects and two music beds are generated audio.
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
| Animated Flying Fluttering Butterfly Loop | LasquetiSpice | CC-BY 4.0 | https://sketchfab.com/3d-models/none-80f8d9a6dadc411e89ca366cb0cfb0d9 | The park's, Larkspur Forest's and the garden's butterflies: frozen in the open-wing pose, decimated to 160 triangles, flapped in a shader (art/butterfly/build_butterfly.py). |
| 90s Retro Vending Machine | MadeByYeshe | CC-BY 4.0 | https://sketchfab.com/3d-models/90s-retro-vending-machine-dfd9838c7475422099d8d435d08102fe | Snack vending machines on the avenue's sidewalks and in Skyline Supply, Player 2 and Boardwalk Arcade (art/vending/build_vending.py). |
| Jaguar/Daimler XJ X308 Pack | Fishboe | CC-BY 4.0 | https://sketchfab.com/3d-models/none-50f5cb8779f74b0790b68a709d97447b | The Dealership's saloon showpiece (the XJ Sport only): decimated, every badge, wordmark and logo removed, shown in-game as the made-up Aurelia Grand Saloon (art/showroom/build_showpieces.py). |
| Future Car | 3DHaupt | CC-BY 4.0 | https://sketchfab.com/3d-models/none-hliAt7xc6YU2XjXh5G4lzmQwFmR | The Dealership's concept-car showpiece: decimated from 131k to 14k triangles, shown in-game as the made-up Comet Zero (art/showroom/build_showpieces.py). |
| Mermaid | charliecatling | CC-BY 4.0 | https://sketchfab.com/3d-models/none-30534d0eff154f73b5afc16f90b4eb4b | Mermaid Cove mermaids (lounging, swimming, singing), decimated, skeleton cut to its deform bones. |
| Seashell | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/5ovn4mnRejL | Mermaid Cove's scallop and conch singing shells (art/cove/build_shells.py). |
| Clam | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/8675QcluLQX | Mermaid Cove's clam singing shell (art/cove/build_shells.py). |
| seashell | Dario Demi (D911C) | CC-BY 3.0 | https://poly.pizza/m/2BU9U8dOkh- | Mermaid Cove's spiral singing shell (art/cove/build_shells.py). |
| Ultimate Food Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimatefood.html | Grocery stock, produce and restaurant dishes, Halloween pumpkins, converted and optimized; the farmers market's crates of produce. |
| Christmas Tree | Alex Safayan | CC-BY 3.0 | https://poly.pizza/m/fO1vTvI0QIc | The Plaza's tree in the winter holidays (art/seasons/build_seasonal.py). |
| red lantern | Sophie Kim | CC-BY 3.0 | https://poly.pizza/m/7PZhxLFiGc2 | Lanterns strung over Chinatown and Koreatown for Lunar New Year. |
| Bat | Quaternius | CC0 1.0 | https://poly.pizza/m/hNO9XvjlKa | Paper bats over the avenue doors at Halloween. |
| Junk Food Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/junkfood.html | Grocery soda cans and restaurant display doughnuts, converted and optimized. |
| Ringed Gas Giant Planet | berzerkey | CC-BY 4.0 | https://sketchfab.com/3d-models/ringed-gas-giant-planet-b4e21775e84e4cf3890f7796cfab1aca | The planet in Orbit 9's window. |
| Billions stars Skybox HDRI panorama | Aliaksandr.melas | CC-BY 4.0 | https://sketchfab.com/3d-models/billions-stars-skybox-hdri-panorama-7e3e8f94810b44dd837bacad6c65b5e8 | The starfield behind the planet in Orbit 9's window. |
| Sushi Restaurant Kit | Quaternius | CC0 1.0 | https://quaternius.com/packs/sushirestaurantkit.html | Sushi and ramen restaurant furnishings, kitchen equipment, dishes and food, converted and optimized. |
| WheelChair | Loïc | CC-BY 4.0 | https://sketchfab.com/3d-models/wheelchair-f0ef4adc17ee4929b40e894c608061ea | The wheelchair a doll rolls in when her walk style is Wheelchair (fitted by art/doll/blender/wheelchair.py). |
| leg prosthesis | victorghys | CC-BY 4.0 | https://sketchfab.com/3d-models/leg-prosthesis-59d7e2b28b8b45ec8b179fff0134ceec | The lower leg of a doll's prosthetic leg (cut and fitted by art/doll/blender/prosthesis.py). |
| Public Transport Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/publictransport.html | City bus, merged, recolored and simplified for near and far rendering; the ambulance and school bus in street traffic and the dealership's Atlas Van (art/cars/import.py: paint, glass, trim, tyre, rim and lamp meshes, near and low-detail twins). |
| Realistic Car Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/cars.html | The city's traffic and every road car you can drive or buy: sedan, hatchback, SUV, two sports cars, taxi and cop car, split into paint, glass, trim, tyre, rim and lamp meshes with near and low-detail twins (art/cars/import.py). |
| Universal Base Characters | Quaternius | CC0 1.0 | https://quaternius.com/packs/universalbasecharacters.html | Buzz cut, parted cut and their refits as the buzz, shaved-sides and slicked-edges hair, scaled to our head. The Superhero woman and man, clothed with a jersey, pants, shoes and helmet cut from their own skin, are the Paintball and Laser Tag opponents (art/opponents/). |
| Ultimate House Interior Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimatehouseinterior.html | Apartment furniture: sofas, beds, tables, kitchen, bath, plants and more, joined into one mesh each; Clay Day stools, glaze table and plants; the Haunted House escape hall's furniture and curtains, the Jail's bunks, desk and toilet, Glow Bowl's lounge couches, plants and bins, and the Skylark's fire-pit loveseats. |
| Hair Pack (part 1) | rendysix | CC-BY 4.0 | https://sketchfab.com/3d-models/none-41f1709e39e24a3fafdbcd2c2aac72a1 | Hair-card styles quiff, side part, tousled, mop, pompadour, mohawk, spiky crop and layered waves, refitted to our heads, the atlas greyed so hair color tints it (art/doll/blender/pack_hair.py). |
| Hair Pack (part 2) | rendysix | CC-BY 4.0 | https://sketchfab.com/3d-models/none-06a783e91c194e12a296402453476824 | Hair-card styles rapunzel, long waves, sleek side-swept, high ponytail, twin tails, lob, blunt bob, side-swept bob, side fringe, messy bun and messy shag, refitted to our heads (art/doll/blender/pack_hair.py). |
| Hair Pack (part 3) | rendysix | CC-BY 4.0 | https://sketchfab.com/3d-models/none-9dc99938fab341e29b34354004e230b6 | Hair-card styles fishtail braid, crew cut and slick back, refitted to our heads (art/doll/blender/pack_hair.py). |
| Furniture Pack (March 2019) | Quaternius | CC0 1.0 | https://quaternius.com/packs/furniturepack.html | Apartment furniture: armchair, vase and a few small pieces. |
| Furniture Pack (Oct 2017) | Quaternius | CC0 1.0 | https://quaternius.com/packs/furniturepack.html | Apartment furniture: bookcase and closet. |
| Television Vintage | Kenney | CC0 1.0 | https://poly.pizza/m/aSmz6H8aeu | Apartment Retro TV. |
| Television | Kenney | CC0 1.0 | https://poly.pizza/m/9trLeWoBek | Apartment flat-screen TV. |
| Car Kit | Kenney | CC0 1.0 | https://kenney.nl/assets/car-kit | The pastel ice-cream truck, merged and simplified. |
| Coaster Kit | Kenney | CC0 1.0 | https://kenney.nl/assets/coaster-kit | Amusement Park coaster trains, log flume logs and midway stalls. |
| Cabin cart for Ferris Wheel | Enkarra | CC-BY 4.0 | https://sketchfab.com/3d-models/cabin-cart-for-ferris-wheel-3fef7c11a7c447acb9e7a5ee98e654b8 | Amusement Park Ferris wheel gondolas. |
| Carousel Horse | Ramón Ruiz | CC-BY 4.0 | https://sketchfab.com/3d-models/carousel-horse-7872323d00cf4654845c8f39d907e57d | Amusement Park carousel horses. |
| Bus Stop | Zsky | CC-BY 3.0 | https://poly.pizza/m/OWczicNWhO | Line 1 bus stops, rescaled with simplified distance models. |
| Sci-Fi Essentials Kit | Quaternius | CC0 1.0 | https://quaternius.com/packs/scifiessentialskit.html | Photon Zone cover and lockers in Photon Zone and Player 2, fitted to the existing arena footprints; Orbit 9's chairs, tables, shelves and mugs (art/scifi/orbit.sh); its pistol, cut down, in the Paintball and Laser Tag opponents' hands. |
| Arcade Machine | J-Toastie | CC-BY 3.0 | https://poly.pizza/m/GLDkMhiynM | Player 2 cabinet bodies, with the original screen removed and materials baked to vertex colors. |
| MakeHuman | MakeHuman Community | CC0 1.0 | https://github.com/makehumancommunity/makehuman | Avatar bodies, morph targets, hair and clothing, adapted for Daydaze. |
| MPFB2 Mixamo-named rig | MakeHuman Community | CC0 1.0 | https://github.com/makehumancommunity/mpfb2 | The 52-bone skeleton and skin weights the doll is rigged with, fitted to the shaped body. |
| Stylized Nature MegaKit | Quaternius | CC0 1.0 | https://quaternius.com/packs/stylizednaturemegakit.html | Farm, Garden and Zoo trees, the city's bushes, grass, flowers, ferns and rocks; optimized with near and far models; Petal & Stem single-flower stems. |
| Downtown City MegaKit | Quaternius | CC0 1.0 | https://quaternius.com/packs/downtowncitymegakit.html | New York walk-up, prewar and loft facades (storefronts, windows, cornices, doors, stoops) merged and thinned into storey-high bays for Downtown, Uptown and the Arts District; the street decals (crosswalks, STOP and SLOW words, double yellow lines on its weathered paint atlas), sidewalk corner blocks, manholes, storm drains and bollards merged into the city's street dressing; other textures replaced by the city's own. |
| Modular Fire Escape | Poly Haven | CC0 1.0 | https://polyhaven.com/a/modular_fire_escape | Fire escapes on New York walk-ups: the landing and railing, thinned and painted iron black. |
| City Kit Suburban | Kenney | CC0 1.0 | https://kenney.nl/assets/city-kit-suburban | Suburbia's houses near the player, optimized with a small colormap. |
| Ultimate Textured Building Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimatetexturedbuilding.html | Beachside's beach cottages and two Suburbia houses (Palm Court's motels are built from boxes: no motel model exists), kept at the pack's own triangle count. Also the lots of Little Manila, Chinatown, Koreatown, the Arts District and Uptown: eleven buildings thinned, recolored per district and tiled along the blocks. |
| Buildings Pack (Aug 2017) | Quaternius | CC0 1.0 | https://quaternius.com/packs/buildings.html | Beachside's wide cottage and four more Suburbia houses, kept at the pack's own triangle count. |
| Train Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/trainpack.html | The El's train cars (high-speed front and wagon), thinned and baked to vertex colors. |
| Ultimate Animated Animals | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimateanimatedanimals.html | Petting farm at the Zoo (alpaca, donkey, cow) and the adoptable husky and Shiba Inu; horse, deer, fox and wolf built for farms. |
| Ultimate Nature Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimatenaturepack.html | Forest Trail pines, birches, autumn trees, willows, bushes, grass, flowers, logs, stumps and mossy rocks (one vertex-colored mesh each). |
| Textured Stylized Trees | Quaternius | CC0 1.0 | https://quaternius.com/packs/texturedstylizedtrees.html | Forest Trail textured trees, birches and pines with cutout leaves; the city's five street trees (Tree_1, 5, 6, 8, 10) and two birches for Suburbia and the park (Birch_2, Birch_7; `art/nature/build_trees.py`: leaf color bled into the transparent texels, crown-shaped leaf normals, near and far twins). |
| Ultimate Stylized Nature | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimatestylizednature.html | The city's two palms (PalmTree_1 and PalmTree_3, `art/nature/build_trees.py`) on Shore Boulevard and the beach, and two maples (MapleTree_1 and MapleTree_2, gray leaf texture turned green) for Suburbia's lawns and the Uptown park. |
| Animated Fish Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/animatedfish.html | Aquarium shark, manta ray and fish; marina fishing and swimming fish; dolphin and whale ready for the ocean. |
| Cute Fish Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/cutefish.html | Aquarium reef fish and marina fishing. |
| Zebra (rigged) | Quaternius | CC0 1.0 | https://poly.pizza/m/iclPBR6SBZ | Zoo savanna zebras, with idle, walk and run clips. |
| Giraffe | BlueMesh | CC-BY 4.0 | https://sketchfab.com/3d-models/giraffe-522c042aad9f4348a74c2985ec3f99f9 | Zoo savanna giraffes, with a calm idle clip (swayed along when walking). |
| Elephant | Rukh3D | CC-BY 4.0 | https://sketchfab.com/3d-models/elephant-4ae161372d6a4219a87340339d1ffe03 | Zoo elephants, with idle, walk, run and eat clips. |
| Hijab | lam_m_zack | CC-BY 4.0 | https://sketchfab.com/3d-models/hijab-ee50e01adc864ccc880caed9b5eb3bcb | The closet's hijab: the scarf's drape with its mannequin cut out, scaled and skinned to the doll. |
| Baby Lion | kenchoo | CC-BY 4.0 | https://sketchfab.com/3d-models/baby-lion-c9599625dc474262aab754d7b63841f5 | Zoo lions, with a calm idle clip (swayed along when walking). |
| Realistic Animated Bear 3D Model | WildMesh 3D | CC-BY 4.0 | https://sketchfab.com/3d-models/realistic-animated-bear-3d-model-bffc3c87d2d148ff8533e1cc8a11c9f1 | Zoo woods bear, with idle, walk, run, graze, sit and sleep clips (kept 9 of 81, textures shrunk). |
| Realistic Animated Elk 3D Model | WildMesh 3D | CC-BY 4.0 | https://sketchfab.com/3d-models/realistic-animated-elk-3d-model-787834f9caa2474d9f1814b807c072d7 | Zoo woods elk, with idle, walk, run, graze, sit and sleep clips (kept 8 of 53, textures shrunk). |
| Realistic Animated Doe 3D Model | WildMesh 3D | CC-BY 4.0 | https://sketchfab.com/3d-models/realistic-animated-doe-3d-model-b6172618aa304473a4cf7b9246c0a218 | Uptown park wildlife: the doe on the west lawn (high tier). |
| Tiger | Blender Artist | CC-BY 4.0 | https://sketchfab.com/3d-models/tiger-67bbedd727a047869ef7c7b608445484 | Zoo big cats' tigers, with rest, walk, run, eat and howl clips. |
| Labrador Dog | kenchoo | CC-BY 4.0 | https://sketchfab.com/3d-models/labrador-dog-1f56cfbab07e4fe49b5d9e521c82073a | Adoptable pet Labrador, decimated to 8k triangles, with a calm idle clip (swayed along when walking). |
| Blue Whale - Textured | Bohdan Lvov | CC-BY 4.0 | https://sketchfab.com/3d-models/blue-whale-textured-d24d19021c724c3a9134eebcb76b0e0f | Seaside Swim: the blue whale cruising far offshore. |
| African penguin (Spheniscus demersus) Low poly | Major | CC-BY 4.0 | https://sketchfab.com/3d-models/african-penguin-spheniscus-demersus-low-poly-9e59070815fe451d93398e2ebdb9bb92 | Zoo penguin pool, with idle, walk, sit and sleep clips. |
| Flamingo | Хмара Сергей | CC-BY 3.0 | https://poly.pizza/m/5hUIvLVFqet | Zoo flamingo pond (static mesh, swayed by the client). |
| Cat | Quaternius | CC0 1.0 | https://poly.pizza/m/qKICY6xla2 | Adoptable pet cat, with idle, walk, run and eat clips. |
| Bunny | Quaternius | CC0 1.0 | https://poly.pizza/m/irZjWFARyl | Adoptable pet rabbit, with idle, walk and run clips. |
| Nature Kit | Kenney | CC0 1.0 | https://kenney.nl/assets/nature-kit | Zoo fence panels and rocks; dirt crop rows at Sunny Acres Farm. |
| Pig | Quaternius | CC0 1.0 | https://poly.pizza/bundle/Farm-Animal-Pack-1kUvRTPLzT | Sunny Acres Farm pigs, with an idle clip (swayed along when walking). |
| Sheep | Quaternius | CC0 1.0 | https://poly.pizza/bundle/Farm-Animal-Pack-1kUvRTPLzT | Sunny Acres Farm sheep, with an idle clip (swayed along when walking). |
| Chicken - rigged | Maf'j Alvarez | CC-BY 4.0 | https://sketchfab.com/3d-models/chicken-rigged-6e3b93c078114c52bfe4cfa08b9843eb | Sunny Acres Farm chickens, with idle, walk, peck and sit clips. |
| Street Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/streetpack.html | Street lamp and stop and no-parking signs (Streetlight_Single, Sign_Stop, Sign_NoParking); lantern made see-through. |
| Fire Hydrant | Poly Haven | CC0 1.0 | https://polyhaven.com/a/fire_hydrant | Sidewalk hydrants, decimated to under 500 triangles. |
| Metal Trash Can | Poly Haven | CC0 1.0 | https://polyhaven.com/a/metal_trash_can | Sidewalk bins, decimated to about 300 triangles. |
| Bench | Quaternius | CC0 1.0 | https://poly.pizza/m/jLxjFxFRpw | Park-green benches on sidewalks and in the park, bleached gray on Beachside's deck. |
| Mailbox | CreativeTrio | CC0 1.0 | https://poly.pizza/m/2olZ0G8iur | Sidewalk mailboxes, decimated. |
| Parking Meter | Zsky | CC-BY 3.0 | https://poly.pizza/m/SIePMtqLF8 | Curbside parking meters, decimated. |
| Bike Rack | J-Toastie | CC-BY 3.0 | https://poly.pizza/m/DzsJ2LPVKZ | Sidewalk bike racks, decimated. |
| Bus Stop | Zsky | CC-BY 3.0 | https://poly.pizza/m/OWczicNWhO | Avenue bus shelters, decimated. |
| Palm Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/A6cKJYFsIb | Street and beach palms, decimated. |
| Planter and Bushes | J-Toastie | CC-BY 3.0 | https://poly.pizza/m/wn85Xr9lM3 | Sidewalk planter boxes, decimated. |
| Traffic Light | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/57rxXzowK8w | Signal heads at the avenue crossings; head copied to four faces, lenses redrawn lit. |
| Newspaper Box With Mat | neverfollow81 | CC-BY 4.0 | https://sketchfab.com/3d-models/newspaper-box-with-mat-e4dd34bb4e384dee82d80889fa3742b9 | Sidewalk newspaper boxes, decimated. |
| Fountain | Isa Lousberg | CC0 1.0 | https://poly.pizza/m/WHc7dwttlk | The park's fountain, decimated. |
| Gazebo | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/b_p530Qy_-t | The park's bandstand. |
| Rowboat | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/dt1yhb5AYXD | The boat on the park pond. |
| Duck | jeremy | CC-BY 3.0 | https://poly.pizza/m/2KHEgw1ztVI | Ducks on the park pond. |
| Picnic Table | J-Toastie | CC-BY 3.0 | https://poly.pizza/m/GQieALI2C4 | Picnic tables in the park. |
| Picnic Basket | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/aWBGhxXig8y | Baskets on the park's picnic blankets. |
| Round Rug | Quaternius | CC0 1.0 | https://poly.pizza/m/ZYBzMHnSbM | Picnic blankets on the park lawn. |
| Red/White Beach Umbrella | S. Paul Michael | CC-BY 3.0 | https://poly.pizza/m/2li3sdSkmCI | Beach umbrellas on Beachside's sand, decimated. |
| Blue/White Beach Umbrella | S. Paul Michael | CC-BY 3.0 | https://poly.pizza/m/1BLLDjRdxoa | Beach umbrellas on Beachside's sand, decimated. |
| Lifeguard Tower | Daniel Doran | CC-BY 3.0 | https://poly.pizza/m/eTXK45QuLQT | Lifeguard stands on the beach, decimated. |
| Let's go to the beach! - Beach themed diorama | Jef Belmans | CC-BY 4.0 | https://sketchfab.com/3d-models/none-b8784396e5f6424e88b036949164a473 | The Water Park deck's and the hotel rooftop's sun beds, beach umbrellas (recolored in three palettes) and the deck's towels, cut out and straightened (art/beach/build_diorama.py); textures dropped for vertex colors. |
| Orange Chaise Lounge Chair | S. Paul Michael | CC-BY 3.0 | https://poly.pizza/m/8ir-Gw1ZObm | Lounge chairs under the beach umbrellas. |
| Fence | Quaternius | CC0 1.0 | https://poly.pizza/m/e02PFKKhbr | The boardwalk's rail and the dune fence. |
| Popcorn Cart | Don Carson | CC-BY 3.0 | https://poly.pizza/m/1T9untmohmj | Food carts on the boardwalk deck. |
| Market Stand | Quaternius | CC0 1.0 | https://poly.pizza/m/DGIM5HGISb | A kiosk on the boardwalk deck. |
| Street Vendor Cart | Alan Zimmerman | CC-BY 3.0 | https://poly.pizza/m/f_LuAcP2_Yh | A vendor cart on the boardwalk deck. |
| Carnival Booth | sirkitree | CC-BY 3.0 | https://poly.pizza/m/4NizXJZsuO2 | A striped booth on the boardwalk deck. |
| Bicycle | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/19VoUuA2pcN | Bicycles for the boardwalk cyclists, decimated. |
| Pickup Truck | Quaternius | CC0 1.0 | https://poly.pizza/m/qn4grQgHm8 | The floats of the Pride parade. |
| Hot dogs! Get your hot dogs! | Anonymous | CC-BY 3.0 | https://poly.pizza/m/8n7WTYXqb2n | Boardwalk carts and the instanced downtown and park street-food carts. |
| Ice Cream | Quaternius | CC0 1.0 | https://poly.pizza/m/iZiAPq7Sne | The giant cone on the ice cream shop's roof and the street ice-cream truck. |
| Animated Ferris Wheel | Arif | CC-BY 3.0 | https://poly.pizza/m/HknNtngih0 | The turning Ferris wheel at the boardwalk's fairground end. |
| Merry go 'round | sirkitree | CC-BY 3.0 | https://poly.pizza/m/8BliGG-e55g | The carousel on the boardwalk deck. |
| Towel | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/19oMd_9kHDT | Beach towels on the sand. |
| Sand castle | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/5iuHHfVoaza | Sand castles on the beach. |
| Dumpster | Quaternius | CC0 1.0 | https://poly.pizza/m/PKsbolkZSr | The block yards' alley dumpsters (art/yards/build_yards.py). |
| Metal Fence | Quaternius | CC0 1.0 | https://poly.pizza/m/qWKhREFj7H | The block yards' chain fences around alleys and courts, one 3 m panel instanced. |
| Wood Fence 2 | CircuitZ | CC0 1.0 | https://poly.pizza/m/hRx8dQKVCA | The block yards' wood fences around gardens and Suburbia's backyards. |
| Trash Bag | Quaternius | CC0 1.0 | https://poly.pizza/m/jYrMKg2Q7C | Trash bags beside the alley dumpsters, decimated. |
| Basketball court | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/85FpUr2fHkH | The block yards' basketball courts (hoops and lines), texture shrunk. |
| Coral Reef Set 1 | MiniPoly | CC0 1.0 | https://poly.pizza/m/74GL45Fvdh | Reef dive: coral heads, instanced; sets joined and compressed (art/ocean). |
| Coral Reef Sets 2 to 6 | MiniPoly | CC-BY 3.0 | https://poly.pizza/bundle/Coral-Reef-Kit-ghN8EmbYa6 | Reef dive: coral, branching coral and anemones, instanced. |
| Coral Grouper | Quaternius | CC0 1.0 | https://poly.pizza/m/Q2GNw9TRzF | Reef dive: the grouper, one vertex-colored skinned mesh. |
| Ship Wreck | Kenney | CC0 1.0 | https://poly.pizza/m/4qia78IBmZ | Reef dive: the wreck to explore. |
| Anchor | Quaternius | CC0 1.0 | https://poly.pizza/m/ejWQny9Gcz | Reef dive: the anchor by the wreck. |
| Seaweed | Mohabins | CC0 1.0 | https://poly.pizza/m/oYxUdpyc4u | Reef dive: kelp stands. |
| Crab | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/1O5Q4pE8X6e | Crabs scuttling on Seaside Swim's sand and the reef floor. |
| Turtle | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/fklSEvGm1Q8 | Reef dive: the sea turtle. |
| Seagull and Flying seagull | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/0WRzrtCIIRp | Gulls perched on Seaside Swim's sand and wheeling overhead. |
| Nature Crops Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/ultimatecrops.html | Crops at Sunny Acres Farm (carrots, tomatoes, corn, wheat growth stages). |
| Farm Buildings Pack | Quaternius | CC0 1.0 | https://poly.pizza/bundle/Farm-Buildings-Bundle-ppbnhEfNEt | Barn, silo, wooden fences, hay bales, and market stand at Sunny Acres Farm; also the dog park's fence and the farmers market's stalls. |
| Tractor | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/5TGoA5N14c5 | Farm tractor at Sunny Acres Farm. |
| Scarecrow | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/7qFs_DjjuVp | Scarecrow watching over the crop field at Sunny Acres Farm. |
| Tunnels | Kay Lousberg | CC0 1.0 | https://poly.pizza/m/E1Rrk1NKt0 | Dog park: the agility tunnel. |
| Ramp | Quaternius | CC0 1.0 | https://poly.pizza/m/cS1JQReXZs | Dog park: the agility ramp. |
| Seesaw | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/8Ha-8ms-TJb | Dog park: the agility seesaw. |
| Doggy Water Bowl | Jarlan Perez | CC-BY 3.0 | https://poly.pizza/m/6oVp6iDhgSk | Dog park: the water bowl. |
| Tennis ball | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/0aPpwgcBbk1 | Dog park: the fetch ball. |
| Rock Large | Quaternius | CC0 1.0 | https://poly.pizza/m/54jZKTAt5p | Reef dive: flat boulders and arch lintels; the rocks the Mermaid Cove mermaids lounge on. |
| Storage Shed | Quaternius | CC0 1.0 | https://poly.pizza/m/JrFL3mLOKg | Tool shed in the Suburbia community garden. |
| Watering Can | CreativeTrio | CC0 1.0 | https://poly.pizza/m/b2R90QehIt | Watering can prop and watering animation in the community garden. |
| Picket Fence | Quaternius | CC0 1.0 | https://poly.pizza/m/U7g0Wxpt63 | The continuous picket fence around the community garden. |
| Bench | Quaternius | CC0 1.0 | https://poly.pizza/m/jLxjFxFRpw | The community garden bench. |
| Shovel | Quaternius | CC0 1.0 | https://poly.pizza/m/oNBQSf87ZJ | Tool rack by the community garden shed. |
| Hand Rake | CreativeTrio | CC0 1.0 | https://poly.pizza/m/svzOLCZ74s | Tool rack by the community garden shed. |
| Hedge | Quaternius | CC0 1.0 | https://poly.pizza/m/df8uCl1YpK | Hedges and climbing-rose backing at the community garden gate. |
| Cartoon Open Air Stage | mednios | CC-BY 4.0 | https://sketchfab.com/3d-models/cartoon-open-air-stage-0fb769bb8c344f11b6dd2147d03c9a34 | Uptown park's band shell (art/park/build_bandshell.py). |
| Fruit Crate | BlenderVoyage | CC0 1.0 | https://poly.pizza/m/aXulVWHOeV | Farmers market produce crates. |
| Chair | Quaternius | CC0 1.0 | https://poly.pizza/m/iMNqRzPwwe | Folding chairs on the band shell's lawn. |
| Trumpet | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/dKjB2Gm4-rj | Park band's trumpets. |
| Saxophone | jeremy | CC-BY 3.0 | https://poly.pizza/m/6A2UAKdCNy7 | Park band's saxophone. |
| Drum | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/c3RNKJflc4O | Park band's drum. |
| Music stand | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/3zlFGH_TJ8h | Park band's music stands. |
| Rock Large (pillar) | Quaternius | CC0 1.0 | https://poly.pizza/m/d2VWOdthtR | Reef dive: rock pillars and arch legs. |
| Rock Medium | Quaternius | CC0 1.0 | https://poly.pizza/m/s1OJ3bBzqc | Reef dive: mossy boulders; Mermaid Cove's lagoon boulders. |
| Mountain Group | Quaternius | CC0 1.0 | https://poly.pizza/m/a52gSEEq8X | Reef dive: rock spires. |
| Coral | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/4KUXdtDdgHR | Reef dive: branching coral. |
| Anemone | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/1FMGb52XdD- | Reef dive: sea fans. |
| Jellyfish | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/dA5osnS0Rzj | Reef dive: drifting jellyfish. |
| Mini Characters | Kenney | CC0 1.0 | https://kenney.nl/assets/mini-characters | Instanced grandstand crowd and pit road pit crew for the Speedway oval; the boardwalk's far crowd (walking poses) and cyclists' riders. |
| Racing Kit | Kenney | CC0 1.0 | https://kenney.nl/assets/racing-kit | Grandstand, pit garages, barriers, overhead flag gantry, and billboards for the Speedway oval. |
| Realistic Car Pack | Quaternius | CC0 1.0 | https://quaternius.com/packs/realisticcarpack.html | NASCAR stock cars (models 1-4) with canvas liveries for the Speedway oval. |
| Ships | Quaternius | CC0 1.0 | https://quaternius.com/packs/ships.html | Marina sailboat, converted and optimized; the offshore fleet (cruise liner, sail ship, Viking boat, lifeboat) recolored to the house palette with lit windows, one draw call each (art/marina/build_fleet.py), at Starboard Marina and off Beachside. |
| Yacht | Alex Safayan | CC BY 3.0 | https://poly.pizza/m/9znU2c-dTSR | Marina yachts, optimized. |
| Crate | Quaternius | CC0 1.0 | https://poly.pizza/m/3OEFd1AWfa | Marina dock cargo, optimized. |
| Barrel | Quaternius | CC0 1.0 | https://poly.pizza/m/zjCQP1TAci | Marina dock cargo, optimized. |


Street furniture is built by `art/street/build_street.py` into `public/models/street/` (every model cut down to a few hundred triangles).

The animals and fish are converted by `art/animals/build_animals.py` (Blender:
one skinned mesh, colors baked to vertex colors, only the clips the game plays)
and compressed by `scripts/import-animals.sh` into `public/models/animals/`.
The owner's Sketchfab downloads (2026-11-04) were checked against each model's
license: the WildMesh 3D "demo free" animals, the 100-animal pack, the
DigitalLife3D turtles and reef shark, the 3DHaupt wolf and Munchkin Cat are
CC-BY-NC (or NC-SA/ND) and are not used; only the CC-BY rows above are.

The forest trail's trees and plants are converted by `art/forest/build_forest.py`
(Blender: one mesh each, origin at the base, colors baked to vertex colors for
the Ultimate Nature Pack) and compressed by `scripts/import-forest.sh` into
`public/models/forest/`.

## Textures

| Title | Author | License | URL | Used for |
| --- | --- | --- | --- | --- |
| Anti Skid Tiles | Amal Kumar | CC0 1.0 | https://polyhaven.com/a/anti_skid_tiles | Surface textures for the city, venues and furnishings. |
| Asphalt 02 | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/asphalt_02 | Surface textures for the city, venues and furnishings. |
| Bitumen | Rob Tuytel | CC0 1.0 | https://polyhaven.com/a/bitumen | Tar-paper rooftops across the city (box-mapped). |
| Tarred Gravel | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/tarred_gravel | Gravel rooftops across the city (box-mapped). |
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
| Concrete Pavement | Charlotte Baglioni | CC0 1.0 | https://polyhaven.com/a/concrete_pavement | The city's sidewalks and plaza paving, lifted to light warm concrete. |
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
| Wood Floor Deck | Dimitrios Savva | CC0 1.0 | https://polyhaven.com/a/wood_floor_deck | The boardwalk's weathered deck planks. |
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
| Mixamo animations | Adobe | Mixamo terms | https://www.mixamo.com/ | Retargeted character walks, idles, dances, gestures, talking and sitting. |
| Universal Animation Library 1 and 2 (Standard) | Quaternius | CC0 1.0 | https://quaternius.com/packs/universalanimationlibrary.html | Walk, jog and sprint loops, idles (phone, folded arms), sitting enter/exit, farm planting, watering and harvesting, tree chopping, carrying, pushing, throwing, climbing, sliding. Retargeted onto the doll's skeleton by `mocap.py` (a UE-to-Mixamo bone-name map). Its own skeleton is the Base Characters', so the opponents play the pistol aim, shot and reload, jog, crouch, hit and death clips as they are. No credit required. |
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

Only the clips listed in `art/doll/blender/mocap_clips.py` ship, retargeted onto our own skeleton and baked into `public/models/doll/anims.glb` (the always-loaded core) and one file per pack, `anims-social.glb`, `anims-seated.glb`, `anims-dance2.glb`, `anims-ual.glb` and `anims-moves.glb`, each with a `-m` twin for the man (keyframes only, no Mixamo character or mesh). The clip files load on demand (`src/client/avatar/human/anims.ts`). Never commit the FBX files or a GLB that carries a Mixamo character. The Universal Animation Library zips live in the private asset repo (`gh release download packs -R dpologdvinity/daydaze-assets -p 'Universal_Animation_Library*'`; unzip to `/tmp/ual1` and `/tmp/ual2`, or set `UAL_DIR`).

## Audio

| Title | Author | License | URL | Used for |
| --- | --- | --- | --- | --- |
| ElevenLabs-generated sounds | ElevenLabs | Per ElevenLabs terms for paid plans | https://elevenlabs.io/terms-of-use | Generated for Daydaze: ambience, sound effects and two music beds. |
| Concrete Footstep 2 | matth3wc04 | CC0 1.0 | https://freesound.org/people/matth3wc04/sounds/690006/ | Pavement footstep. |
| WoodType_1_Footstep_MensDressShoe | monte32 | CC0 1.0 | https://freesound.org/people/monte32/sounds/405115/ | Boardwalk plank footstep (one step cut from it). |
| Steps_Fine_Snow_Or_Sand_Strong_29 | BlondPanda | CC0 1.0 | https://freesound.org/people/BlondPanda/sounds/778568/ | Sand footstep. |
| Vehicle_Car_Peugeot_308_Idle_Exterior_Loop_Mono_01 | Nox_Sound | CC0 1.0 | https://freesound.org/people/Nox_Sound/sounds/522218/ | Your car's engine loop. |
| truck driving sound | joni_ompong | CC0 1.0 | https://freesound.org/people/joni_ompong/sounds/785698/ | Tire hum while driving (low-passed). |
| school bus truck ext idle engine close shut off | kyles | CC0 1.0 | https://freesound.org/people/kyles/sounds/451666/ | City bus engine loop while riding. |
| bus_door_opening | 13FPanska_Sychra_Petr | CC0 1.0 | https://freesound.org/people/13FPanska_Sychra_Petr/sounds/379372/ | City bus doors. |
| R01-23-Beach Scene | craigsmith | CC0 1.0 | https://freesound.org/people/craigsmith/sounds/479528/ | Boardwalk crowd and gulls. |
| Zebras - Grant's Zebra Braying | TheKingOfGeeks360 | CC0 1.0 | https://freesound.org/people/TheKingOfGeeks360/sounds/850661/ | Zoo: zebra call. |
| Bovines - Cattle; Cow Mooing, Take 3 | TheKingOfGeeks360 | CC0 1.0 | https://freesound.org/people/TheKingOfGeeks360/sounds/847404/ | Zoo farm: cow call. |
| Donkeys - Donkey Bray, Close Perspective | TheKingOfGeeks360 | CC0 1.0 | https://freesound.org/people/TheKingOfGeeks360/sounds/787564/ | Zoo farm: donkey call. |
| Penguin Calls & Noises | iamaviolin | CC BY 4.0 | https://freesound.org/people/iamaviolin/sounds/463033/ | Zoo: penguin call (trimmed). |
| Watersplash | Sheyvan | CC0 1.0 | https://freesound.org/people/Sheyvan/sounds/469608/ | Splashes in the water park, dives and volleyball. |
| Ambience, designed, deep, muffled, wavy, underwater | Oldome | CC0 1.0 | https://freesound.org/people/Oldome/sounds/862788/ | Underwater loop while diving. |
| Ambiance_Fountain_Small_Loop_Stereo | Nox_Sound | CC0 1.0 | https://freesound.org/people/Nox_Sound/sounds/676173/ | Fountain and park water loop. |
| Small Brook Loopable (field recording walk with daughter - rec 4) | gis_sweden | CC0 1.0 | https://freesound.org/people/gis_sweden/sounds/425141/ | Forest Trail creek loop (mono, recompressed). |

The Freesound recordings are fetched with `scripts/freesound.mjs` and cut into `public/audio/` by `scripts/build-recordings.sh`.
