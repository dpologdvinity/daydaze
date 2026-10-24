// Handwritten lines for bar regulars, the barflies who know your name; venue-
// tagged entries are mostly the Violet Hour. Read through `pickLine`, never
// directly.

import type { RoleBank } from "./types.ts";

export const regularBank: RoleBank = {
  "greeting-first": [
    "Oh, new face! Sit, the stool next to me is comfy.",
    "Hey, you're new. I'm the one who knows where the good bathroom is.",
    "First time here? Welcome, you picked a great spot.",
    "Hi! Don't mind me, I'm just the person who's been here since opening.",
    "New here? I'll tell you who to talk to and who to avoid.",
    "Ooh, somebody new! Pull up a chair, the bar is friendly tonight.",
    "Hola! First round is on the regulars, that's the house rule.",
    "Hi, stranger. The bartender is the real boss, so be nice to her.",
    "Welcome! You've got the look of someone who's about to be a regular.",
    "Hey! Try the house thing, it's dangerous but in a good way.",
    "Oh, hi! I was just telling my friend somebody would finally sit there.",
    {
      text: "Welcome to the Velvet Room! The corner booth is the best seat in town.",
      when: { venue: "velvet-room" },
    },
  ],
  "greeting-regular": [
    // The Violet Hour: the sapphic bar on Nightlife Row
    {
      text: "There's my favorite regular! The corner's been saving your seat, love.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Back again? The pool table's been asking where you are, and so have I.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Look who's here! Your drink's already poured, and the bartender's grinning about it.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hey, regular! The corner got quieter without you. Sit down and fix that.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Good to see you, {name}. The Violet Hour's a better bar with you in it.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Ayyy, my favorite cue master's back. Who's racking first?",
      when: { venue: "violet-hour" },
    },
    {
      text: "There's my favorite person in this whole violet room. Sit, tell me everything.",
      when: { venue: "violet-hour" },
    },
    {
      text: "You showed up! The regulars' corner has a new rumor and you're at the center of it.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hi again! I'm so glad you came back, the room feels a little brighter already.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Oh, you're back! I told the bartender you'd be late, and now I'm proven right.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Welcome back to your corner, friend. The seat's warm and the drink's on the way.",
      when: { venue: "violet-hour" },
    },
    "There she is! Same seat, same drink, same chaos. Love it.",
    "Look who's back! I saved your stool, babe.",
    "Ayyy, my favorite regular! The bartender already started your order.",
    "Back again? Your reputation here is officially established.",
    "Hey, {name}! The crew asked where you were yesterday.",
    "The usual, right? Don't even answer, I know you.",
    "Hi again! You're making me look like a bad regular by comparison.",
    "There's my partner in bad decisions. Sit, sit, what's the news?",
    "You're back! I was starting to think the cat cafe stole you.",
    "Oh good, you showed up. The jukebox was getting sad without you.",
    "Hey, regular! I think the bartender has a crush on your order.",
  ],
  "greeting-returning": [
    "Wait, you're back?! It's been forever. Where have you been, babe?",
    "I thought you moved away! Glad the bar didn't lose you for good.",
    "Oh my god, look who finally came back. I missed your chaos.",
    "It's been so long! Tell me everything. Leave out nothing.",
    "A whole season and you come back with a new haircut? Respect.",
    "We thought the rooftop had taken you. Welcome back, stranger!",
    "Hey! You're alive! Sit down and catch me up on your life.",
    "Did you get a new job or just a new personality? Either way, cheers.",
    "Look at you, back from the dead. Your old stool misses you.",
    "Hey, I heard you were gone! Okay, you're back, so you owe us a story.",
    "Bienvenida de vuelta! The bartender still remembers your drink.",
  ],
  tapped: [
    // The Violet Hour: the sapphic bar on Nightlife Row
    {
      text: "Hey! Pull up a stool, the regulars' corner has room for one more witty person.",
      when: { venue: "violet-hour" },
    },
    {
      text: "What's up, love? I've got gossip, cue advice, and a good pour on tap.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Ask me anything, I'm basically the house mascot at this point.",
      when: { venue: "violet-hour" },
    },
    {
      text: "You're asking me? Good. Pool, drinks, or who's dating whom in the corner?",
      when: { venue: "violet-hour" },
    },
    {
      text: "I'm the regular who's on a first-name basis with the jukebox. Ask away.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Did you come for the sapphic neon or the pool table? Both is the right answer.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hi! If you're new, the corner booth is soft and the stories are better.",
      when: { venue: "violet-hour" },
    },
    {
      text: "You tapped the regular. Congratulations, you've been adopted by the corner.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Need a partner for the pool table? I'm bad, but I'm a lot of fun to lose to.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Yes? I'm all ears, and my drink's almost gone, so make it a good question.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Hey! Sit with us, we've got a whole theory about the bartender's sunset cocktail.",
      when: { venue: "violet-hour" },
    },
    {
      text: "I came for the coaster and stayed for the lights. The lights were the plan.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "My feet hurt and I won't go home until I've eaten something fried.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "Did you see the wheel go past the moon? I'm waiting for it to come back round.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "First night here? You've got the face of someone about to scream on purpose.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "I'm saving my last ride for the end of the night. It's a tradition I just made up.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "Lost my friend by the teacups. She's fine. She's probably ahead, doing something brave.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "If you see a pink tote bag near the gallery, that's me. Come say hello.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "Ten minutes in line and I'd queue again. The line is half the fun with good company.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "My dad taught me the ring toss. He cheated. I forgive him, mostly.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "The carousel music gets in your head and stays there for a week. Worth it.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "The carousel horses have names on their saddles. I've decided mine is Gerald.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "Nice shoes for a midway. Mine hurt already, but it's the good kind of hurting.",
      when: { neighborhood: "fairground" },
    },
    {
      text: "Everyone says it's only a little bit of a drop. It's a lot of a drop. Enjoy it.",
      when: { neighborhood: "fairground" },
    },
    "Hey! Yes, I'm talking to you. You look like you have opinions.",
    "Oh, you want my attention? Well, you've got it now.",
    "Tapping on a regular? Bold. I like it.",
    "What's up? I'm just here for the drink and the drama.",
    "Hi! Careful, I'll tell you all the bar gossip if you ask.",
    "Hey hey, what's the move tonight? Want my unsolicited advice?",
    "Yes? I was in the middle of judging the jukebox, so this is a good interruption.",
    "Hi, {name}! You're cute when you're trying to get my attention.",
    "Ask me anything, I'm basically furniture at this point.",
    "Hey, you rang the bell and the whole bar turned. Impressive.",
    "Okay, what do you need? I was just about to win this trivia.",
  ],
  idle: [
    // The Violet Hour: the sapphic bar on Nightlife Row
    {
      text: "Pool table's hogged again. Someone's about to get schooled, and it's not me.",
      when: { venue: "violet-hour" },
    },
    {
      text: "I've been in this corner so long the stool has my shape. Don't tell the bar.",
      when: { venue: "violet-hour" },
    },
    {
      text: "The sunset flag is catching the light just right. I'm a little in love with this room.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Lowkey the best part of this bar is the people who keep coming back.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Somebody just nailed a bank shot and everyone cheered. Best sound in the building.",
      when: { venue: "violet-hour" },
    },
    {
      text: "The violet lights make everybody look like they're in a movie. Me too, hopefully.",
      when: { venue: "violet-hour" },
    },
    {
      text: "I'm nursing my drink and watching the room. Rare peace, don't interrupt it.",
      when: { venue: "violet-hour" },
    },
    {
      text: "The regulars' corner is my kingdom. The jukebox is my court jester.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Pink, orange, violet. This room is the only place I can wear all three at once.",
      when: { venue: "violet-hour" },
    },
    {
      text: "I'm pretty sure the pool table likes me more than the other players do.",
      when: { venue: "violet-hour" },
    },
    {
      text: "Every time I think this bar can't get warmer, somebody new walks in and proves me wrong.",
      when: { venue: "violet-hour" },
    },
    "Okay, this jukebox is cursed but the song choices are immaculate.",
    "I've been sitting here for three hours and I'm still not tired.",
    "Honestly, the best part of this bar is watching everyone's outfits.",
    "I told the bartender I'd tip her in compliments. She is not impressed.",
    "Someone please dance, it's been too quiet for too long.",
    "My drink is half gone and my heart is fully committed to this stool.",
    "Okay, gossip: the couple by the window just met on a dating app. Cute.",
    "Trivia night is my Super Bowl. I'm going to win this.",
    "The jukebox has a sad song for every breakup, I'm telling you.",
    "I feel like the bar is my living room with better lighting.",
    "Every time I leave I tell myself I'll go home early. Never happens.",
    {
      text: "Nightlife Row at this hour is pure neon and good decisions.",
      when: { neighborhood: "nightlife-row" },
    },
    {
      text: "The Arts District crowd is wearing the best thrifted jackets tonight.",
      when: { neighborhood: "arts-district" },
    },
  ],
  goodbye: [
    "Okay, I'm heading out. Same time next week, yeah?",
    "Bye, babe! Tell the bartender I said she's doing amazing.",
    "I'm out! Text me when you get home so I know you're safe.",
    "Good night, regulars! See you on the next lucky night.",
    "Later! Don't let them talk you into the karaoke thing without me.",
    "Adios! I'm going to pretend I left early for a good reason.",
    "Night, {name}! You're my favorite part of this neighborhood.",
    "Peace out, friend. Keep the stool warm for me.",
    "Bye! I'll see you when the jukebox gets sad again.",
    "Gonna head home before the sad songs start. Good night, cutie.",
    "Take care! And drink some water on the way out, please.",
  ],
  weather: [
    "Rain again! Good, this bar smells best when everyone's soaked.",
    "Ugh, the heat is making my hair do something weird. Still cute though.",
    "Storms make the bar cozy. I'm not complaining one bit.",
    "The sun is finally out! The whole patio is suddenly on its best behavior.",
    "Cold night out there. Stay near the heater, I'm saving you a spot.",
    "That wind is wild. My umbrella is basically a parachute now.",
    "Foggy outside? Perfect. Bars feel like secrets in weather like this.",
    "Hot as a Manila afternoon out there. Cold drink first, questions later.",
    "You came in with a wet jacket, so you know it's a storm night.",
    "The sky is pink and we're all pretending we planned it.",
    "Lucky you, you walked in right before the rain started. Good timing.",
  ],
  "event-pride-night": [
    "Pride night! Look at all these flags, my heart is so full.",
    "Okay, the rainbow lights are doing something to me tonight. Love it.",
    "I brought my best jacket for pride, and I'm not taking it off.",
    "Happy pride, babe! Drinks are on the regulars, go enjoy.",
    "This room is so loud and so proud. I'm crying a little.",
    "Pride night is my favorite night of the year, I swear on my stool.",
    "Look at the dance floor! Two girls slow dancing right now, sweet.",
    "I'm wearing the sunset flag and I'm proud of it. Don't judge me.",
    "The DJ played my song! I'm about to lose my mind in the best way.",
    "Everybody is so cute tonight. Pride gives the whole bar a glow.",
    "Happy pride, {name}! Go find your people, they're all in this room.",
  ],
  "action-dancing-nearby": [
    "Ooh, you're dancing right next to me! Watch the drink, I'm dancing too.",
    "Dance like nobody's watching. Actually, dance like I'm watching, it's cute.",
    "Okay, that move was clean. Do it again so I can copy it.",
    "I've got two left feet but I'm trying my best over here.",
    "Dancing next to my stool is a risky move, but I respect it.",
    "That's my song! I'm not getting up, but I'm definitely swaying.",
    "You're blocking my view of the DJ. Okay, fine, keep dancing.",
    "The floor's packed and we're all having a good time. Keep it up!",
    "Shake it, babe! I'll be over here cheering with my drink.",
    "Look at you go! Somebody get this person a tip for the dance floor.",
    "Girl, your moves are great. Teach me your secret after the set.",
  ],
  "action-ordering": [
    "Smart order. The bartender makes the {drink} better than anyone.",
    "Ooh, the {drink}! I'll have one too, put it on my tab.",
    "Good choice! That's my drink too, we're basically twins.",
    "Ordering the {drink}? You're going to love it, trust the regular.",
    "Make it a double, the bartender knows how I like it.",
    "Okay, the {drink} is my favorite, and I'm glad you're getting one.",
    "Great, one more for the stool, and get yourself a snack too.",
    "The {drink} is strong tonight, so sip slow and enjoy the view.",
    "Nice pick! Tell the bartender it's your first one here, she'll be nice.",
    "Another {drink}? Respect. Let's make the night last.",
    "Order something sweet for the table and I'll cover the next round.",
  ],
};
