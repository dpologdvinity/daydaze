# Daydaze Master Roadmap

Date: 2026-10-14
Status: Living plan. Update it whenever a milestone lands or the user adds a request.

This document plans the whole game, from where it stands today to launch. It ties every request the user has made to a spec section and to the milestone that delivers it. Each milestone later gets its own detailed implementation plan in `docs/plans/`, in the format of `2026-10-14-speedway-and-driving.md`.

Source documents:

- `docs/VISION.md`: audience, tone, age tiers, platform, renderer.
- `docs/specs/2026-10-14-world-content-design.md`: districts, neighborhoods, food, shopping, NPCs, games, effects, crime, cars (the "content spec").
- `docs/specs/2026-10-14-open-city-design.md`: the continuous drivable city (the "city spec").
- `docs/specs/2026-10-14-online-foundation-design.md`: accounts, guests, rooms, chat, moderation (the "online spec").
- `docs/specs/2026-10-14-3d-client-foundation-design.md`: the 3D client (the "client spec").
- `docs/plans/2026-10-14-speedway-and-driving.md`: the first detailed district plan.

---

## 1. Vision and pitch

**GTA meets IMVU meets Fantage.**

- **GTA:** an open city you walk and drive, explore and get into trouble in.
- **IMVU:** you dress up a glam 3D fashion doll and hang out with people in neon lounges and clubs.
- **Fantage and Club Penguin:** the dress-up, minigames, pets and cosy nostalgia of the games the players grew up on.

The players are people who grew up on Club Penguin and Fantage and are now 16 and older. It is not a kids' game.

The look is maximalist: dense, layered, glowing, colourful, with constant small motion. Sapphic and lesbian themes are part of the game's identity. Mango survives only as a rare easter egg.

---

## 2. Where we are now

### Merged on `main`

| Area | What exists | Evidence |
|---|---|---|
| Online foundation | A Cloudflare Worker, Durable Objects and D1 schema covering: guests and accounts (PBKDF2), shared room copies, chat, block/mute/report, admin kick and ban, persisted rate limits, CSP and security headers, origin checks, and a smoke test. | `server/`, `src/net/`, `docs/security.md`, `docs/deploy.md`, `npm run smoke:server` |
| Framework-free online client | `OnlineSession`, `WebSocketTransport` and the typed API. They are not yet wired into the 3D client. | `src/net/client/` |
| 3D client | React Three Fiber world, click-to-walk, orbit camera and quality tiers. The code-built doll uses toon shading and painted face layers. Also a closet, chat UI, the Velvet Room lounge and the Plaza night street with portals. | `src/client/`, `src/game/`, `tests/client.spec.ts` |
| Minigames (2D overlays) | Last Call (cocktail mixing) and Bassline (DJ rhythm). | `src/minigames/`, `tests/minigames.spec.ts` |
| Procedural audio | A shared bus, instruments, a jukebox and bar sounds. | `src/audio/` |
| Doll art | Layered 2D face, hair and makeup art with a compositor. | `art/doll/` |
| Specs and plans | Content spec, city spec (approved), online spec, client spec, Speedway plan. | `docs/specs/`, `docs/plans/` |
| Renames | Mango Room became The Velvet Room. Mango Decks became Bassline. Mango Mixology became Last Call. | commits `9706ff2`, `ef43176`, `f1865e7` |

`npm run verify` is green on `main` (700+ unit tests). `main` is pushed to the private GitHub repo after each green change; deploying still needs the user's OK.

### Landed since (2026-10-15 to 2026-10-16)

| Area | What exists | Evidence |
|---|---|---|
| City | Downtown and Nightlife Row (384 m square), cell streaming, traffic, doors into every room; Poly Haven asphalt and concrete; night-street HDRI on the high tier | `src/game/city/`, `src/client/city/` |
| 3D doll | MakeHuman CC0 doll built in Blender: strand-card hair (12 styles), face presets, makeup, piercings, hourglass figure with sliders, six outfits and two swimsuits, LOD body | `art/doll/blender/`, `src/client/avatar/human/` |
| Character creator | Full-screen closet with picture tiles for hair, face, outfits and swimsuits | `src/client/ui/Overlay.tsx`, `public/closet/` |
| Motion | CMU and Mixamo motion capture: walk styles (natural, catwalk, sexy, feminine, casual), captured dances, held poses for Pose and Sit, lying on beds | `art/doll/blender/mocap.py`, `src/game/dance/` |
| Seating | Chairs, stools, banquettes, the apartment sofa and bed | `src/game/seats.ts` |
| Amusement Park | Nine rideable rides: ferris wheel, Comet coaster, Starlight hyper coaster (20 m, back lot), carousel, teacups, swings, drop tower, pirate ship, log flume (water-ride lot); the Midway booths | `src/game/amusementPark.ts`, `src/client/rooms/amusementpark/` |
| Rooms | Velvet Room, Plaza, Pulse, The Violet Hour, three food rooms, shops, apartment, jail, Water Park, Speedway | `src/client/rooms/` |
| Props | 14 Meshy-generated furniture and venue props | `public/models/props/`, `art/props/` |

---|---|---|
| `feat/water-park` | Water Park room, Plaza gate, auto-swimsuit slot in the save, slide ride, lifeguard, cashier and swimmers, screenshots | Being finished: rebasing onto `main`, carrying the Velvet rename, tests and screenshots. Merges first. |
| `feat/npc-lines` | `src/game/dialogue/`: situation-keyed line banks for 18 roles, a picker that avoids recent repeats, a banned-word test | Being built. Merges second. |
| `feat/amusement-park` | Night carnival: ferris wheel and roller coaster (rideable), carousel, drop tower, swings, teacups, midway booths, staff NPCs | Being built. Merges third. |
| `feat/city-core` | City phase 1: Downtown and Nightlife Row slice (~400 m × 400 m), cell streaming, facade kit, WASD and joystick, doors into rooms | Being built. Merges fourth. |
| `feat/speedway` | Speedway and driving plan, executed inline | Started: Task 1 (fixed-step clock) test written. Tasks 1–5 (pure logic) continue now. Tasks 6–8 wait for the merges above. |

---

## 3. Architecture overview

### Layers

- **`src/game/`**: pure, Node-tested game rules with no React or three.js. Rooms, walking, portals, looks, saves, and later the city data, cars, dialogue, economy, crime, jail and effects.
- **`src/client/`**: a thin React Three Fiber layer that renders the rules. It contains `world/`, `rooms/<place>/`, `city/`, `avatar/` and `ui/`. Scenes load lazily with `React.lazy`.
- **`src/minigames/`**: 2D overlay games launched from hotspots in their place. Each one has an engine (pure, tested) and a React view.
- **`src/audio/`**: procedural Web Audio only. No audio files.
- **`src/net/` and `server/`**: the protocol, the room server and the Cloudflare Worker.

### World structure (decided)

- **One continuous city outdoors.** Neighborhoods are tile blocks on a road graph, streamed in 64 m cells.
- **Interiors are rooms behind doors.** Each is a separate scene: shops, cafes, clubs, homes, salons and the jail.
- **Big venues are gated scenes.** A gate stands in the city and loads the venue: the Water Park, Amusement Park, Speedway, Zoo, Aquarium, Ice Rink, Sports Complex, Marina and Airport.
- **Fast travel** uses bus stops, taxi ranks and the world map.

