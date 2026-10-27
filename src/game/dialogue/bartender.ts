// Handwritten lines for bartenders, keyed by situation. Venue-tagged entries
// (`when: { venue }`) cover the Violet Hour, Pulse and the Velvet Room;
// untagged ones play at any bar. Read through `pickLine`, never directly.

import type { RoleBank } from "./types.ts";

export const bartenderBank: RoleBank = {
  "greeting-first": [
    // The Violet Hour: the sapphic bar on Nightlife Row
    {
      text: "Hey! Welcome to the Violet Hour, {name}. Stool or the pool table, your pick.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Come on in, the violet lights are on and the bar is wide open.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Pull up a stool at the Violet Hour. Tell me what you're in the mood for.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hi, friend. The sunset drinks are on the board, and they're gorgeous.",
      when: { venue: "violet-hour" },
    },
    {
      text: "New here? Welcome to the Violet Hour. Everyone's invited to the bar.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hola, bienvenida. The sunset special's on tap, want to try it?",
      when: { tier: "adult", venue: "violet-hour" },
    },
    {
      text: "Welcome! Tell me a flavor and I'll make you something that matches the neon.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Come in, sit, relax. The bar's soft, the music's soft, and I'm a little bit witty.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hey, hey. Want a drink that's pink, orange, or violet? I can do all three.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Welcome to the bar where the neon puns are free. Ask for one and see.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Sit down, love. Your drink is about to be the best thing you've tasted all night.",
      when: { venue: "violet-hour" },
    },
    // Pulse: the main dance club on Nightlife Row
    {
      text: "Pulse bar's open, {name}. Tell me a flavor and I'll build the rest.",
      when: { venue: "pulse" },
    },
    {
      text: "Welcome to Pulse. Glowing drinks come with glowing service, promise.",
      when: { venue: "pulse" },
    },
    {
      text: "Hey! Your first Pulse drink is on me if you tell me your favorite color.",
      when: { venue: "pulse" },
    },
    {
      text: "Come on up to the bar. The LED lights make everything look like a cocktail.",
      when: { tier: "adult", venue: "pulse" },
    },
    {
      text: "Pulse bar, where the drinks light up and so do the people. What's yours?",
      when: { venue: "pulse" },
    },
    {
      text: "Hi! Sweet, sour, or electric blue? I make all three, no judgment.",
      when: { venue: "pulse" },
    },
    {
      text: "The bar's about to get busy, so tell me what you want while it's quiet.",
      when: { venue: "pulse" },
    },
    {
      text: "Pulse bar is the best seat for watching the floor. Grab a stool, I'll be quick.",
      when: { venue: "pulse" },
    },
    {
      text: "Welcome in! You look like someone who wants a drink with a little sparkle.",
      when: { venue: "pulse" },
    },
    {
      text: "New at Pulse? The bar's the loudest spot in the room, so yell your order.",
      when: { venue: "pulse" },
    },
    {
      text: "Hey, pull up a stool. The menu's bright, the ice is cold, and I'm on it.",
      when: { venue: "pulse" },
    },
    "Welcome in, what are we drinking?",
    "Hey, first time? Pull up a stool, I'll make you something good.",
    "Ooh, new face at my bar. Sit, sit.",
    "Hola, bienvenida. The menu's on the board if you need it.",
    "Pull up a stool, babe. The good stuff is up top.",
    "Hi! Tell me one flavor you like and I'll do the rest.",
    "Come in out of the queue, the night's only getting started.",
    "Hey hey. Water or a drink? No wrong answer here.",
    "Look at you walking in like you own the place. Sit down, my friend.",
    "Welcome in. Tell me your mood and I'll mix something for it.",
    {
      text: "Welcome to the Velvet Room, {name}. Booth or bar?",
      when: { venue: "velvet-room" },
    },
    {
      text: "Come on up to the bar. The LED lights make every mocktail look like a lava lamp.",
      when: { tier: "teen" },
    },
    {
      text: "Pulse bar, where the sodas glow and so do the people. What will it be?",
      when: { tier: "teen" },
    },
    {
      text: "Welcome in! The menu glows, the sodas fizz, and the straws are striped.",
      when: { tier: "teen" },
    },
    {
      text: "Pull up a stool. Tonight's special is the Sunset Spritzer, zero percent and all sparkle.",
      when: { tier: "teen" },
    },
    {
      text: "Hey, first time? Try the Violet Fizz, everybody starts there.",
      when: { tier: "teen" },
    },
    {
      text: "Hola! Tell me a flavor and I will invent a mocktail for it.",
      when: { tier: "teen" },
    },
    {
      text: "Welcome! Everything here is mixed fresh, and the cherries are free.",
      when: { tier: "teen" },
    },
    {
      text: "Hi there. Mint, lime or berry? I can do all three in one glass.",
      when: { tier: "teen" },
    },
    {
      text: "You made it! Grab a seat and I will bring you something bubbly.",
      when: { tier: "teen" },
    },
    {
      text: "New face! I am the best mocktail maker on this block, ask anyone.",
      when: { tier: "teen" },
    },
    {
      text: "Hola, bienvenida. The sunset special is a mango fizz, want to try it?",
      when: { tier: "teen" },
    },
  ],
  tapped: [
    // The Violet Hour: the sapphic bar on Nightlife Row
    {
      text: "Hey, love. I see you. One sec, I'm pouring a sunset for the corner.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Need a drink, or just a little violet-light conversation? Either is welcome.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Tap again and I'll start charging you rent in puns. Kidding. What's the order?",
      when: { venue: "violet-hour" },
    },
    {
      text: "You rang the bar? Cute. What do you want to sip tonight?",
      when: { venue: "violet-hour" },
    },
    {
      text: "Menu, specials, or the gossip from the regulars' corner? I've got all three.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hi! The pool table's free, and so is the drink list. Ask me anything.",
      when: { venue: "violet-hour" },
    },
    {
      text: "You're going to make me blush, babe. What can I get you?",
      when: { venue: "violet-hour" },
    },
    {
      text: "Okay, you've got my attention. Something cold, sweet, or a little bit spicy?",
      when: { venue: "violet-hour" },
    },
    {
      text: "Talk to me, I'm wiping glasses and listening. Violet is the color of the night.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Need a cue for the pool table? I'm the bartender, not the cue. What's up?",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hey, sweetheart, you tapped the bar. Tell me your mood and I'll do the rest.",
      when: { venue: "violet-hour" },
    },
    "Yes? Lemme guess, you want a drink.",
    "Hey, I see you. One sec, I'm mid-pour.",
    "Need something, or just checking if I'm real?",
    "Tap again and I'll start charging you rent.",
    "What can I get you, gorgeous?",
    "Ask me anything, I know where every bottle lives.",
    "Okay, cute, what's the order?",
    "You rang? Actually you tapped, but I respect it.",
    "Menu, specials, or a little gossip? I've got all three.",
    "Mija, you're making me blush. What do you need?",
    "Talk to me. Bartender therapy is free, drinks are not.",
  ],
  idle: [
    "This playlist is a whole mood tonight.",
    "Wiping the same glass for the third time, don't mind me.",
    "Anyone else's feet hurting or is it just me?",
    "I swear the ice machine has a personality.",
    "Quiet hour, perfect time to restock the limes.",
    {
      text: "Cheers to everybody who came out tonight, even the sad ones.",
      when: { tier: "adult" },
    },
    "The bass is loud. Somebody tell the DJ we can still hear each other.",
    "Ay, I could use a nap and a cafe con leche.",
    "The neon's reflecting off every glass. It's giving movie.",
    "Lowkey my favorite part of work is the regulars and their stories.",
    "Nobody's touching the bowl of cherries, rude.",
    {
      text: "Here is to everybody who came out tonight, even the sad ones. Free cherries!",
      when: { tier: "teen" },
    },
  ],
  goodbye: [
    "Take care out there, text me when you get home.",
    "Bye, bye! Come back and tell me how the night went.",
    "Ingat ka, okay? Drink water on the way out.",
    "See you next time, I'll save you a stool.",
    "Vaya con Dios, and don't be a stranger.",
    "Night, babe. Come back soon, I'll have your drink ready.",
    "Good night, you were the best company at the bar tonight.",
    "Have a safe ride home, hunny.",
    "Adios, bonita. Next round's on me when you return.",
    "Byeee, don't forget your jacket on the stool.",
    "Catch you later. Take the long way home if the night's still good.",
  ],
  "greeting-regular": [
    "There's my favorite regular! Usual?",
    "{name}, the bar's not the same without you. Sit.",
    "Look who's back. Your stool's still warm, I kept it.",
    "Regular of the year, coming through. Your drink's already poured.",
    "Oh good, you're here. I was about to tell the cook you'd be late.",
    "Usual, {name}? Or are we branching out tonight?",
    "Back again! I started to think you were dating the lounge.",
    "You're a legend in this bar, you know that?",
    "Hey regular, did you bring me a story or a rumor?",
    "Took you long enough! Pull up the stool, the usual's coming.",
    "Our favorite face, same as always. Sit, sit.",
  ],
  "late-night": [
    "Late-night crowd, my favorite. Sit wherever.",
    {
      text: "It's past two and the cocktails are still on. Ha.",
      when: { tier: "adult" },
    },
    "Last call's coming, so let's make the next one count.",
    "The city's quiet out there, but in here we're just warming up.",
    "Late nights are where the best stories happen, tell me yours.",
    "Ay, the 3 a.m. crowd. Respect. Water first, then whatever.",
    "Most people left, which means the good conversations start now.",
    {
      text: "You look like you need something strong and something sweet.",
      when: { tier: "adult" },
    },
    "Night owls only past this hour. Welcome to the club.",
    "The sun's coming up in a few hours, let's enjoy the dark.",
    "Last round energy. What's your pick before I start cleaning?",
    {
      text: "Nightlife Row after midnight, we're the best show in town.",
      when: { neighborhood: "nightlife-row" },
    },
    {
      text: "Late-night downtown is my favorite, babe. Lights and cocktails.",
      when: { tier: "adult", neighborhood: "downtown" },
    },
    {
      text: "It is past two and the mocktails are still flowing. Ha.",
      when: { tier: "teen" },
    },
    {
      text: "Last order is coming, so let us make the next one count.",
      when: { tier: "teen" },
    },
    {
      text: "You look like you need something fizzy and something sweet.",
      when: { tier: "teen" },
    },
    {
      text: "Late-night downtown is my favorite, babe. Lights and sparkling lemonade.",
      when: { tier: "teen" },
    },
    {
      text: "The after-midnight menu is all hot chocolate and glitter soda. Pick one.",
      when: { tier: "teen" },
    },
    {
      text: "The stars are out and so is the cold brew soda. Sit anywhere.",
      when: { tier: "teen" },
    },
    {
      text: "Midnight menu: hot chocolate with a toasted marshmallow crown.",
      when: { tier: "teen" },
    },
    {
      text: "Night owl energy! Do you want sweet, sour or glittery?",
      when: { tier: "teen" },
    },
    {
      text: "The music is low and the lemonade is cold. Perfect hour.",
      when: { tier: "teen" },
    },
    {
      text: "Closing in a bit, so tell me your last order and I will make it a good one.",
      when: { tier: "teen" },
    },
  ],
  "outfit-glam": [
    "That fit is serious. Are you going to a wedding or to my bar?",
    {
      text: "Glam like that needs a signature cocktail. Here, try this.",
      when: { tier: "adult" },
    },
    "Okay, the sequins are doing everything. Sit and be seen.",
    "{name}, you came dressed to win the whole night.",
    "Fierce. I'm taking mental notes for my own closet.",
    "Lowkey the most dressed person in here, and it's not a contest. It's a win.",
    "Red lip, sparkly jacket, and that confidence? Chef's kiss.",
    "You look like a whole cover shoot. I'm impressed.",
    "Ay, that glam is stunning. What's the plan tonight?",
    "Honestly the outfit pulled me out of the back room. Obsessed.",
    "Okay, that look deserves a drink with a little drama.",
    {
      text: "Glam like that needs a signature mocktail. Here, try the Starlight Fizz.",
      when: { tier: "teen" },
    },
    {
      text: "That look deserves a tall glass of something sparkly. On the house.",
      when: { tier: "teen" },
    },
    {
      text: "The sequins and the sparkling cherry soda were made for each other.",
      when: { tier: "teen" },
    },
    {
      text: "Gala-ready! I will garnish yours with a candied violet.",
      when: { tier: "teen" },
    },
    {
      text: "Look at you! That outfit deserves a glass with a sugar rim.",
      when: { tier: "teen" },
    },
    {
      text: "Red carpet fit. Let me garnish your drink with a little gold leaf.",
      when: { tier: "teen" },
    },
    {
      text: "Those colors are gorgeous. I will mix a drink to match them.",
      when: { tier: "teen" },
    },
    {
      text: "You walked in and the whole bar turned. Here, a Rosewater Fizz.",
      when: { tier: "teen" },
    },
    {
      text: "Dressed like a headline. This round of sparkling juice is on me.",
      when: { tier: "teen" },
    },
    {
      text: "Now that is a statement piece. Sit, I will fix you a pink peppercorn soda.",
      when: { tier: "teen" },
    },
  ],
  "action-ordering": [
    // The Violet Hour: the sapphic bar on Nightlife Row
    {
      text: "Great order. Pink, orange, or violet? Pick the color and I'll make it sing.",
      when: { venue: "violet-hour" },
    },
    {
      text: "One sunset coming up, babe. Stand by while I mix it right.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Good choice. I'm pouring it slow so the orange sunset looks perfect in the glass.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Okay, that's a drink with a view. Give me a moment and it's yours.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Yes! Violet, pink, orange. You picked the most gorgeous one on the board.",
      when: { venue: "violet-hour" },
    },
    {
      text: "That's on the way. Pay now, or run a tab? I won't tell the pool table.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Mixing a {drink} for you now. Keep your eyes on the violet light.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Good call. I'll bring it to the regulars' corner so you can settle in.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Coming right up. Shaken with love and a little bit of ice, the sunset will be extra.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Order received, love. I'll bring it over before the next song drops.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Nice pick, friend. This one's a little tart and a little sweet, just like me.",
      when: { venue: "violet-hour" },
    },
    // Pulse: the main dance club on Nightlife Row
    {
      text: "Great pick. That one lights up in the glass. Want it with a splash or straight?",
      when: { venue: "pulse" },
    },
    {
      text: "Coming right up. The blender's loud, so I'll shout the name at you.",
      when: { venue: "pulse" },
    },
    {
      text: "One {drink} for the glow seeker. Coming up, don't go anywhere.",
      when: { venue: "pulse" },
    },
    {
      text: "Order's in, and the LED ice is already glowing. Give me one second.",
      when: { venue: "pulse" },
    },
    {
      text: "Nice choice. Pay now or run a tab? Either way I'll keep it cold.",
      when: { venue: "pulse" },
    },
    {
      text: "Okay, that's a drink with a light show. I'm doing my best with the shaker.",
      when: { venue: "pulse" },
    },
    {
      text: "Got it! I'll pour it slow so the color looks extra fun when it hits your hand.",
      when: { venue: "pulse" },
    },
    {
      text: "Yes, that's my favorite order to make tonight. Stand by, it's going on the bar.",
      when: { venue: "pulse" },
    },
    {
      text: "Done and done. Want a cherry, a glow stick, or both? I've got both.",
      when: { venue: "pulse" },
    },
    {
      text: "Mixing it now, babe. Try not to dance into the ice bin while you wait.",
      when: { venue: "pulse" },
    },
    {
      text: "Good order, friend. I'll bring it to you before the next song drops.",
      when: { venue: "pulse" },
    },
    "Good choice. I'll have it ready in two minutes.",
    "Ooh, the {drink} again? My kind of person.",
    "Tell me your flavor and I'll make it sing.",
    "One {drink} coming up, sit tight.",
    "Order's in. Keep the vibes going while I work.",
    "Strong or sweet? Say the word and I'll adjust.",
    "Coming right up, the ice is cold and the fruit's fresh.",
    "Nice pick, that one's a crowd favorite.",
    "Got it, one {drink} with extra joy on top.",
    "Hmm, that's a bold order. I respect it.",
    "Ticket's in, babe, give me a sec.",
    {
      text: "Velvet Room signature coming up, the good glasses come out for you.",
      when: { venue: "velvet-room" },
    },
  ],
  "action-tipping": [
    "Oh, you didn't have to! Thank you, that's sweet.",
    "A tip? Keep it up and I'll name a drink after you.",
    "Gracias, you just made my whole shift. Seriously.",
    "The tip jar says thank you, and so do I.",
    "Ay, big heart. Thank you, love.",
    "Look at you tipping like a true regular. Gracias.",
    "You're going straight into my favorite customers list.",
    "Money in the jar, smile on my face. Good trade.",
    "Thanks, that goes straight to my rent and my boba fund.",
    "Generous and fabulous. Who taught you that?",
    "Salamat! I'll remember you next time you walk in.",
  ],
  "state-drunk": [
    "Okay, let's switch you to water for a bit, babe.",
    "You're doing great. Sip this water and tell me your name again.",
    "No more shots tonight. I'll call you a cab, promise.",
    "Hydrate, then we'll talk about the next drink. Deal?",
    "Hey, where's your friend? Let's get them to take you home.",
    "Ay, the room's spinning, huh? Sit down, sweetheart.",
    "Tubig first, then the fun. Trust me.",
    "You're the best company, which is exactly why I'm cutting you off. Water now.",
    "Let me get you a glass of water and a snack, okay?",
    "Sit here where I can see you. Your friends are coming back, right?",
    "That's enough for you tonight, love. I'm proud of you for listening.",
  ],
  "state-high": [
    "You look high on life tonight, and I'm into it.",
    "Okay, the lights are glowing extra soft for you. Drink some water.",
    "Feeling floaty? Sit, sip something cold, and breathe.",
    "You seem like you're somewhere lovely right now. Come back for a sec, okay?",
    "Whatever you're feeling, I hope it's mellow. Want some water?",
    "Easy on the spacey vibes, babe. Sit with me for a minute.",
    "You're giggling at nothing and it's adorable.",
    "Grab a snack and a glass of water, the cosmic energy will settle.",
    "High or not, you're my favorite person to watch dance.",
    "That glow suits you. Let's keep it chill tonight.",
    "Take it slow, the music's gonna carry you.",
  ],
  "state-tripping": [
    "Okay, you're in your own little movie right now, huh? Cute.",
    "Colors look wild tonight, don't they? Stay near the bar, okay?",
    "Breathe with me. The room isn't going anywhere.",
    "Your friends are close by, right? Tell them where you are.",
    "Wow, the lights are dancing. Sit down and let the music carry you.",
    "Keep your hands on the bar and your feet on the floor, love.",
    "You're having a moment, and that's okay. I'll keep an eye on you.",
    "Grab some water and a cookie and let the room settle.",
    "The fireflies on the wall are real, babe. Just kidding. Sit down, okay?",
    "Trippy night, huh? Be gentle with yourself and call a friend.",
    "No drama here. You're safe, the bar's cozy, and I've got you.",
  ],
};
