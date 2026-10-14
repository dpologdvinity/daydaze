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
| Sports Complex | shooting range, paintball arena, basketball court, soccer pitch, tennis court, bowling alley, mini golf, gym |
| Zoo | savanna walk with a lion pride (the lion nod), giraffe feeding deck, penguin house (the Club Penguin nod), monkey canopy walk, reptile house, petting area, safari tram ride |
| Aquarium | shark tunnel, jellyfish glow room (night-club lighting), coral reef tank, touch pool, otter and seal show, underwater cafe and lounge |
| Mermaid Cove | a hidden ocean cove past the beach where mermaids live and everyone can see them: sea caves, a coral lagoon, rocks where mermaids sit and sing, a sunken ship to explore while swimming |
| Food Street | Filipino turo-turo and carinderia (adobo, sinigang, lumpia, pancit, halo-halo), a red-and-yellow Filipino fried-chicken and spaghetti joint inspired by Jollibee (with its own original name and a bee-free mascot), an ube bakery (ube cheese pandesal, ube crinkles, ube ice cream), a matcha bar, a boba tea shop, a Korean BBQ grill, a ramen counter, a sushi conveyor bar, a taco truck, a pizza-by-the-slice window, a dim sum teahouse, a pho shop, a Thai street-food stall, a crêperie, a bagel deli, a 24-hour diner with milkshakes, a donut shop, a gelato cart, a late-night halal cart, a Yunnan mushroom hot-pot stall |
| Cafes | a cozy bookshop cafe, a cat cafe, a dog cafe, a plant-filled Instagram cafe, a Y2K internet cafe with old computers and dial-up noises, a board-game cafe, a third-wave espresso bar, a Parisian patisserie with macarons, a Japanese kissaten with fluffy soufflé pancakes, a Korean dessert cafe with bingsu, a Hong Kong cha chaan teng with milk tea and pineapple buns, a Taiwanese night-market stall row, a Vietnamese cà phê sữa đá stand, a Turkish coffee and baklava house, a Moroccan mint-tea lounge, a British afternoon-tea room, a juice and smoothie bar, an açaí bowl shack, a Hello-Kitty-style pastel dessert parlor (original characters), a cereal bar, a crêpe and waffle stand, a churro cart, a cupcake bakery, a cookie dough shop, a mochi donut shop, a candy store with pick-and-mix, a chocolate shop, a 24-hour convenience store with snacks and slushies |
| Restaurants (more) | Filipino lechon and kamayan boodle-fight hall, a Filipino BBQ skewer stand (isaw, inihaw), a silog breakfast spot (tapsilog, longsilog), an Indian curry house, a South Indian dosa counter, a Nepali momo stand, a Chinese hand-pulled noodle shop, a Sichuan hot pot, a Peking duck house, a Japanese izakaya, a yakitori bar, an okonomiyaki griddle, a Korean fried chicken pub, a tteokbokki stall, a Hawaiian poke and plate-lunch shack, a Mexican taqueria, a Tex-Mex cantina, a Peruvian ceviche bar, a Brazilian churrascaria, an Argentinian grill, a Cuban sandwich counter, a Puerto Rican lechonera, a Caribbean jerk shack, a Jamaican patty shop, a Southern soul-food kitchen, a Cajun crawfish boil, a Texas BBQ smokehouse, a New York steakhouse, a burger joint, a hot dog stand, a fish-and-chips shop, an Italian trattoria, a Neapolitan pizzeria, a pasta bar, a Spanish tapas bar, a Greek gyro shop, a Turkish kebab grill, a Lebanese mezze house, an Ethiopian injera restaurant, a Nigerian jollof spot, a Moroccan tagine house, a French bistro, a fondue chalet, a German beer-hall with pretzels, a Swedish meatball cafeteria, a vegan bowl bar, a salad spot, an oyster and seafood bar, a rooftop omakase, a fancy tasting-menu restaurant for dates, a drive-in burger diner with roller-skating servers |
| Malls | a glossy Y2K mega-mall with a glass atrium, escalators, a fountain, a food court, an arcade, a photo-sticker booth, a cinema and a pretzel stand; an outdoor luxury shopping street; a retro dead-mall with half-lit stores, vaporwave music and a lonely fountain (a nostalgia secret) |
| Stores | fashion boutiques by style (Y2K, streetwear, glam evening wear, cottagecore, goth and alt, athleisure, lingerie, swimwear), shoe store, sneaker shop, jewelry and accessories, handbag store, hat and wig shop, sunglasses kiosk, a big Sephora-style makeup and beauty store (original name) with testers you can swatch on your doll, a beauty supply store (wigs, bundles, braiding hair, edge control, bonnets, lashes, press-on nails, hair dye), a K-beauty skincare shop, a drugstore makeup aisle, perfume counter, nail polish bar, tattoo and piercing studio, furniture and home decor (for your apartment), plant shop, pet shop (pets and pet outfits), bookstore, record store, phone and gadget store with Y2K flip phones, toy and collectibles store, crystal and tarot shop, smoke shop (18+), liquor store, flower shop, party supply store, bridal and formal boutique, sports gear store |
| Groceries | a big supermarket with carts, aisles, a deli, bakery and produce section; a Filipino grocery (Seafood City style, with an original name) stocking ube, calamansi, pancit canton and dried mangoes; an Asian supermarket (H Mart style, original name); a farmers market; a corner bodega with a cat. Groceries stock the apartment kitchen for a cooking activity. |
| Thrift and vintage | thrift stores with rotating racks of random pieces, a vintage boutique of curated 90s and 2000s outfits, a flea market with stalls on weekends, a consignment designer resale shop, and a swap rack where players leave and take items |
| Boardwalk and Beach | pier, bonfire, surf break, volleyball court |
| Fashion District | boutiques (shop), salon, nail bar, runway |
| Home | your own apartment, decorated, visitable by friends |
| Park and Gardens | picnic lawn, boating lake, night-sky lookout |
| 18+ area (behind the age gate) | weed lounge, plus two secret venues described below |