### Game loop

- Vehicles, rides, bots and stealth run on a fixed 50 Hz tick (`src/game/driving/fixedStep.ts`). Rendering interpolates between ticks.
- Input goes through one action layer, so keys, the touch joystick and gamepads feed the same actions: move, interact, dance, throttle, steer.

### Server (when multiplayer is wired)

- Each room copy and each city region is its own Durable Object, with caps and numbered copies.
- Players near a region border also receive neighbouring players (interest management).
- The server enforces chat effects, home ownership, jail state and moderation.

### Save and schema changes the later systems need

Today the save is `SaveV1`: name, look and settings, client-only. The Water Park branch adds a swimsuit look slot. Later milestones extend the save as shown below. Every change gets a versioned migration, validation of old saves and round-trip tests.

| Field | Needed by | Owner | Notes |
|---|---|---|---|
| `look.swimsuit` | M1 Water Park | client save | In flight. |
| `coins` | M4 | client save, then the server after M9 | Client-owned until trading exists (VISION). |
| `inventory` (clothes, furniture, items, `stolen` tag with expiry) | M4, M6 | client save, then the server | Server-owned once multiplayer swap racks and break-ins exist. |
| `body` (bust, hips/butt, waist, height) | M4 | client save | Body-shape sliders. |
| `identity` (pronouns, accessibility items) | M4 | client save | Shown on the profile card. |
| `cars` (owned ids, paint, rims, wrap, tint, underglow, parked location, locked) | M2, M4 | client save, then the server | Theft needs the server. |
| `home` (apartment id, neighborhood, decor layout, door locked) | M6 | server | Break-ins need server ownership. |
| `jail` (sentence end, bail amount, offence) and `storeBans` | M6 | server | Must not be client-skippable once online. |
| `buzz` (drunk, high, trip levels with decay timestamps) | M3, M10 | client, with chat effects enforced by the server | Never punishing. |
| `relationships` (friends, blocks, mutes) | M9 | server | Blocks already exist in the online spec. |
| `birthdate` (locked) and the 18+ flag | M10 | server only | The birthdate is never stored on the client. |

---

## 4. Milestones

Sizes: **S** is under a day of agent work, **M** is a few days, **L** is about a week, **XL** is several weeks.

Every milestone ends with `npm run verify` green, its Playwright specs green under `taskset -c 6-11 … --workers=2`, its screenshots committed in `docs/screenshots/`, and a serial `--no-ff` merge into `main`.

### M0. Foundation (done)

- **Goal:** a working 3D client, server and minigames to build on.
- **Delivered:** everything in "Merged on `main`" above.
- **Requests satisfied:** the 3D IMVU-style renderer; code-built doll avatars; $0 Cloudflare hosting for 50–500 players; guest mode and accounts; block, mute and report; the Last Call and Bassline minigames; no AI dialogue.

### M1. First districts and the systems they share (in flight)

- **Goal:** two playable venues, the dialogue system and the first walkable city streets.
- **Features:**
  - **Water Park**, from "water park with a ton of rides and activities, they change into swimsuit": entrance, slide tower and a rideable slide, pool, splash zone, deck, lifeguard and snack cashier, swimmers. The auto-swimsuit look slot applies in swimwear rooms. Later in M7: wave pool, lazy river, cliff-dive lagoon, cabanas and pool bar, night swim.
  - **Amusement Park**, from "amusement park with a ton of rides": a rideable ferris wheel and roller coaster, plus a carousel, drop tower, swing ride, teacups and a carnival midway. The log flume, haunted house and photo booth come in M7. Staff are a ticket cashier, a ride operator, a cotton-candy vendor and a barker.
  - **Dialogue system**, from "a ton of different lines they could say in each possible situation" and "no AI": `src/game/dialogue/` with banks per role and situation, placeholders, weights, conditions and recent-line skipping. About 1500 lines to start.
  - **City core (city phase 1)**, from "GTA": the Downtown and Nightlife Row slice, cell streaming, a modular facade kit with LOD, WASD/arrows/touch joystick, footprint collision and the Velvet Room door on the street.
- **Dependencies:** M0.
- **Modules:** `src/game/waterPark.ts`, `src/game/amusementPark.ts`, `src/game/dialogue/`, `src/game/city/`, `src/client/rooms/WaterPark.tsx` and `waterpark/`, `src/client/rooms/AmusementPark.tsx` and `amusementpark/`, `src/client/city/`.
- **Tests:**
  - Unit: room data, ride paths, swimsuit save migration, line banks (no empty situations, valid placeholders, banned words), picker determinism, city graph integrity (doors target real rooms, roads connect, no overlaps).
  - Playwright: reach each venue, swimsuit is on, ride starts, city walk with keys.
- **Screenshots:** `water-park-{wide,swimsuit,slide,mobile}.png`, `amusement-park-{wide,coaster,mobile}.png`, `city-{street,overview,mobile}.png`. Regenerate `velvet-room*.png` and `plaza.png` without the old mango sign.
- **Integration after merge:**
  - Move the Water Park and Amusement Park NPC lines into the dialogue banks.
  - Turn the Plaza into the city square.
  - Put the Water Park and Amusement Park gates on the city map (Beachside and Fairground are not built yet, so use temporary gates on the Downtown edge).
- **Size:** XL in total, with four parallel branches.
- **Done when:** all four are merged, the venues are reachable from the city, and the screenshots have been shown to the user.

### M2. Speedway, driving and cars

- **Goal:** drive. The car model serves both the race track and the city streets.
- **Features:**
  - From "race track and bumper cars": the Speedway with a grandstand, pit garage, two tracks (Neon Oval, Boardwalk Loop), a solo time trial against bots at three skill levels, and the bumper car arena with bots.
  - From "cars, cheap to expensive, actual cars and accurate" (GTA-style lookalikes): an arcade car model and seven starter cars from a 900-coin used sedan to a 120 000-coin supercar, plus a kart. Silhouettes are based on real cars, with original names and badges.
  - City phase 3: a chase camera, a reduced-motion camera, driving on city streets, parking, and simple traffic on the road graph.
  - Pit crew lines from the dialogue banks.
- **Dependencies:** M1 (dialogue, city).
- **Modules:**
  - `src/game/driving/` (`fixedStep.ts`, `car.ts`, `roster.ts`)
  - `src/game/speedway/` (`track.ts`, `laps.ts`, `bots.ts`, `race.ts`, `bumper.ts`, `spots.ts`)
  - `src/game/city/traffic.ts`
  - `src/client/rooms/Speedway.tsx` and `speedway/`
  - `src/client/city/vehicles/`
- **Tests:** everything in the Speedway plan, plus traffic tests (cars stop at intersections, yield to the player, never leave lanes) and a Playwright drive on a city street.
- **Screenshots:** `speedway-{grid,racing,bumper,mobile}.png`, `city-driving.png`.
- **Size:** L.
- **Done when:** a race, a bumper session and a street drive all work on desktop and on a 390×844 touch screen.

