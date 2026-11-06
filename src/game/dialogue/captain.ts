// Handwritten lines for the Starlight yacht's captain. Venue-tagged to
// "yacht"; read through `pickLine`, never directly.

import type { RoleBank } from "./types.ts";

export const captainBank: RoleBank = {
  "greeting-first": [
    {
      text: "Welcome aboard the Starlight, {name}! Best party boat on Starboard Bay.",
      when: { venue: "yacht" },
    },
    {
      text: "Hey, glad you made it up the gangway. I'm the captain — she listens to me most of the time.",
      when: { venue: "yacht" },
    },
    {
      text: "Ahoy! First time on the water? The bay is calm tonight, perfect for dancing.",
      when: { venue: "yacht" },
    },
    {
      text: "Welcome to the Starlight. Bar's aft, dance floor's midship, hot tub's starboard. Enjoy every inch.",
      when: { venue: "yacht" },
    },
    {
      text: "New passenger! We cast off in a few minutes. City lights are gorgeous from out there.",
      when: { venue: "yacht" },
    },
    {
      text: "Hey there! I'm steering us around the bay tonight. You just have to have fun.",
      when: { venue: "yacht" },
    },
    {
      text: "Welcome aboard! The sunset's right on schedule and so is this boat.",
      when: { venue: "yacht" },
    },
    {
      text: "Hey, {name}! The sea's on our side tonight — smooth cruise, great music.",
      when: { venue: "yacht" },
    },
    {
      text: "Come aboard! We've got a full loop around the bay before we dock again.",
      when: { venue: "yacht" },
    },
    {
      text: "Welcome. The Starlight is my pride and joy. Try not to spill anything on the teak.",
      when: { venue: "yacht" },
    },
  ],
  tapped: [
    {
      text: "She's running smooth tonight. The bay agrees with us.",
      when: { venue: "yacht" },
    },
    {
      text: "Keep one hand for the ship and one for yourself, as they say.",
      when: { venue: "yacht" },
    },
    {
      text: "We're rounding the north point now. Best view of the skyline from here.",
      when: { venue: "yacht" },
    },
    {
      text: "Watch the horizon when it spins — seasick is cured by looking far out.",
      when: { venue: "yacht" },
    },
    {
      text: "Forty years on the water. This bay still takes my breath away every time.",
      when: { venue: "yacht" },
    },
    {
      text: "DJ Prism is playing tonight. The bass carries all the way to the bridge.",
      when: { venue: "yacht" },
    },
    {
      text: "Dock's in twenty minutes. Make every second count.",
      when: { venue: "yacht" },
    },
    {
      text: "City lights on the port side. Worth every minute of the cruise.",
      when: { venue: "yacht" },
    },
    {
      text: "I've got her pointed at the stars. Trust the captain.",
      when: { venue: "yacht" },
    },
    {
      text: "The hot tub's on tonight. I didn't authorize it, but I'm choosing not to notice.",
      when: { venue: "yacht" },
    },
    {
      text: "Wind's picking up a hair. That's a feature, not a bug.",
      when: { venue: "yacht" },
    },
    {
      text: "Tell the DJ I want one slow song before we dock. Just this once.",
      when: { venue: "yacht" },
    },
  ],
  idle: [
    {
      text: "Dead ahead: the open bay and two hours of sunset.",
      when: { venue: "yacht" },
    },
    {
      text: "The compass says north-west. The music says midnight. Both are right.",
      when: { venue: "yacht" },
    },
    {
      text: "On nights like this I remember why I took this job.",
      when: { venue: "yacht" },
    },
    {
      text: "Soft swells tonight. The deck will barely bob. Great for dancing.",
      when: { venue: "yacht" },
    },
    {
      text: "I've seen the skyline from every angle. This angle still wins.",
      when: { venue: "yacht" },
    },
    {
      text: "Watch for dolphins off starboard around the north point.",
      when: { venue: "yacht" },
    },
    {
      text: "The string lights were my idea. Worth every bulb.",
      when: { venue: "yacht" },
    },
    {
      text: "Salt air and good music. That's the whole secret.",
      when: { venue: "yacht" },
    },
    {
      text: "If you see a shooting star, make a wish quickly. They don't wait.",
      when: { venue: "yacht" },
    },
    {
      text: "We come back to the dock on the hour. No early returns.",
      when: { venue: "yacht" },
    },
  ],
  evening: [
    {
      text: "Sunset off the port bow. Best view in the whole city.",
      when: { venue: "yacht" },
    },
    {
      text: "The sky's doing that orange-to-violet thing. Perfect timing on our part.",
      when: { venue: "yacht" },
    },
    {
      text: "Golden hour on the water. Genuinely can't be beat.",
      when: { venue: "yacht" },
    },
    {
      text: "That pink band on the horizon? That's the shadow of the earth. Only visible at sea.",
      when: { venue: "yacht" },
    },
    {
      text: "Every evening cruise I think the sunset can't top the last one. Every time I'm wrong.",
      when: { venue: "yacht" },
    },
    {
      text: "Colors go deeper once the sun touches the water. We timed this perfectly.",
      when: { venue: "yacht" },
    },
    {
      text: "The way the city reflects in the bay at dusk — worth the whole ticket right there.",
      when: { venue: "yacht" },
    },
    {
      text: "Evening mist is rolling in off the bay. Makes the lights look softer. I love it.",
      when: { venue: "yacht" },
    },
    {
      text: "Four hours out here and the sunset hits every single time. Never gets old.",
      when: { venue: "yacht" },
    },
    {
      text: "If you're taking photos, do it now — the light won't be this good again until tomorrow.",
      when: { venue: "yacht" },
    },
  ],
  "late-night": [
    {
      text: "City's all lit up. From out here it looks like it goes on forever.",
      when: { venue: "yacht" },
    },
    {
      text: "Stars are out. Dance floor's hopping. Perfect night at sea.",
      when: { venue: "yacht" },
    },
    {
      text: "After midnight the bay goes quiet except for us. I like it that way.",
      when: { venue: "yacht" },
    },
    {
      text: "The city never really sleeps, but from out here it at least slows down.",
      when: { venue: "yacht" },
    },
    {
      text: "Every window in the skyline has a story. We've got a better view of all of them.",
      when: { venue: "yacht" },
    },
    {
      text: "Music sounds different at sea past midnight. Bigger. More honest.",
      when: { venue: "yacht" },
    },
    {
      text: "Half moon tonight. It's putting a stripe on the water all the way to the horizon.",
      when: { venue: "yacht" },
    },
    {
      text: "These late cruises are quieter, but the people who come are the ones who mean it.",
      when: { venue: "yacht" },
    },
    {
      text: "The bay is mine at this hour. I let the guests borrow it.",
      when: { venue: "yacht" },
    },
    {
      text: "I've sailed at every hour. This one is my favorite.",
      when: { venue: "yacht" },
    },
  ],
  goodbye: [
    {
      text: "Safe landing on the gangway. Hope you dance again soon.",
      when: { venue: "yacht" },
    },
    {
      text: "Great having you aboard. See you next cruise.",
      when: { venue: "yacht" },
    },
    {
      text: "Take care on the dock — it's slick when it's wet. Come back soon.",
      when: { venue: "yacht" },
    },
    {
      text: "Pleasure having you on the Starlight. The bay misses you already.",
      when: { venue: "yacht" },
    },
    {
      text: "Safe trip home, {name}. We loop again in fifteen minutes if you change your mind.",
      when: { venue: "yacht" },
    },
    {
      text: "Disembarking already? Well, you know where to find us — right here on the water.",
      when: { venue: "yacht" },
    },
    {
      text: "Fair winds and following seas. That's what we wish each other. Take that with you.",
      when: { venue: "yacht" },
    },
    {
      text: "Good night! Tell your friends — the Starlight sails every evening.",
      when: { venue: "yacht" },
    },
    {
      text: "Catch you on the next loop. The deck stays lively all night.",
      when: { venue: "yacht" },
    },
    {
      text: "Mind the gangway step. Glad you came out tonight.",
      when: { venue: "yacht" },
    },
    {
      text: "I'll be steering the next lap if you want to come back. The bay is even better after midnight.",
      when: { venue: "yacht" },
    },
  ],
};
