# Open City Design

Status: approved by the user on 2026-10-14.

## Intent

The pitch is "GTA meets IMVU meets Fantage". The GTA part needs a continuous outdoor city that players walk and drive through. The IMVU and Fantage parts need dressed-up interiors and minigames. Today the world is a set of separate rooms joined by portals (`src/game/rooms.ts`). This spec keeps rooms for interiors and adds one continuous city outside them.

## The model: one city, many interiors

- **City.** One continuous outdoor map made of streets, sidewalks, plazas, parks and building shells. Players walk it, and drive it once cars exist. There are no loading screens between neighborhoods.
- **Interiors.** Every enterable building is a room, as today: the Velvet Room, shops, cafes, homes and clubs. A door on a building shell is a portal into its room, and the room's exit portal returns the player to the sidewalk outside that door.
- **Big outdoor venues.** The Water Park, Amusement Park and Speedway are too big and too ride-heavy to share one scene with the city. They are gated areas: the gate stands in the city, and walking through it loads the venue as its own scene, the same way an interior loads. This is the same pattern GTA uses for its few separate interiors, and it keeps each venue's frame budget separate.
- **Existing rooms keep working.** The Plaza becomes a city square. Its shops become doors on the street. The Velvet Room and the Water Park stay as rooms with no changes, except that the target of their exit portal changes.

## Map

- **First slice.** Downtown plus a stretch of Nightlife Row, about 400 m by 400 m, with a main avenue, two cross streets, a city square on the current Plaza, and about 20 building shells. Six of the shells have doors into rooms.
- **Growth.** Each later neighborhood from the world content spec is a new tile block bolted onto the road network: Little Manila, Chinatown and Koreatown, the Arts District, Beachside, Uptown, Suburbia, Fairground and Hillside Winter Town. The target for the full city is about 2 km by 2 km.
- **Layout as data.** The city is a pure data file in `src/game/city/`. It holds:
  - the road graph: nodes, lanes and speed limits
  - building footprints, with height, style and door positions
  - walkable sidewalk polygons
  - spawn points
  - the neighborhood each cell belongs to

  The renderer and the rules both read this file, and Node tests check it. Examples of checks: every door leads to a real room, roads connect, and no footprint overlaps a road.

## Streaming and performance

- The city is split into 64 m square cells. The client renders the cells within about 160 m of the camera (a 5 by 5 block) and drops the rest.
- Buildings are built from a small kit of modular facade pieces. Each piece is drawn once per cell as an `InstancedMesh`. Neon signs and windows use emissive textures, not real lights.
- Far cells use flat impostor boxes with the same silhouette and colour. Fog hides the edge of the map.
- **Budgets on the low quality tier:**
  - 30 fps on a mid-range phone
  - under 250 draw calls
  - under 300k triangles on screen
  - no more than 4 real lights

  On the high tier, bloom and more lights are allowed. The existing `?quality=` flag picks the tier.
- Interiors and gated venues unload the city completely while the player is inside them.

## Moving around

- **Walking.** Tap or click to walk. WASD or arrow keys and an on-screen joystick also move the player. Collision uses the same polygon rules as `src/game/walk.ts`, extended to building footprints.
- **Cars.** An arcade kinematic model with a bicycle steering model, acceleration, braking, drift and a top speed per car class. It is pure TypeScript in `src/game/` and Node-tested, with no physics engine. Cars collide with footprints, other cars and the curb. Each class's handling numbers come from the car roster in the world content spec.
- **Camera.**
  - On foot: the current orbit camera.
  - In a car: a chase camera behind and above the car, with gentle smoothing.
  - With reduced motion: a steadier, higher camera and no camera shake.
- **Fast travel.** Bus stops and taxi ranks open the world map and move the player to another stop instantly, so walking far is never required.

## Life on the streets

- **Traffic.** Simple cars drive the road graph at lane speed, stop at intersections and yield to the player. The number of cars scales with the quality tier.
- **Pedestrians.** Diverse dolls walk sidewalk loops and idle at benches and storefronts. They say lines from the situational line bank in the world content spec when tapped or bumped. No AI dialogue.
- **Day and night.** A day–night clock drives the sky, street lights and neon, and neighborhood moods. Clubs get busy at night; cafes get busy by day.

## Multiplayer later

The city cannot be one Durable Object for hundreds of players. When multiplayer is wired:

- Each city region is a group of cells with its own Durable Object, its own cap and its own numbered copies, exactly like rooms.
- Players crossing into a new region hand over to that region's object, and players near a border also receive the neighbouring region's players (interest management).
- Movement messages gain a vehicle state: on foot, or driving a given car at a given speed.

None of this is built now. The data model above (cells grouped into regions) leaves room for it.

## Build phases

1. **City core.** Add the city data module, cells, streaming and the facade kit. Turn the Plaza into the city square, and make the Velvet Room and Water Park doors work from the street. Add walking, WASD and the joystick. Ship screenshots and Playwright checks.
2. **Streets alive.** Add pedestrians with lines, a day–night clock, bus stops and the world map.
3. **Driving.** Add the car model, the chase camera, three starter cars (beater, everyday, Y2K hatchback), traffic and parking.
4. **More neighborhoods.** Add one neighborhood per batch, alongside the districts in the world content spec's build order.

The Amusement Park and the Speedway can be built as gated venues in parallel with phases 1 and 2, because they are separate scenes.

## Decisions (user, 2026-10-14)

1. Big venues (Water Park, Amusement Park, Speedway) are gated scenes.
2. The first slice is Downtown plus Nightlife Row.
3. The city core comes next, after the Water Park and Amusement Park. The Speedway and Nightlife Row follow it.