### M3. Nightlife Row

- **Goal:** the IMVU heart. Clubs, bars, dancing, drinks and the lesbian bar.
- **Features:**
  - From "several clubs" and "dance": a main dance club, a Y2K pop club, a techno warehouse, a Latin night club, the lesbian bar's dance floor, a rooftop bar, a karaoke bar, an arcade bar, a speakeasy, and the existing Velvet Room. Club interiors are rooms behind street doors.
  - From "be able to dance": a dance picker with two-step, body roll, hair flip, Y2K shuffle, voguing, twerk and slow dance. Beat tiles give an optional streak glow. Couple dances work for any two dolls, and work with NPCs until multiplayer exists. Dance moves are animation data.
  - From "NPCs such as body guards, cashier, so that it doesn't feel lonely": bouncers, DJs, bartenders, club dancers, coat check, servers and regulars, all using the dialogue banks. The bartender offers a drink action.
  - From "weed and alcohol, makes u feel drunk", free props: alcohol in the main world. A buzz meter with decay. Drunk camera sway, edge blur, wobbly walk, chat letter-stretching and warmer, muffled music. An intensity setting (off, low, full); reduced motion keeps only colour and audio changes; no strobing. Weed waits for M10.
  - From "sapphic / lesbian themes": the lesbian bar with its own look, playlist, regulars, posters, signage and menu. Pride and lesbian sunset flags as decor. Couple emotes (holding hands, forehead kiss, piggyback). Sapphic neon-sign puns. A pride night event at the dance club.
  - Games: Bassline launched from the dance club's DJ booth, Last Call launched from the rooftop bar, plus karaoke, dance battle, trivia night, card table and match-3, landing one per batch.
  - From "launch minigames from the world": hotspots that open the 2D overlays.
- **Dependencies:** M1 (city doors, dialogue). The drunk chat effect becomes server-enforced in M9.
- **Modules:** `src/game/effects/buzz.ts`, `src/game/dance/`, `src/client/rooms/nightlife/<venue>/`, `src/client/effects/` (post-processing for sway and blur), `src/client/ui/DancePicker.tsx`, and new minigames in `src/minigames/<game>/`.
- **Tests:**
  - Unit: buzz decay, cap, water and food reduction, chat distortion that is deterministic for a seed, dance clip data.
  - Playwright: enter a club from the street, dance, drink, the effect is visible, reduced motion removes the sway, a minigame launches from its hotspot.
- **Screenshots:** one per club, `dance-floor.png`, `drunk-effect.png`, `lesbian-bar.png`.
- **Size:** XL.
- **Done when:** every listed venue is enterable from the street with NPCs, and dancing and drinks work.

### M4. Economy, shopping and looks

- **Goal:** earn and spend coins. The Fantage dress-up loop.
- **Features:**
  - Coins earned from games and the delivery job (M5), stored in the client save.
  - From "malls, a variety of stores, thrift shops": the Y2K mega-mall (atrium, escalators, fountain, food court, arcade, photo-sticker booth, cinema), an outdoor luxury street, and the dead-mall secret (built in M8 Suburbia). Fashion boutiques by style, shoes, sneakers, jewelry, handbags, hats and wigs, sunglasses, a phone and gadget store with Y2K flip phones, a record store, a bookstore, a toy store, a crystal and tarot shop, a flower shop, a party store, a bridal boutique, sports gear, a plant shop, a pet shop, furniture and decor, perfume, a tattoo and piercing studio, and a liquor store. The smoke shop is 18+, so it ships in M10.
  - Thrift and vintage: daily random restocks, rare one-offs, a vintage Y2K boutique, a weekend flea market, a consignment resale shop, and a swap rack that trades with NPCs until M9.
  - From "makeup / beauty supply shop": a Sephora-style store under an original name with swatch-on-doll testers; a beauty supply store (wigs, bundles, braiding hair, edge control, bonnets, lashes, press-ons, dye); K-beauty; a drugstore aisle; a nail polish bar.
  - From "hair salon": a glam downtown salon, a braiding shop, a barbershop, a Korean perm and colour salon, and a walk-in salon. Live preview before paying. Lash, brow and makeup-artist services.
  - From "nail salon": a neighborhood nail salon and a luxe studio. Shape, length, colour, finish and art shown on the doll's hands. A nail-painting minigame.
  - From "female characters with boobs and butt": body-shape sliders for bust, hips and butt, waist and height. Outfits follow the shape.
  - From "diversity in the characters": the full doll builder range in the content spec's Diverse characters section. That covers skin tones and undertones, face, eye, nose and lip shapes, freckles, vitiligo and birthmarks, slim to plus-size bodies, every hair texture and edges, free gender expression and pronouns, glasses, hearing aids, a wheelchair that works everywhere, prosthetics, hijabs and head wraps, bindis and turbans.
  - From "grocery store": a supermarket, a Filipino grocery (original name), an Asian supermarket (original name), a farmers market and a bodega with a cat. Groceries stock the apartment kitchen in M6.
  - Car shop and customization garage (paint, rims, wraps including pride wraps, tint, underglow) for the M2 cars.
  - Pets go home from the pet shop. Pets and the lion theme are low priority, so pets stay cosmetic companions.
- **Dependencies:** M1 (city, dialogue), M2 (cars).
- **Modules:** `src/game/economy/` (wallet, prices, receipts), `src/game/shop/` (catalogue, try-on, restock seeded by date), `src/game/look.ts` (body and identity fields), `src/game/save.ts` (v2 migration), `src/client/rooms/shops/`, `src/client/rooms/salon/`, `src/client/ui/Closet*`, `src/minigames/nailPainting/`.
- **Tests:**
  - Unit: coin balance can never go negative; a purchase adds ownership exactly once; the thrift restock is deterministic per day; save v1→v2 migration and round trip; body slider clamping; every catalogue item has an original name and no banned brand.
  - Playwright: buy, see it in the closet, wear it; salon preview then pay; axe on every shop dialog.
- **Screenshots:** mall atrium, a boutique, the beauty store, a salon chair preview, a nail close-up, the body-shape closet.
- **Size:** XL.
- **Done when:** a player can earn coins and spend them in every listed store type, salon and car garage, and the purchases persist.

### M5. Food

- **Goal:** about 100 places to eat and drink, plus delivery.
- **Features:**
  - From "a lot of different types of restaurants and cafes, including filipino food / matcha / boba / ube / jollibee / anything" and "need more": every item on Food Street, Cafes and Restaurants (more) in the content spec. The section 6 checklist lists them all. Food is free. Each place has a counter NPC, a real menu and seating, and players eat with an eating animation. Shared tables and clinking drinks. Food lowers the buzz.
  - The Jollibee-inspired joint under an original name, logo and bee-free mascot: red and yellow, fried chicken, sweet spaghetti, peach mango pie.
  - From "i want doordash": an in-game phone app under an original name. A courier NPC on a scooter delivers to wherever the player is. The delivery job pays coin tips for fast, careful deliveries.
  - Food minigames, one per batch: boba builder, halo-halo stacker, sushi conveyor catch, ramen rush, and the two-player Filipino cook-off.
