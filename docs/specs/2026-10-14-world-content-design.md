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
| Boardwalk and Beach | pier, bonfire, surf break, volleyball court |
| Fashion District | boutiques (shop), salon, nail bar, runway |
| Home | your own apartment, decorated, visitable by friends |
| Park and Gardens | picnic lawn, boating lake, night-sky lookout |
| 18+ area (behind the age gate) | strip club, weed lounge |

The current lounge, "The Mango Room", is renamed **The Velvet Room** so that no venue is mango-branded.

### Rides

A ride is a place feature that moves the player's doll along a fixed path while they watch. Riders can sit together, and other players see them riding. Rides are not games unless marked as games below. Every ride respects reduced motion with a gentler camera, and riding never forces fast camera motion: the player can switch to a fixed side view.

## Water Park swimsuit

- Entering any Water Park room shows the player's doll in their swimsuit look. Leaving the district restores the normal outfit.
- The saved outfit never changes. The swimsuit is a separate look slot in the save, chosen in the closet: one-piece, bikini, board shorts and rash guard, each tintable.
- Other players see the swimsuit too. The room's data marks it as a swimwear room, and the room server sends each player's active look.

## Dancing

- Players can dance anywhere, and especially on club dance floors. A dance button opens a picker of dance moves. The doll loops the chosen move until the player moves or stops.
- Moves include a basic two-step, a body roll, a hair flip, a Y2K shuffle, voguing, a twerk, and a slow dance.
- On a club floor, dancing on the beat (shown by pulsing tiles) earns a small streak glow. It is optional: no score, no failure.
- Couple dances (slow dance, partner spin) work for any two dolls, and against NPCs until multiplayer exists.
- Moves are animation clips on the doll rig, so new moves are data, not code.

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
6. The remaining districts. The weed lounge and high effect ship with the 18+ area after the age gate.

New games ship one per batch alongside the districts, alternating solo and multiplayer. Multiplayer-only games are playable against simple bots, or as local turns, until multiplayer is wired.

## Open questions

None. Names are placeholders the user may change later.
