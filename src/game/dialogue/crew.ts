// Handwritten lines for the Starlight yacht's crew members: deck crew and
// bar crew. Venue-tagged to "yacht"; read through `pickLine`, never directly.

import type { RoleBank } from "./types.ts";

export const crewBank: RoleBank = {
  "greeting-first": [
    {
      text: "Hey! I'm Mia, deck crew. Life vests are under the bench if you need one.",
      when: { venue: "yacht" },
    },
    {
      text: "Welcome aboard! I keep the deck clean and the string lights on. So far, so good.",
      when: { venue: "yacht" },
    },
    {
      text: "Hey there! First cruise? The city looks amazing from the far point.",
      when: { venue: "yacht" },
    },
    {
      text: "Hi! Grab a spot on the lounge chairs if you want the best view.",
      when: { venue: "yacht" },
    },
    {
      text: "Welcome! I'm on deck tonight. Need anything, I'm the one with the walkie.",
      when: { venue: "yacht" },
    },
    {
      text: "Hola! First time? The hot tub fills up fast, so grab your spot early.",
      when: { venue: "yacht" },
    },
    {
      text: "Hey! Dance floor's heating up already. That DJ does not mess around.",
      when: { venue: "yacht" },
    },
    {
      text: "Welcome to the Starlight! Bar's serving mocktails all night — the mango one is unreal.",
      when: { venue: "yacht" },
    },
    {
      text: "New face! I'll give you the two-minute tour: bow's up front, dance floor's mid, bar's aft.",
      when: { venue: "yacht" },
    },
    {
      text: "Hey, {name}! Make yourself at home. The whole yacht is yours tonight.",
      when: { venue: "yacht" },
    },
    {
      text: "Welcome aboard! Watch the step by the hot tub — that's how most people meet me.",
      when: { venue: "yacht" },
    },
  ],
  tapped: [
    {
      text: "Need something? The bar's aft or I can grab it for you.",
      when: { venue: "yacht" },
    },
    {
      text: "Best way to see the skyline is from the bow. Walk up and take a look.",
      when: { venue: "yacht" },
    },
    {
      text: "DJ Prism's set goes all night. The drop around the east channel is legendary.",
      when: { venue: "yacht" },
    },
    {
      text: "Hot tub's at 102°. The captain says it's too hot. The captain has never been in it.",
      when: { venue: "yacht" },
    },
    {
      text: "String lights were my idea, actually. The captain pretends otherwise.",
      when: { venue: "yacht" },
    },
    {
      text: "Lounge chairs are first-come. Pro tip: the starboard side catches the sunset.",
      when: { venue: "yacht" },
    },
    {
      text: "If you're seasick, look at the horizon. If that doesn't work, let me know.",
      when: { venue: "yacht" },
    },
    {
      text: "Bar's making the Starlight Fizz tonight. Just sparkling citrus and grapefruit, but it goes down easy.",
      when: { venue: "yacht" },
    },
    {
      text: "Watch the city lights go by slow. That's the whole point of this cruise.",
      when: { venue: "yacht" },
    },
    {
      text: "Dance floor gets wild around the north-west leg. Fair warning.",
      when: { venue: "yacht" },
    },
    {
      text: "The captain's strict about one thing: no one goes forward of the anchor chain. That's it.",
      when: { venue: "yacht" },
    },
    {
      text: "We dock on the hour. I'll give a five-minute call if you lose track of time.",
      when: { venue: "yacht" },
    },
  ],
  idle: [
    {
      text: "Salt air hits different when you're moving, doesn't it.",
      when: { venue: "yacht" },
    },
    {
      text: "The music carries all the way out here. The fish probably love it.",
      when: { venue: "yacht" },
    },
    {
      text: "Every cruise is different. Same bay, different energy every time.",
      when: { venue: "yacht" },
    },
    {
      text: "I've worked this boat for two years. Never gets old.",
      when: { venue: "yacht" },
    },
    {
      text: "Watch for the city's reflection in the water when we slow down.",
      when: { venue: "yacht" },
    },
    {
      text: "The hot tub's the secret star of this boat. Captain thinks it's the mahogany. It's the hot tub.",
      when: { venue: "yacht" },
    },
    {
      text: "Somebody on the dance floor is doing a move I've never seen. Respect.",
      when: { venue: "yacht" },
    },
    {
      text: "Mango mocktail from the bar. Trust me on this one.",
      when: { venue: "yacht" },
    },
    {
      text: "Wind's coming off the bay. Good for the lights, bad for napkins.",
      when: { venue: "yacht" },
    },
    {
      text: "If you see a star fall, make a wish and don't tell anyone.",
      when: { venue: "yacht" },
    },
  ],
  "action-ordering": [
    {
      text: "Coming right up! The mango-lime fizz is tonight's specialty.",
      when: { venue: "yacht" },
    },
    {
      text: "Great choice. Bay Breeze mocktail — passion fruit, coconut, citrus. Zero regrets.",
      when: { venue: "yacht" },
    },
    {
      text: "On it! Starlight Fizz for you: sparkling elderflower and grapefruit, no regrets.",
      when: { venue: "yacht" },
    },
    {
      text: "The sunset mocktail? It layers, so it looks as good as it tastes.",
      when: { venue: "yacht" },
    },
    {
      text: "Sure thing. Fizzy or still? We do both.",
      when: { venue: "yacht" },
    },
    {
      text: "Of course! The pineapple-mint one is the house pour tonight.",
      when: { venue: "yacht" },
    },
    {
      text: "Yes! The mango tango — mango, lime and a hint of chili. Bar's best drink.",
      when: { venue: "yacht" },
    },
    {
      text: "Gotcha. Blueberry lemonade with a mint sprig, coming right up.",
      when: { venue: "yacht" },
    },
    {
      text: "On the house tonight is the Starboard Sunset. You'll see why when it's done.",
      when: { venue: "yacht" },
    },
    {
      text: "Strawberry basil fizz? Top five drink I've ever made. I'll prove it.",
      when: { venue: "yacht" },
    },
    {
      text: "Absolutely! Citrus cooler, sparkling water, tiny umbrella. Done.",
      when: { venue: "yacht" },
    },
    {
      text: "The watermelon slush is cold enough to slow your heartbeat slightly. In the best way.",
      when: { venue: "yacht" },
    },
    {
      text: "Sure! Peach fizz with a lemon wheel. It photographs well too, just saying.",
      when: { venue: "yacht" },
    },
  ],
  goodbye: [
    {
      text: "Mind your step on the gangway! Come back any night.",
      when: { venue: "yacht" },
    },
    {
      text: "Safe trip home! The Starlight sails again at sunset tomorrow.",
      when: { venue: "yacht" },
    },
    {
      text: "Glad you came! The dance floor was better for it.",
      when: { venue: "yacht" },
    },
    {
      text: "Take care! Grab a mint on the way out — they're by the gangway.",
      when: { venue: "yacht" },
    },
    {
      text: "Thanks for coming! Tell a friend — the more the merrier out here.",
      when: { venue: "yacht" },
    },
    {
      text: "Bye! The mango fizz will miss you most.",
      when: { venue: "yacht" },
    },
    {
      text: "Safe landing on the dock! Hope to see you on the next cruise.",
      when: { venue: "yacht" },
    },
    {
      text: "Good night! You were an excellent passenger — no complaints.",
      when: { venue: "yacht" },
    },
    {
      text: "Take care of yourself! The bay will be here when you're ready for another cruise.",
      when: { venue: "yacht" },
    },
    {
      text: "See you around! This boat's always got room for one more great dancer.",
      when: { venue: "yacht" },
    },
  ],
};