- **Dependencies:** M1 (city, dialogue), M2 (scooter on the car model), M4 (coins). Restaurants in Little Manila and Chinatown/Koreatown open with those neighborhoods in M8. M5 builds the restaurant system and the Downtown and Nightlife Row venues, and the M8 neighborhoods bring their own restaurants on the same system.
- **Modules:** `src/game/food/` (menus as data, venue registry), `src/game/delivery/` (orders, courier routing on the road graph, job tips), `src/client/rooms/food/` (a shared kit with per-venue dressing), `src/client/ui/phone/`, `src/minigames/{bobaBuilder,haloHalo,sushiCatch,ramenRush,cookOff}/`.
- **Tests:**
  - Unit: every venue has a menu, an NPC role and seats; no brand names; delivery ETA and routing; tip formula.
  - Playwright: order and eat; order a delivery to the apartment; one food minigame.
- **Size:** XL. The content is large but repetitive: one kit, many data files.
- **Done when:** every food venue in the checklist exists (dressed as its own place) or is scheduled to its neighborhood milestone, and delivery works.

### M6. Homes, crime, police and jail

- **Goal:** the GTA trouble loop at home and in shops.
- **Features:**
  - From "neighborhoods", and "players can live in any of them": the player's own apartment in a chosen neighborhood, with the window view and street matching it. Furniture and decor from M4. Cooking with groceries.
  - From "players can break into other players' homes if they leave the door unlocked": door locks start locked; the owner can lock and unlock; an unlocked door can be opened by anyone, with an intruder warning.
  - From "u can use guns in your own home … shoot them or call the police": the home gun. Shooting knocks the intruder out (cartoon, no blood); they wake at the hospital and drop what they carried. Calling the police brings NPC officers who arrest and jail the intruder. Stolen-item return and reporting.
  - Jail: a cell block, yard, phone, card games and push-ups. A sentence of a few minutes, shortened by good behaviour. Friends visit and post bail.
  - From "a way to shoplift … some places easier than others … harder consequences": stealth pocketing with NPC and camera sight cones, mirrors, tag alarms, crowd cover and a suspicion meter. Difficulty runs easy, medium or hard by store. Consequences are a warning plus a one-day store ban, a coin fine, or arrest and jail scaled by item value, rising for repeat offences. Stolen items carry a "stolen" tag, and staff can recognise them.
  - Car theft for unlocked cars, with police recovery.
  - Safety rules: homes lock themselves while the owner is offline, blocked players can never enter, and repeated break-ins trigger an automatic block and a report.
- **Dependencies:**
  - Shoplifting, the jail and police NPCs and the single-player apartment can ship before M9.
  - Player-vs-player break-ins, car theft between players and friend bail need M9 (server-owned homes and items).
  - Split M6 into **M6a** (single-player: apartment, decorating, shoplifting, jail, police) and **M6b** (after M9: break-ins, home defence, friend bail, car theft).
- **Modules:** `src/game/home/`, `src/game/crime/` (stealth, suspicion, penalties), `src/game/police/`, `src/game/jail/`, `src/client/rooms/home/`, `src/client/rooms/jail/`, `server/src/homes.ts` (M6b), and new D1 tables for homes and items (M6b).
- **Tests:**
  - Unit: sight-cone detection; suspicion meter rules; penalty table by store and value; repeat-offence scaling; jail timer and bail; the lock state machine; the offline auto-lock; the block preventing entry; harassment auto-block.
  - Playwright: shoplift at the bodega (pass) and at the jewelry store (caught, jailed, pay bail); decorate the apartment.
- **Size:** XL (M6a L, M6b L).
- **Done when:** M6a works offline; M6b works between two real clients in the smoke test.

### M7. Game zones and the games roster

- **Goal:** the full games roster, with guns only in game zones.
- **Features:**
  - From "guns", decided as "game zones only" plus your own home: the shooting range (targets, timed drills, pistol to rifle), paintball, laser tag, the carnival shooting gallery, the water-gun battle and the alien invasion arcade shooter. Players pick up a gun on entering a zone and return it on leaving. Hits are paint or light, never blood.
  - From "i don't want anything involving zombies": no zombies anywhere. The arcade shooter's enemies are aliens.
  - From "variety of games, single player and multiplayer, easy and hard, different themes": every game in the section 5 roster, landing one per batch and alternating solo and multiplayer. Multiplayer-only games play against bots or as local turns until M9.
  - The rest of the Water Park and Amusement Park content: wave pool, lazy river, cliff-dive lagoon, cabanas and pool bar, night swim, log flume, haunted house, photo booth.
- **Dependencies:** M1 to M3 for host places. Games in M8 places land with those places.
- **Modules:** `src/minigames/<game>/` per game (engine plus view), and `src/game/weapons/` (zone check, pickup and return).
- **Tests:**
  - Unit: each game engine's rules, scoring and difficulty; the weapon zone check fails outside a zone.
  - Playwright: each game launches, plays one round, pays coins and passes axe.
- **Size:** XL, ongoing across later milestones.
- **Done when:** every roster game is playable and no gun can exist outside a zone or the owner's home.

### M8. Neighborhoods and remaining districts

- **Goal:** the whole map.
- **Features**, one neighborhood per batch, each a city tile block with its own look, music, NPCs, time-of-day mood, bus stop and taxi rank:
  - **Little Manila:** jeepneys, parol lanterns, karaoke spilling outside, Filipino restaurants, the ube bakery, the Filipino grocery, a sari-sari store.
  - **Chinatown and Koreatown:** red lanterns, a night market, K-pop storefronts, dim sum, hot pot, noodles, KBBQ, the Asian supermarket, boba.
  - **The Arts District:** murals, warehouses, thrift and record stores, the tattoo studio, the techno warehouse club, cafes.
  - **Beachside:** the boardwalk, pastel houses, surf shops, the beach (pier, bonfire, surf break, volleyball), and the Water Park gate moved here.
    - **Mermaid Cove**, from "mermaids… they're real, in a specific ocean/beach": sea caves, a coral lagoon, rocks where mermaids sit and sing, a sunken ship to explore while swimming. Everyone can see them.
    - **Marina**, from "jets, yachts, boats": docks, a yacht club bar, a party yacht that sails to a private island, speedboat and jet-ski rentals, rowboats. Vehicles are free.
  - **Airport and private jets:** a terminal lounge and a private jet with a cabin party that flies to vacation spots (tropical island, snowy mountain town, city rooftop).
  - **Uptown:** brownstones, wine bars, the patisserie, the bistro, the tasting-menu restaurant, and Park and Gardens (picnic lawn, boating lake, night-sky lookout, and the misty grove where Lanmaoa grows, which is 18+ to eat).
    - **Zoo**, from "zoo": savanna walk with a lion pride (the lion nod), giraffe deck, penguin house (the Club Penguin nod), monkey canopy walk, reptile house, petting area and safari tram.
    - **Aquarium**, from "aquarium": shark tunnel, jellyfish glow room, reef tank, touch pool, otter and seal show, underwater cafe.
  - **Hillside Winter Town:** the ice rink with free and couple skating, a hot cocoa stand, the cabin lodge. From "ice-skating rinks".
  - **Sports Complex**, from "sports": shooting range, paintball, basketball, soccer, tennis, bowling, mini golf and a gym.
  - **Suburbia:** cul-de-sacs, a 2000s strip mall, the supermarket, the dead mall secret, the drive-in diner with roller-skating servers, high-school nostalgia spots.
  - **Fashion District:** boutiques, salon, nail bar and a runway (runway battle). The upstairs massage parlor waits for M10.
  - **Fairground:** the Amusement Park and Speedway gates move here.