The current lounge, "The Mango Room", is renamed **The Velvet Room** so that no venue is mango-branded.

### Neighborhoods

The districts sit inside distinct neighborhoods, each with its own look, music, NPCs and time-of-day mood. Players can live in any of them: the apartment's neighborhood sets the view from the window and the street outside.

| Neighborhood | Feel | Holds |
|---|---|---|
| Downtown | glossy towers, neon billboards, taxis | Plaza hub, mega-mall, luxury street, airport link |
| Nightlife Row | brick, neon, queues outside clubs | clubs, bars, lounge, speakeasy, secret venues |
| Little Manila | jeepneys, parol lanterns, karaoke spilling out of doorways | Filipino restaurants, bakery, Filipino grocery, a sari-sari store |
| Chinatown and Koreatown | red lanterns, night market, K-pop storefronts | dim sum, hot pot, noodles, KBBQ, Asian supermarket, boba |
| The Arts District | murals, warehouses, thrift stores, record shops | thrift and vintage, tattoo studio, techno warehouse club, cafes |
| Suburbia | cul-de-sacs, lawns, a 2000s strip mall | supermarket, dead mall, drive-in diner, high-school nostalgia spots |
| Beachside | boardwalk, pastel houses, surf shops | beach, Mermaid Cove, Marina, Water Park |
| Uptown | brownstones, wine bars, a park | patisserie, bistro, tasting-menu restaurant, Park and Gardens, zoo, aquarium |
| Fairground | flashing lights, carnival music | Amusement Park, Speedway |
| Hillside Winter Town | snow, cabins, string lights | Ice Rink and Winter Village |

