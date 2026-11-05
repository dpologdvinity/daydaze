// What the people of Orbit 9, the space-station club, say: the airlock
// attendant, the soda-bar bartender, the DJ and the regulars. Handwritten,
// ten lines for each situation. Spread into the role banks (bouncer.ts,
// bartender.ts, dj.ts, regular.ts); every line is tagged for the venue.

import type { Line } from "./types.ts";

const here = (lines: readonly string[]): Line[] =>
  lines.map((text) => ({ text, when: { venue: "orbit" } }));

export const orbitBouncer = {
  "greeting-first": here([
    "Welcome aboard Orbit 9, {name}. Airlock's sealed, the floor's warm, go on in.",
    "Boarding pass? Kidding. Just don't float off the dance floor.",
    "Hi! Gravity's on tonight. We checked twice.",
    "Welcome to the station. The best seat is the one with the planet in it.",
    "You made it through the airlock. Nobody ever believes they will.",
    "Hello, traveler. The view is free, the music is loud, enjoy both.",
    "Come aboard! Coats are optional, glitter is encouraged.",
    "Orbit 9 greets you. Please keep your elbows inside the dance floor.",
    "Right on time, {name}. The planet's just coming into frame.",
    "Welcome in. Tonight's forecast: clear skies and a little bass.",
  ]),
  tapped: here([
    "The planet's called Halcyon. Rings are real, the glitter is extra.",
    "If anyone asks, the airlock only opens one way: toward the fun.",
    "I count the stars on my shift. Last night I got to four hundred.",
    "Tip: stand by the window when the rings line up. Best photo on the station.",
    "No spacesuits needed. We have a very good coat check, though.",
    "The bar's on the east side, the lounge on the west, the dance floor is everywhere else.",
    "I once saw a comet go by during a slow song. Everybody cried a little.",
    "Rule one: be kind. Rule two: tip the DJ in applause.",
    "You look like you belong up here. Stay as long as you like.",
    "Between us, the best view is from the lounge chair nearest the glass.",
  ]),
};

export const orbitBartender = {
  tapped: here([
    "Nebula fizz is fresh: blue raspberry, a little lime, a lot of bubbles.",
    "Everything here is zero proof and fully delicious. Try the comet cola.",
    "We keep the drinks cold with actual space. Don't ask, it's science.",
    "Pro tip: the straw is optional, the swirl is mandatory.",
    "Can I get you a sunburst soda? It glows if you hold it up to the window.",
    "I mix the sodas by the planet's schedule. Right now it's pink-grapefruit hour.",
    "A rocket pop with extra sparkle? Coming right up.",
    "Everything's in a sealed cup. Gravity gets weird on the weekends.",
    "I've been behind this counter for a hundred orbits and I still love it.",
    "Ask me for the secret flavor. It's mango with a tiny bit of moon.",
  ]),
  "action-ordering": here([
    "One nebula fizz, shaken and then stirred, in space style.",
    "Coming right up! Blue raspberry with a twist of lime.",
    "Comet cola for the traveler, with a swirl of cream.",
    "That's a sunburst soda. Hold it up to the window for the glow.",
    "Rocket pop, extra sparkle, no refunds on the giggles.",
    "Mango moon fizz, it's the house favorite for a reason.",
    "Lemon star spritzer, fresh and fizzy, enjoy the view.",
    "One aurora float: ice cream, soda, a little magic. Careful, it fizzes!",
    "Orbiting your way: pink grapefruit with a cherry satellite.",
    "Here you go, {name}. Cold, bright and zero proof.",
  ]),
};

export const orbitDj = {
  tapped: here([
    "Orbit 9 requests are open! The planet's listening, so is the floor.",
    "Give me a mood and I'll build the next set around it. Space is big, so are drops.",
    "I play to the rings: slow build, then everything at once.",
    "What's the track? Synths, bass, a little starlight, you tell me.",
    "The whole window is my light show. I just have to match the planet.",
    "Shout it out! One request, one song, one big moment under the stars.",
    "I've been up here for two hundred sets and the view still gets me.",
    "Wave at the window when the chorus hits. The planet waves back.",
    "Tell me your name and I'll give you a shoutout at the next drop.",
    "Want the bass heavier or the stars brighter? I do both.",
  ]),
};

export const orbitRegular = {
  tapped: here([
    "I come here for the window. The music's a bonus, honestly.",
    "Sit by the glass sometime. You can see the rings shift if you wait.",
    "Best nights are when the planet's full and the floor's packed.",
    "I met my best friend here, right under that big blue ring light.",
    "Everything's a little shinier in low gravity. Feels like it, anyway.",
    "The soda bar has a flavor called Moon Mango. Thank me later.",
    "That Star Siege cabinet by the window? I'm still beating my own score.",
    "I stay until the last song. The planet makes it worth it.",
    "Lounge chairs here are secretly the comfiest on the station.",
    "If you can't dance, stand near the glass and look cosmic. It works.",
  ]),
};