- **Dependencies:** M1 and M2 (city, cars). The restaurant, shop and NPC kits from M3 to M5.
- **Modules:** `src/game/city/neighborhoods/<name>.ts`, `src/client/city/kits/<style>/`, and `src/client/rooms/<venue>/` for gated venues.
- **Tests:**
  - Unit: each neighborhood joins the road graph; every door targets a room; a bus stop exists.
  - Playwright: fast-travel to each neighborhood; enter one gated venue per batch.
- **Size:** XL, the longest milestone.
- **Done when:** every neighborhood and district in the content spec is reachable and populated.

### M9. Multiplayer wiring

- **Goal:** play together. The user said "multiplayer can come later", so it lands after the core world.
- **Features:**
  - From "multiplayer", "anonymous mode" and "which is scalable": wire `OnlineSession` into the 3D client. Guests by default, accounts optional. Remote dolls show their look (including the swimsuit), movement, dances, rides, vehicles and buzz icons.
  - City regions as Durable Objects with copies and border interest management. Movement messages carry vehicle state.
  - Chat with the server-enforced drunk effect. Friends, presence, block, mute and report everywhere, plus admin tools.
  - Multiplayer versions of the roster games.
  - Server-owned items for the player-to-player swap rack.
  - M6b (break-ins, home defence, friend bail, car theft).
- **Dependencies:** M1 to M8 content. The `server/` foundation from M0.
- **Modules:** `src/client/net/` (React binding of `src/net/client/`), `server/src/regions.ts`, `server/src/items.ts`, new D1 migrations.
- **Tests:**
  - Unit: region handover, interest radius, move throttling.
  - Server smoke: two clients see each other in a region and across a border.
  - Playwright: two browser contexts in one room.
  - A load test of 500 simulated players across regions, staying within the free plan's CPU limits.
- **Size:** XL.
- **Done when:** two real players can meet in the city, ride together, dance together and play a multiplayer game, with moderation working.

### M10. Accounts, age gate and the 18+ area

- **Goal:** the second age tier, which ships only after the age gate.
- **Features:**
  - From the decided two tiers and "worry about age verification later": a birthdate entered at signup and locked on the server. Under 16 cannot create an account. The 18+ area unlocks automatically on the player's 18th birthday. Guests never see 18+ content.
  - From "weed… makes u feel high", free props, 18+ only: a weed lounge, plus the smoke shop, with the high effect: shifting colours, soft glow, slight slow motion, motion trails, dreamy reverb, a munchies bubble and giggle emotes.
  - From "i want shrooms": the psychedelic trip, with breathing surfaces, rainbow colour cycling, crawling patterns, swaying plants and lamps, whimsical NPC bubbles and a swirling audio filter. No strobing. Reduced motion keeps only colour and audio.
  - From "Lanmaoa asiatica… little people, such as elves": tiny elves marching, climbing, riding drinks, dancing and scattering, visible only on the player's own screen and never mentioned in the UI. It grows in the Park and Gardens grove and is sold at the Yunnan hot-pot stall.
  - From "a strip club and massage parlor (with happy endings)… secret… dont cater towards men… lesbians but open to anyone":
    - The strip club sits behind the speakeasy's unmarked door, reached with a bartender password.
    - The massage parlor sits upstairs from the nail bar, behind the "full treatment" door.
    - No sign, no map pin, no UI mention. Women and queer women first, with mixed-gender staff available. Velvet booths, a candlelit spa, a sapphic playlist.
    - Suggestive only, no nudity. The happy ending is implied by a fade to black.
    - Services are free, tips are cosmetic, and couples can share a VIP booth or massage room.
- **Dependencies:** M9 (server-held birthdate and accounts), M3 (speakeasy), M4 (nail bar), M8 (Park and Gardens).
- **Modules:** `server/src/age.ts`, a D1 migration for the birthdate, `src/game/effects/{high,trip,lanmaoa}.ts`, `src/client/effects/`, `src/client/rooms/adult/` loaded only after a server age check.
- **Tests:**
  - Unit: age computation across time zones, leap days and the 18th birthday; the guest and under-18 deny paths.
  - Server: an 18+ room join is rejected without the flag.
  - Playwright: an under-18 account cannot reach the door; an 18+ account can.
  - A build check that the 18+ scenes are not loaded or bundled into the default path for under-18 players.
- **Size:** L.
- **Done when:** the gate is enforced by the server, and every 18+ venue and effect is reachable only behind it.

### M11. Polish, performance, accessibility and launch

- **Goal:** ready for real players.
- **Features:**
  - Performance on the low tier: 30 fps on a mid phone, under 250 draw calls, under 300k triangles. On the high tier, a frame time of 16 ms or less.
  - Accessibility: keyboard play, screen-reader labels on all UI, axe-clean dialogs, reduced motion everywhere, an effects intensity setting, a wheelchair doll in every place.
  - A day–night clock and neighborhood moods (city phase 2), traffic and pedestrians tuned.
  - Moderation tooling and the threat model reviewed against `docs/security.md`.
  - Regenerate every screenshot.
  - Optional: a public landing page (only if the user asks).
  - Deploy, following `docs/deploy.md`, only with the user's explicit approval. Never run `wrangler deploy` or `wrangler login` without it.
- **Dependencies:** everything.
- **Size:** L.
- **Done when:** the performance budgets are measured and met, the a11y suite is green, and the user approves the deploy.

---

## 5. Games roster with milestones