Each neighborhood has a bus stop and a taxi rank, and the world map groups places by neighborhood.

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
- Food delivery: an in-game phone app inspired by DoorDash (original name and logo, never the real brand). Players order from any restaurant on the map and a courier NPC on a scooter delivers it to wherever they are (apartment, beach, a club booth) after a short wait. Players can also take a delivery job: pick up orders and race them across the map on a scooter for coin tips (solo, easy to medium; a tip bonus for fast, careful deliveries).
- Food minigames, one per batch: boba builder (match the order: tea, milk, sugar level, toppings; easy), halo-halo stacker (stacking layers; easy to medium), sushi conveyor catch (medium), ramen rush (timed orders; hard), and a Filipino cook-off for two players (multi).

## Shopping

- Every store has a cashier NPC, racks or shelves of items the doll can try on in a mirror before buying, and a bag to carry purchases.
- Items cost coins (client-owned for now). Clothing goes to the closet; furniture and decor go to the player's apartment; pets go home with the player.
- Thrift stores restock with a random selection every day, so they reward coming back. Some items are rare one-offs. Vintage pieces are older Y2K styles you can't buy new.
- The swap rack becomes player-to-player once multiplayer and server-owned items exist; until then it trades with NPCs.

## Diverse characters

- The doll builder covers a wide range: many skin tones from deep to fair with warm, neutral and cool undertones; face shapes; eye shapes (monolid, hooded, almond, round); nose and lip shapes; freckles, vitiligo, birthmarks; body sizes from slim to plus-size, plus the bust, hips and height sliders; a range of heights.
- Hair for every texture: coily and kinky (afros, puffs, twist-outs, locs, box braids, cornrows, bantu knots), curly, wavy and straight, plus buzz cuts, shaved sides and bald. Hair colours from natural to neon. Edges and baby-hair styling options.
- Gender expression is free: any doll can wear any outfit, hair or makeup. Body presets are not tied to a gender. Players choose their pronouns (shown on the profile card), including they/them.
- Accessibility and identity details: glasses, hearing aids, a wheelchair option that rides, dances and uses every place, prosthetic limbs, hijabs and head wraps, bindis, turbans.
- NPCs reflect the same range, and each neighborhood's regulars look like the people who'd live there, without stereotypes. Every NPC is a real person with a name and a handwritten line, never a punchline.

## Hair salon and beauty services

- Hair salons in several neighborhoods: a glam downtown salon, a braiding shop (box braids, knotless, cornrows, Fulani braids, locs retwist), a barbershop with fades and designs, a Korean perm and colour salon, and a cheap-and-cheerful walk-in salon.
- A stylist NPC seats the player at a mirror. The player picks a cut, style, colour (including ombré, highlights, money pieces and neon), and extensions or a wig, and sees the doll update live before paying in coins.
- Also in the salons: lash extensions, brow shaping, nail art, and a makeup artist who applies full looks (Y2K glam, soft glam, goth, natural).
- Nail salons: a busy neighborhood nail salon with pedicure thrones and massage chairs, and a luxe nail art studio. Players choose nail shape (almond, coffin, stiletto, square, short), length, colour, finish (gloss, matte, chrome, cat-eye, glitter) and art (French tips, Y2K flames, butterflies, rhinestones, airbrush, 3D charms) and see them on the doll's hands. A nail-painting minigame lets players paint a client's nails to match an order (easy to medium).
- Salon chairs double as hangout seats: friends can sit beside each other and chat while getting styled.

## Guns

Guns exist only inside game zones: the shooting range, paintball, laser tag, the carnival shooting gallery, the water-gun battle, and the arcade zombie shooter. A player picks up a gun on entering the zone and returns it on leaving. Hangouts, clubs, malls, restaurants and the rest of the world stay gun-free, so nobody can be shot outside a game. Hits are cartoon and paint or light effects, never blood.

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
| Shooting range: targets, timed drills, pistol to rifle | Shooting range | solo | easy to hard | action |
| Paintball arena | Sports Complex | multi | medium | action |
| Laser tag (team neon maze) | arcade bar | multi | medium | action |
| Zombie arcade shooter | arcade bar | solo or co-op | medium to hard | horror action |
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
