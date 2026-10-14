# World and Content: Districts, Places, Games and Effects

Date: 2026-10-14
Status: Draft for review

## Intent

Daydaze needs a lot of places to hang out and explore, and a wide variety of games. Games are not mango-themed. Mango stays a rare easter egg. The roster mixes single-player and multiplayer, easy and hard, and many themes. Sapphic and lesbian themes are part of the game's identity.

This spec lists what the world contains and how the shared systems behave. Each district and each game gets its own implementation plan later.

## World structure

The world is a set of districts joined by portals, with Downtown Plaza as the hub. Each place is a 3D room defined as data in `src/game/rooms.ts`, the same way the Plaza and the lounge are today. Every room has a cap and splits into numbered copies, as in the online foundation spec.

### Districts and places

| District | Places |
|---|---|
| Downtown Plaza (hub) | street, fountain, bus stop with the world map |
| Nightlife Row | The Velvet Room lounge, several clubs (a main dance club, a Y2K pop club, a techno warehouse, a Latin night club, the lesbian bar's dance floor), rooftop bar, karaoke bar, arcade bar, speakeasy |
| Water Park | entrance plaza, slide towers, wave pool, lazy river, splash zone, cliff-dive lagoon, cabanas and pool bar, night swim |
| Amusement Park | entrance gate, roller coaster, ferris wheel, drop tower, carousel, log flume, haunted house, swing ride, teacups, carnival midway, photo booth |
| Speedway | race track with grandstand and pit garage, bumper car arena |
| Marina | docks, yacht club bar, a party yacht you can board and sail between the marina and a private island, speedboat and jet-ski rentals, rowboats |
| Airport and Private Jets | terminal lounge, a private jet with a cabin party you board to fly between districts and to vacation spots (tropical island, snowy mountain town, city rooftop) |
| Ice Rink and Winter Village | outdoor ice-skating rink with free skating and couple skating, hot cocoa stand, cabin lodge |
| Sports Complex | basketball court, soccer pitch, tennis court, bowling alley, mini golf, gym |
| Zoo | savanna walk with a lion pride (the lion nod), giraffe feeding deck, penguin house (the Club Penguin nod), monkey canopy walk, reptile house, petting area, safari tram ride |
| Aquarium | shark tunnel, jellyfish glow room (night-club lighting), coral reef tank, touch pool, otter and seal show, underwater cafe and lounge |
| Mermaid Cove | a hidden ocean cove past the beach where mermaids live and everyone can see them: sea caves, a coral lagoon, rocks where mermaids sit and sing, a sunken ship to explore while swimming |
| Food Street | Filipino turo-turo and carinderia (adobo, sinigang, lumpia, pancit, halo-halo), a red-and-yellow Filipino fried-chicken and spaghetti joint inspired by Jollibee (with its own original name and a bee-free mascot), an ube bakery (ube cheese pandesal, ube crinkles, ube ice cream), a matcha bar, a boba tea shop, a Korean BBQ grill, a ramen counter, a sushi conveyor bar, a taco truck, a pizza-by-the-slice window, a dim sum teahouse, a pho shop, a Thai street-food stall, a crêperie, a bagel deli, a 24-hour diner with milkshakes, a donut shop, a gelato cart, a late-night halal cart, a Yunnan mushroom hot-pot stall |
| Cafes | a cozy bookshop cafe, a cat cafe, a plant-filled Instagram cafe, a Y2K internet cafe with old computers and dial-up noises |
| Boardwalk and Beach | pier, bonfire, surf break, volleyball court |
| Fashion District | boutiques (shop), salon, nail bar, runway |
| Home | your own apartment, decorated, visitable by friends |
| Park and Gardens | picnic lawn, boating lake, night-sky lookout |
| 18+ area (behind the age gate) | weed lounge, plus two secret venues described below |

The current lounge, "The Mango Room", is renamed **The Velvet Room** so that no venue is mango-branded.

### Vehicles

Jets, yachts, speedboats, jet skis and rowboats are vehicles. A vehicle is a place feature like a ride: players board it, sit together, and either travel to another place (the jet and the yacht) or drive it around a water area (speedboats, jet skis, rowboats). Driving uses the same tap or keys as walking. Vehicles are free to use.

### Rides

A ride is a place feature that moves the player's doll along a fixed path while they watch. Riders can sit together, and other players see them riding. Rides are not games unless marked as games below. Every ride respects reduced motion with a gentler camera, and riding never forces fast camera motion: the player can switch to a fixed side view.

## Water Park swimsuit

- Entering any Water Park room shows the player's doll in their swimsuit look. Leaving the district restores the normal outfit.
- The saved outfit never changes. The swimsuit is a separate look slot in the save, chosen in the closet: one-piece, bikini, board shorts and rash guard, each tintable.
- Other players see the swimsuit too. The room's data marks it as a swimwear room, and the room server sends each player's active look.

## Secret 18+ venues

Both venues are part of the 18+ area and need the age gate. They are a secret: no sign, no map pin and no mention in the UI. Players find them by word of mouth and in-world clues.

- **The strip club** sits behind an unmarked door in the back of the speakeasy. A bartender NPC gives the knock or password when asked the right way.
- **The massage parlor** is upstairs from the nail bar in the Fashion District, reached through a "staff only" door that opens once the receptionist NPC has been asked for "the full treatment".
- Audience: built for women and queer women first, lesbian-leaning, and open to everyone. Not built around a male gaze. Dancers and masseuses are mostly women, with a mix of genders available. Decor, music and copy speak to women: velvet booths, a candlelit spa, a playlist of sapphic artists, flirty handwritten lines.
- Content limits: suggestive only. No nudity at any time; dancers keep lingerie or costumes on. A massage "happy ending" is implied with a fade to black and a cheeky line afterward, never shown.
- Services come from NPCs and are free, like drinks. Players can tip with coins as a cosmetic gesture.
- Players can bring a date: two players can share a VIP booth or a couples massage room.

## Food and cafes

- Every restaurant and cafe has a counter NPC (cashier or server), a menu with real dishes, and seating. Food is free, like drinks. Players order from the menu, get the item in hand, and eat it with an eating animation.
- Food lowers the drunk buzz faster, as the effects section says.
- Shared tables work as hangout spots: players can sit together, share a plate, and clink drinks.
- Trademarks: real chains are never named or copied. The Jollibee-inspired joint gets an original name, logo and mascot, keeping the vibe (red and yellow, fried chicken, sweet spaghetti, peach mango pie) without the brand.
- Food minigames, one per batch: boba builder (match the order: tea, milk, sugar level, toppings; easy), halo-halo stacker (stacking layers; easy to medium), sushi conveyor catch (medium), ramen rush (timed orders; hard), and a Filipino cook-off for two players (multi).

## Dancing

- Players can dance anywhere, and especially on club dance floors. A dance button opens a picker of dance moves. The doll loops the chosen move until the player moves or stops.
- Moves include a basic two-step, a body roll, a hair flip, a Y2K shuffle, voguing, a twerk, and a slow dance.
- On a club floor, dancing on the beat (shown by pulsing tiles) earns a small streak glow. It is optional: no score, no failure.
- Couple dances (slow dance, partner spin) work for any two dolls, and against NPCs until multiplayer exists.
- Moves are animation clips on the doll rig, so new moves are data, not code.
- Dance events: a scheduled club "dance-off" where players take turns on a spotlight and others cheer, and partner dances on the ice rink and the yacht deck.

## Non-player characters

Places have a few scripted non-player characters (NPCs) so they never feel empty. NPCs use fixed, handwritten lines. No AI-generated dialogue.

- Clubs: a bouncer at the door who nods you in, a DJ in the booth, a bartender, dancers on the floor, a coat-check attendant.
- Bars and lounge: bartender, regulars at the bar, a server.
- Shops and the salon: a cashier, a stylist.
- Water Park: lifeguard, snack-bar cashier, swimmers and sunbathers.
- Amusement Park and Speedway: ride operators, a ticket booth cashier, a carnival barker, a pit crew.
- NPCs idle, dance or walk short loops, and show a speech bubble with a random line when a player is near or taps them. Some offer an action (the bartender hands you a drink, the stylist opens the salon).
- NPCs use the same doll system as players, so they wear real outfits and look like part of the world.

## Body shape

- The doll body has shape controls in the closet: bust, hips and butt, waist, and height, each a slider with a sensible range, for curvy doll proportions.
- Outfits are built to follow the body shape.
- Clothed at all times outside the 18+ area, which is suggestive but has no nudity.

## Games roster

| Game | Place | Mode | Difficulty | Theme |
|---|---|---|---|---|
| Bassline DJ rhythm (exists as Mango Decks, renaming) | dance club | solo | hard | music |
| Last Call cocktail mixing (exists, re-theming) | rooftop bar | solo | easy | bartending |
| Karaoke | karaoke bar | solo or multi | easy | music |
| Speed slide race | Water Park | multi | medium | water |
| Cliff dive tricks | Water Park | solo | hard | water |
| Water gun battle | Water Park | multi | medium | water |
| Pool volleyball | Water Park | multi | medium | sports |
| Bumper cars | Speedway | multi | easy | party |
| Race track: kart and car races on several tracks | Speedway | solo time trial or multi | easy to hard | racing |
| Haunted house | Amusement Park | solo | medium | horror |
| Carnival booths: ring toss, whack-a-mole, shooting gallery | Amusement Park | solo | easy to hard | carnival |
| Jet-ski race | Marina | multi | medium | water racing |
| Yacht party DJ set and dance-off | party yacht | multi | easy | party |
| Fishing off the dock | Marina | solo | easy | chill |
| Figure skating tricks | Ice Rink | solo | medium to hard | winter |
| Curling | Ice Rink | multi | easy | winter |
| Basketball shootout | Sports Complex | solo or multi | easy to hard | sports |
| Penalty kicks | Sports Complex | solo or multi | easy | sports |
| Tennis | Sports Complex | multi | medium | sports |
| Bowling | Sports Complex | multi | easy | sports |
| Mini golf | Sports Complex | solo or multi | easy | sports |
| Dance battle | any club | multi | medium | dance |
| Safari photo hunt | Zoo | solo | easy | animals |
| Feeding time (match food to animals) | Zoo | solo | easy | animals |
| Reef dive spotter | Aquarium | solo | medium | ocean |
| Seal show tricks (rhythm) | Aquarium | solo or multi | medium | ocean |
| Runway battle with player voting | Fashion District | multi | medium | fashion |
| Trivia night (2000s pop culture) | arcade bar | multi | medium | nostalgia |
| Surf | Boardwalk | solo | hard | beach |
| Beach volleyball | Boardwalk | multi | medium | sports |
| Card table | speakeasy | multi | easy | chill |
| Match-3 puzzle | arcade bar | solo | easy to hard | arcade |

Games run as 2D overlays launched from a hotspot in their place, like the existing minigames. Rewards are coins, which stay client-owned until trading exists.

## Drunk and high effects

Drinks and weed are free props: a player grabs one at a bar or the lounge. Alcohol is in the main 16+ world. Weed is only in the 18+ area.

- Each prop adds to a buzz meter with a cap. The meter fades over a few minutes. Water and food lower it faster.
- Drunk: gentle camera sway, a slight edge blur, a wobbly walk and idle lean, chat that sometimes stretches or swaps letters ("heyyy"), warmer and more muffled music.
- High: richer, slowly shifting colors and a soft glow, slight slow motion, motion trails behind dolls, dreamy music with reverb, a munchies thought bubble and giggle emotes.
- Shrooms (18+ area only, like weed): the world turns psychedelic. Surfaces breathe and ripple slowly, colors cycle in soft rainbow gradients, patterns crawl gently across the floor and walls, plants and lamps sway as if alive, NPC speech bubbles turn whimsical, and the music gains a warped, swirling filter. The trip lasts a little longer than a buzz and fades out gently. Same rules: optional, intensity setting, no strobing or flashing, and reduced motion keeps only color and audio changes.
- Lanmaoa asiatica, a real Yunnan mushroom famous for making people see "little people". Players find it in a misty forest grove in Park and Gardens and at a Yunnan-style mushroom hot-pot stall. Eating it is 18+, like shrooms. Its effect is a crowd of tiny people, a few centimetres tall, mostly elves with pointed ears, little hats and tunics: they march in lines across the floor, climb furniture, ride on drinks, dance on tables, wave at the player and scatter when the player walks through them. There is no colour or camera change, so the world looks normal except for them. Like mermaids, they are drawn only on the player's own screen and never mentioned in the UI.
- Other players see a buzzed doll's wobble and a small icon by the name. The chat effect is applied by the server, so it can't be faked or skipped in someone else's view.
- Effects never punish a player and never block a game. A buzz may make a carnival booth slightly harder.
- Settings has an effects intensity control: off, low, full. With reduced motion there is no sway, blur or slow motion; only color and audio change. No strobing or flashing at any setting.

## Sapphic themes

- A lesbian bar on Nightlife Row with its own look, playlist, regulars, posters, signage and menu.
- The lesbian sunset flag and other pride flags as room decor and clothing prints.
- Couple emotes and slow dancing for any two dolls: holding hands, forehead kiss, piggyback ride.
- Sapphic pop-culture nods in posters, neon-sign puns, song-title jokes and carnival prize names.
- Date spots: the ferris wheel, cabanas and the night-sky lookout.
- A recurring pride night event at the dance club.

## Build order

1. Water Park district, including the swimsuit slot.
2. Amusement Park district.
3. Speedway: race track and bumper cars.
4. Nightlife Row, including the lesbian bar, and the drunk effect.
5. Multiplayer wiring in the 3D client, after the first districts.
6. The remaining districts. The weed lounge, shrooms, and the high and trip effects ship with the 18+ area after the age gate.

New games ship one per batch alongside the districts, alternating solo and multiplayer. Multiplayer-only games are playable against simple bots, or as local turns, until multiplayer is wired.

## Open questions

None. Names are placeholders the user may change later.