| Game | Place | Mode | Difficulty | Theme | Milestone |
|---|---|---|---|---|---|
| Bassline DJ rhythm | dance club | solo | hard | music | exists; launched from the world in M3 |
| Last Call cocktail mixing | rooftop bar | solo | easy | bartending | exists; launched from the world in M3 |
| Karaoke | karaoke bar | solo or multi | easy | music | M3 |
| Speed slide race | Water Park | multi | medium | water | M7 |
| Cliff dive tricks | Water Park | solo | hard | water | M7 |
| Water gun battle | Water Park | multi | medium | water | M7 |
| Pool volleyball | Water Park | multi | medium | sports | M7 |
| Bumper cars | Speedway | multi | easy | party | M2 |
| Race track: kart and car races | Speedway | solo time trial or multi | easy to hard | racing | M2 (multi in M9) |
| Haunted house | Amusement Park | solo | medium | horror | M7 |
| Carnival booths: ring toss, whack-a-mole, shooting gallery | Amusement Park | solo | easy to hard | carnival | M7 |
| Jet-ski race | Marina | multi | medium | water racing | M8 |
| Yacht party DJ set and dance-off | party yacht | multi | easy | party | M8 |
| Fishing off the dock | Marina | solo | easy | chill | M8 |
| Figure skating tricks | Ice Rink | solo | medium to hard | winter | M8 |
| Curling | Ice Rink | multi | easy | winter | M8 |
| Basketball shootout | Sports Complex | solo or multi | easy to hard | sports | M8 |
| Penalty kicks | Sports Complex | solo or multi | easy | sports | M8 |
| Tennis | Sports Complex | multi | medium | sports | M8 |
| Bowling | Sports Complex | multi | easy | sports | M8 |
| Mini golf | Sports Complex | solo or multi | easy | sports | M8 |
| Dance battle | any club | multi | medium | dance | M3 |
| Safari photo hunt | Zoo | solo | easy | animals | M8 |
| Feeding time | Zoo | solo | easy | animals | M8 |
| Reef dive spotter | Aquarium | solo | medium | ocean | M8 |
| Seal show tricks (rhythm) | Aquarium | solo or multi | medium | ocean | M8 |
| Shooting range | Shooting range | solo | easy to hard | action | M7 |
| Paintball arena | Sports Complex | multi | medium | action | M7 |
| Laser tag | arcade bar | multi | medium | action | M7 |
| Alien invasion arcade shooter (no zombies) | arcade bar | solo or co-op | medium to hard | sci-fi action | M7 |
| Runway battle with player voting | Fashion District | multi | medium | fashion | M8 (voting in M9) |
| Trivia night (2000s pop culture) | arcade bar | multi | medium | nostalgia | M3 |
| Surf | Boardwalk | solo | hard | beach | M8 |
| Beach volleyball | Boardwalk | multi | medium | sports | M8 |
| Card table | speakeasy | multi | easy | chill | M3 |
| Match-3 puzzle | arcade bar | solo | easy to hard | arcade | M3 |
| Nail painting | nail salon | solo | easy to medium | beauty | M4 |
| Boba builder | boba shop | solo | easy | food | M5 |
| Halo-halo stacker | Filipino dessert spot | solo | easy to medium | food | M5 |
| Sushi conveyor catch | sushi bar | solo | medium | food | M5 |
| Ramen rush | ramen counter | solo | hard | food | M5 |
| Filipino cook-off | Little Manila | multi (2) | medium | food | M5 (venue in M8) |
| Delivery job | whole city | solo | easy to medium | racing | M5 |
| Jail card games and push-ups | jail | solo | easy | chill | M6a |

Multiplayer-only games play against bots or as local turns until M9.

---

## 6. Content checklist

Every venue in the content spec, grouped and assigned to a milestone. Tick a line when it ships.

**Hub and city**
- [ ] Downtown Plaza as the city square, with a fountain and a bus stop with the world map (M1)
- [ ] Bus stops and taxi ranks in every neighborhood (M1 to M8)

**Nightlife Row (M3)**
- [ ] Velvet Room
- [ ] Main dance club
- [ ] Y2K pop club
- [ ] Techno warehouse (built in Nightlife Row; the Arts District links it in M8)
- [ ] Latin night club
- [ ] Lesbian bar and dance floor
- [ ] Rooftop bar
- [ ] Karaoke bar
- [ ] Arcade bar
- [ ] Speakeasy (the secret door is wired in M10)

**Water Park (M1, completed in M7)**
- [ ] Entrance plaza
- [ ] Slide towers
- [ ] Wave pool
- [ ] Lazy river
- [ ] Splash zone
- [ ] Cliff-dive lagoon
- [ ] Cabanas and pool bar
- [ ] Night swim

**Amusement Park (M1, completed in M7)**
- [ ] Entrance gate
- [ ] Roller coaster
- [ ] Ferris wheel
- [ ] Drop tower
- [ ] Carousel
- [ ] Log flume
- [ ] Haunted house
- [ ] Swing ride
- [ ] Teacups
- [ ] Carnival midway
- [ ] Photo booth

**Speedway (M2)**
- [ ] Race track with grandstand and pit garage
- [ ] Bumper car arena

**Marina (M8)**
- [ ] Docks
- [ ] Yacht club bar
- [ ] Party yacht to a private island
- [ ] Speedboat and jet-ski rentals
- [ ] Rowboats

**Airport (M8)**
- [ ] Terminal lounge
- [ ] Private jet cabin party
- [ ] Vacation spots: tropical island, snowy mountain town, city rooftop

**Ice Rink and Winter Village (M8)**
- [ ] Rink with free and couple skating
- [ ] Hot cocoa stand
- [ ] Cabin lodge

**Sports Complex (M7 and M8)**
- [ ] Shooting range
- [ ] Paintball
- [ ] Basketball
- [ ] Soccer
- [ ] Tennis
- [ ] Bowling
- [ ] Mini golf
- [ ] Gym

**Zoo (M8)**
- [ ] Savanna walk with a lion pride
- [ ] Giraffe deck
- [ ] Penguin house
- [ ] Monkey canopy walk
- [ ] Reptile house
- [ ] Petting area
- [ ] Safari tram

**Aquarium (M8)**
- [ ] Shark tunnel
- [ ] Jellyfish glow room
- [ ] Coral reef tank
- [ ] Touch pool
- [ ] Otter and seal show
- [ ] Underwater cafe and lounge

**Mermaid Cove (M8)**
- [ ] Sea caves
- [ ] Coral lagoon
- [ ] Mermaid rocks
- [ ] Sunken ship

**Boardwalk and Beach (M8)**
- [ ] Pier
- [ ] Bonfire
- [ ] Surf break
- [ ] Volleyball court

**Fashion District (M4 and M8)**
- [ ] Boutiques
- [ ] Salon
- [ ] Nail bar
- [ ] Runway

**Park and Gardens (M8)**
- [ ] Picnic lawn
- [ ] Boating lake
- [ ] Night-sky lookout
- [ ] Misty Lanmaoa grove (eating it is M10)

**Home (M6)**
- [ ] Own apartment, decorated, visitable by friends (visits in M9)

**Jail, hospital and police (M6a)**
- [ ] Jail cell block, yard and phone
- [ ] Hospital wake-up spot
- [ ] Police NPCs

**18+ area (M10)**
- [ ] Weed lounge
- [ ] Smoke shop
- [ ] Secret strip club
- [ ] Secret massage parlor

**Food Street (M5; neighborhood venues land with their neighborhood in M8)**
- [ ] Turo-turo and carinderia
- [ ] Jollibee-inspired fried-chicken and spaghetti joint (original name)
- [ ] Ube bakery
- [ ] Matcha bar
- [ ] Boba tea shop
- [ ] Korean BBQ
- [ ] Ramen counter
- [ ] Sushi conveyor
- [ ] Taco truck
- [ ] Pizza-by-the-slice window
- [ ] Dim sum teahouse
- [ ] Pho shop
- [ ] Thai street-food stall
- [ ] Crêperie
- [ ] Bagel deli
- [ ] 24-hour diner
- [ ] Donut shop
- [ ] Gelato cart
- [ ] Halal cart
- [ ] Yunnan mushroom hot pot

**Cafes (M5)**
- [ ] Bookshop cafe
- [ ] Cat cafe
- [ ] Dog cafe
- [ ] Plant cafe
- [ ] Y2K internet cafe
- [ ] Board-game cafe
- [ ] Espresso bar
- [ ] Parisian patisserie
- [ ] Japanese kissaten
- [ ] Korean bingsu cafe
- [ ] Cha chaan teng
- [ ] Taiwanese night-market row
- [ ] Vietnamese cà phê stand
- [ ] Turkish coffee and baklava house
- [ ] Moroccan mint-tea lounge
- [ ] British afternoon tea
- [ ] Juice and smoothie bar
- [ ] Açaí shack
- [ ] Pastel dessert parlor (original characters)
- [ ] Cereal bar
- [ ] Crêpe and waffle stand
- [ ] Churro cart
- [ ] Cupcake bakery
- [ ] Cookie dough shop
- [ ] Mochi donut shop
- [ ] Pick-and-mix candy store
- [ ] Chocolate shop
- [ ] 24-hour convenience store

**Restaurants, more (M5)**
- [ ] Lechon and kamayan hall
- [ ] Filipino BBQ skewers
- [ ] Silog breakfast
- [ ] Indian curry
- [ ] Dosa counter
- [ ] Momo stand
- [ ] Hand-pulled noodles
- [ ] Sichuan hot pot
- [ ] Peking duck
- [ ] Izakaya
- [ ] Yakitori
- [ ] Okonomiyaki
- [ ] Korean fried chicken pub
- [ ] Tteokbokki
- [ ] Poke and plate lunch
- [ ] Taqueria
- [ ] Tex-Mex cantina
- [ ] Peruvian ceviche
- [ ] Brazilian churrascaria
- [ ] Argentinian grill
- [ ] Cuban sandwich counter
- [ ] Puerto Rican lechonera
- [ ] Caribbean jerk shack
- [ ] Jamaican patty shop
- [ ] Soul food kitchen
- [ ] Cajun crawfish boil
- [ ] Texas BBQ
- [ ] NY steakhouse
- [ ] Burger joint
- [ ] Hot dog stand
- [ ] Fish and chips
- [ ] Trattoria
- [ ] Neapolitan pizzeria
- [ ] Pasta bar
- [ ] Tapas bar
- [ ] Gyro shop
- [ ] Kebab grill
- [ ] Lebanese mezze
- [ ] Ethiopian injera
- [ ] Nigerian jollof
- [ ] Moroccan tagine
- [ ] French bistro
- [ ] Fondue chalet
- [ ] German beer hall
- [ ] Swedish meatball cafeteria
- [ ] Vegan bowls
- [ ] Salad spot
- [ ] Oyster and seafood bar
- [ ] Rooftop omakase
- [ ] Tasting-menu date restaurant
- [ ] Drive-in burger diner with roller-skating servers

**Malls (M4; the dead mall in M8)**
- [ ] Y2K mega-mall (atrium, escalators, fountain, food court, arcade, photo-sticker booth, cinema, pretzel stand)
- [ ] Outdoor luxury street
- [ ] Retro dead mall

**Stores (M4; the smoke shop in M10)**
- [ ] Style boutiques (Y2K, streetwear, glam evening, cottagecore, goth/alt, athleisure, lingerie, swimwear)
- [ ] Shoe store and sneaker shop
- [ ] Jewelry and accessories, handbags, hats and wigs, sunglasses kiosk
- [ ] Sephora-style beauty store, beauty supply store, K-beauty shop, drugstore aisle, perfume counter, nail polish bar
- [ ] Tattoo and piercing studio
- [ ] Furniture and decor, plant shop, pet shop
- [ ] Bookstore, record store, phone and gadget store, toy and collectibles, crystal and tarot
- [ ] Smoke shop (18+, M10), liquor store
- [ ] Flower shop, party supply, bridal and formal, sports gear

**Groceries (M4)**
- [ ] Supermarket
- [ ] Filipino grocery
- [ ] Asian supermarket
- [ ] Farmers market
- [ ] Bodega with a cat

**Thrift and vintage (M4)**
- [ ] Thrift stores with daily restock
- [ ] Vintage boutique
- [ ] Weekend flea market
- [ ] Consignment resale
- [ ] Swap rack (player-to-player in M9)

**Salons (M4)**
- [ ] Glam salon
- [ ] Braiding shop
- [ ] Barbershop
- [ ] Korean perm and colour salon
- [ ] Walk-in salon
- [ ] Neighborhood nail salon
- [ ] Luxe nail studio

**Vehicles**
- [ ] Starter cars, kart and bumper cars (M2)
- [ ] Customization garage (M4)
- [ ] Scooter (M5)
- [ ] Yacht, speedboats, jet skis and rowboats (M8)
- [ ] Private jet (M8)

---

## 7. Cross-cutting rules

These hold in every milestone.

- **No real brands.** No real car makes, chains, restaurants, stores, apps or logos. Everything has an original name. Never use the trademarked doll brand name or logo; say "doll". Each catalogue, roster and line bank has a banned-word test.
- **No AI dialogue.** Every NPC line is handwritten data in `src/game/dialogue/`. Writing more lines is a content task.
- **Age tiers.** The main world is 16+ and includes drinks. Weed, shrooms, Lanmaoa, the smoke shop, the strip club and the massage parlor are 18+. 18+ venues must not reach real players before the server-side age gate ships in M10. No nudity anywhere.
- **Not for children.** No child-safety framing. Adult moderation tools instead: block, mute, report, kick, ban.
- **Guns only in game zones and the owner's home.** Cartoon hits, no blood. No zombies anywhere.
- **Effects never punish.** Every effect has an intensity setting, a reduced-motion fallback and no strobing.
- **Inclusive by default.** Diverse dolls and NPCs, free gender expression, pronouns, and a wheelchair that works everywhere.
- **Audio.** Procedural Web Audio only. No audio files.
- **Code.**
  - TypeScript strict: no `any`, no needless `as`.
  - React 19 types via `import type { JSX } from "react"`.
  - Validate everything from the network or `localStorage`.
  - Rules live in `src/game/`, pure and tested.
- **Builds and CPU.**
  - Use at most 6 of 12 cores: `taskset -c 6-11`.
  - Playwright runs with `--workers=2`.
  - Free resources when done: kill dev servers and browsers; delete `dist/`, `test-results/` and temp files; remove merged worktrees.
- **Process.**
  - Parallel agents work in git worktrees under `.worktrees/`, one branch each.
  - The orchestrator merges one branch at a time with `--no-ff` after a rebase, `npm run verify` and the relevant Playwright spec.
  - Focused Conventional Commits.
  - Every visual milestone shows its screenshots to the user.
- **Never push or deploy without the user's approval.** That includes `git push`, `wrangler deploy`, `wrangler login` and any Cloudflare account change.
- **Club Lion is separate.** It is a different project for a different audience. Nothing from Daydaze goes into it.

---

## 8. Risks and open decisions

### Risks

| Risk | Mitigation |
|---|---|
| Scope: the content list is very large. | Kits plus data: one restaurant kit, one shop kit, one facade kit. Venues are data files. Ship playable slices per milestone. |
| Phone performance with a streamed city and maximalist neon. | Instancing, LOD, emissive materials instead of lights, quality tiers, and budgets measured in M11. |
| Headless WebGL tests are slow (SwiftShader). | `--workers=2`, few Playwright cases per feature, and logic tested in Node. |
| Cloudflare free-plan limits: 10 ms CPU per request; PBKDF2 at 100k iterations is estimated at 30–80 ms (unverified). | Measure before launch. Move login to the Paid plan or reduce iterations behind a review. Regions keep Durable Object load spread. |
| Client-owned coins can be cheated. | Accepted until trading exists (VISION). M9 moves items and homes to the server. |
| Trademark and lookalike risk (cars, the Jollibee-style joint, the Sephora-style store, the DoorDash-style app, the Hello-Kitty-style parlor). | Original names, logos and mascots. Banned-word tests. A design review of each lookalike before it ships. |
| Adult content reaching minors. | A server-enforced gate (M10). 18+ scenes are not loaded for under-18 players. Secret venues have no UI mention. |
| Harassment through break-ins and theft. | Offline auto-lock, blocks, automatic harassment blocking and reports, admin bans. |
| Several Playwright-heavy agents at once overload the machine. | At most about 3 scene agents in parallel, plus pure-logic agents. |

### Open decisions for the user

1. **Mango references.** `docs/VISION.md` still says "Subtle mango references wherever they fit". The content spec says "Mango stays a rare easter egg", and the only remaining in-game mango is a guest-name adjective. Should VISION.md change to "one rare mango easter egg"? (Unanswered.)
2. **Speedway build method.** The Speedway plan asked whether to build it with a subagent and reviewer per task, or inline. The executing-plans skill was invoked, so it is running inline for now.
3. **Push to GitHub.** `main` is many commits ahead of `origin/main`. Push when the user approves.
4. **Landing page.** A public site was offered. Build it only if the user asks.
5. **Names.** All names (Daydaze districts, The Velvet Room, Bassline, Last Call, venue and car names) are placeholders the user may rename.

---

## 9. Appendix: traceability

One row per user request.

| # | User request | Spec section | Milestone |
|---|---|---|---|
| 1 | Multiplayer game with Club Penguin and Fantage nostalgia, not for children | VISION; online spec | M0, M9 |
| 2 | GTA meets IMVU meets Fantage | VISION "one-line pitch"; city spec | M1 to M11 |
| 3 | 3D like Roblox, IMVU-style real 3D | VISION "Renderer" | M0 |
| 4 | Maximalist design | VISION "What it feels like" | every milestone |
| 5 | In-game customization; doll-like avatars without an artist | VISION; client spec "Doll and look" | M0, M4 |
| 6 | Two age tiers | VISION "Age tiers" | M10 |
| 7 | Scalable stack (Cloudflare, option A), $0 to start | VISION "Platform"; online spec | M0, M9 |
| 8 | Age verification later | VISION; online spec | M10 |
| 9 | Anonymous mode, no account needed | online spec "Guests" | M0, M9 |
| 10 | Games not about mangos: variety, solo and multi, easy and hard, themes | content spec "Intent", "Games roster" | M3, M5, M7, M8 |
| 11 | A lot of places | content spec "Districts and places" | M1 to M8 |
| 12 | Amusement park with a ton of rides | Districts table; "Rides" | M1, M7 |
| 13 | Water park with rides and activities; swimsuit on entry | Districts table; "Water Park swimsuit" | M1, M7 |
| 14 | Weed and alcohol with drunk and high effects; free | "Drunk and high effects" | M3 (alcohol), M10 (weed) |
| 15 | Sapphic and lesbian themes | "Sapphic themes" | M3 and throughout |
| 16 | Race track and bumper cars | Districts table (Speedway); Speedway plan | M2 |
| 17 | Multiplayer later; I pick names | "Build order" | M9 |
| 18 | Several clubs, dancing, NPCs (bouncers, cashiers) so it isn't lonely | "Dancing"; "Non-player characters" | M1 (dialogue), M3 |
| 19 | Female avatars with curvy bust and butt | "Body shape" | M4 |
| 20 | Jets, yachts, boats, ice rinks, sports, dances | Districts (Marina, Airport, Ice Rink, Sports); "Vehicles"; "Dancing" | M3, M8 |
| 21 | Zoo and aquarium | Districts (Zoo, Aquarium) | M8 |
| 22 | Shrooms | "Drunk and high effects" | M10 |
| 23 | Mermaids, real, in a specific beach | Districts (Mermaid Cove) | M8 |
| 24 | Lanmaoa asiatica showing little people (elves) | "Drunk and high effects" | M8 (grove), M10 (effect) |
| 25 | Secret strip club and massage parlor, lesbian-leaning, open to all | "Secret 18+ venues" | M10 |
| 26 | See progress soon (Water Park screenshots) | — | M1 |
| 27 | Many restaurants and cafes: Filipino, matcha, boba, ube, a Jollibee-style joint, and more (~100) | "Food and cafes"; Districts (Food Street, Cafes, Restaurants) | M5, M8 |
| 28 | Malls, variety of stores, thrift shops | "Shopping"; Districts (Malls, Stores, Thrift) | M4, M8 (dead mall) |
| 29 | Grocery store | Districts (Groceries) | M4 |
| 30 | DoorDash-style app | "Food and cafes" (delivery) | M5 |
| 31 | Different neighborhoods | "Neighborhoods"; city spec | M1, M8 |
| 32 | Diversity in the characters | "Diverse characters" | M4 and NPCs throughout |
| 33 | Makeup and beauty supply shop | Districts (Stores) | M4 |
| 34 | Hair salon | "Hair salon and beauty services" | M4 |
| 35 | Nail salon | "Hair salon and beauty services" | M4 |
| 36 | Guns, in game zones only | "Guns" | M7 |
| 37 | Nothing involving zombies | "Guns"; Games roster (alien shooter) | M7 |
| 38 | Guns at home; break-ins on unlocked doors; shoot or call the police; jail | "Homes, break-ins, police and jail" | M6a, M6b |
| 39 | Shoplifting with a chance of jail or bail, by place | "Shoplifting" | M6a |
| 40 | Cars from cheap to expensive, accurate, GTA-style lookalikes | "Cars"; Speedway plan | M2, M4 |
| 41 | NPCs with a ton of lines per situation, no AI | "Non-player characters" | M1 and every milestone |
| 42 | Keep developing; progress updates; free resources; cores 6-11 | process rules | all |
| 43 | Don't push or deploy without asking | process rules | all, M11 |
| 44 | Existing minigames launched from the world | Games roster | M3 |
| 45 | Pets and lions, low priority | VISION; Zoo lion pride; pet shop | M4 (pets), M8 (zoo) |
| 46 | Open city with interiors behind doors; gated venues; Downtown and Nightlife Row first; city next | city spec "Decisions" | M1, M2, M8 |
| 47 | Name Daydaze; rename Mango Room and Mango Decks | VISION; commits | M0 |
