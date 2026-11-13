"""The clip tables for mocap.py, by pack.

Each entry is `id: (source, kind, label[, flags])`. A source is a path under
the repo-root mixamo/ folder without ".fbx" (Mixamo, baked into our files
under Adobe's terms), or "ual1:<action>" / "ual2:<action>" for an action in
Quaternius' Universal Animation Library 1 / 2 (CC0). Ids are stable: gaits.ts,
the pickers, NPCs and saved holds name them.

Kinds (see src/game/dance/mocapTypes.ts): walk, back (a backwards walk),
idle, dance, emote (looped social clips and game actions), pose / sit / lay
(held: the middle frame), seat (a looped sit), swim, and trans (a one-shot
transition: sit down, stand up, start and stop walking, a jump, a turn).

Flags: "menu" puts an emote in the player's emote menu.

Packs are separate GLBs, loaded on demand (src/client/avatar/human/anims.ts):
  core    always loaded: walks, run, idles, the original dances and poses
  social  talking, greetings, yes/no, laughing, cheering, moods, shrugs
  seated  sitting down and standing up, seated idles, talk, clap, cheer, typing
  dance2  the second dance set
  ual     farm work, carrying, pushing, throwing, climbing, sliding (CC0)
  moves   start, stop and turn transitions (not wired into play yet)
"""

PACK_ORDER = ("core", "social", "seated", "dance2", "ual", "moves")

# --------------------------------------------------------------------- core
# The first block is the original set (untouched, in this order: the first
# lay clip is the player's lounge, NPCs pick poses and idles by index, the
# first seat is the default seat).
CORE_ORIGINAL = {
    # walks only play when a gait names them (src/game/gaits.ts)
    # Walks keep the trailing leg long: measured on the takes (knee flex at
    # toe-off / at most, by scripts/mixamo-gait.mjs), these sit near a
    # real walk's ~15 / ~65 degrees; bouncier takes read as jogging.
    "walk-easy": ("walking/styled/Catwalk-Walk-Forward_Female-Walk-Forward", "walk", "Easy"),  # 15 / 60
    "walk-relaxed": ("walking/Standard-Walk_Standard-Walk", "walk", "Relaxed"),  # 20 / 70
    "walk-brisk": ("walking/styled/Strut-Walking_Male-Strut-Walk", "walk", "Brisk"),  # 23 / 76
    "walk-catwalk": ("walking/styled/Catwalk-Walk-Forward-Crossed_Female-Walk-Forward-Legs-Crossing", "walk", "Catwalk"),  # 14 / 67
    "walk-normal": ("walking/Walk_Female-Walk-2", "walk", "Normal"),  # 32 / 67
    "walk-sexy": ("walking/styled/Walking_Female-Sexy-Walk", "walk", "Sexy"),  # 16 / 69
    "walk-feminine": ("walking/styled/Walking-With-A-Swagger-2", "walk", "Feminine"),  # 15 / 75
    "walk-casual": ("walking/styled/Catwalk-Walk-Forward-02_Male-Walk-Forward-02", "walk", "Casual"),  # 21 / 74
    "walk-masc": ("walking/Walking_Male-Standard-Walk", "walk", "Easy stride"),  # 18 / 67
    # a jog for the park's and the boardwalk's runners: 13 at toe-off, 96 at most
    "jog": ("running/Jogging", "walk", "Jog"),
    # standing idles: the player breathes, NPCs pick one by seed
    "idle-breathing": ("idle/Breathing-Idle_Breathing-Idle", "idle", "Breathing"),
    "idle-weight-shift": ("idle/Neutral-Idle_Neutral-Idle", "idle", "Weight shift"),
    "idle-look-around": ("idle/Looking-Around_Idle-Stand-Looking-Around", "idle", "Looking around"),
    "idle-bored": ("idle/Unarmed-Idle-01_Unarmed-Idle", "idle", "Bored"),
    "idle-female": ("idle/Idle_Female-Idle", "idle", "Easy"),
    "idle-happy": ("gestures/emotions/Happy-Idle_Happy-Idle-Variation-1", "idle", "Happy"),
    "salsa": ("dancing/Salsa-Dancing_Salsa-Dancing-Side-To-Side", "dance", "Salsa"),
    "salsa-turns": ("dancing/Salsa-Dancing_Salsa-Dancing-Double-Twirl", "dance", "Salsa turns"),
    "lambada": ("dancing/Salsa-Dancing_Salsa-Dance-Variation-Five", "dance", "Lambada"),
    "expressive": ("dancing/Jazz-Dancing_Female-Jazz-Dancing-'Around-The-World'-Loop", "dance", "Expressive"),
    "belly-dance": ("dancing/Dancing_Belly-Dancing-Variation-Three", "dance", "Belly dance"),
    "breakdance": ("dancing/Breakdance-Ending-1_Breakdance-Finishing-Combo-Var-1", "dance", "Breakdance"),
    "afrobeat": ("dancing/Dancing_Female-African-Noodle-Dance", "dance", "Afrobeat"),
    "body-wave": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Body-Wave'-Dancing", "dance", "Body wave"),
    "salsa-solo": ("dancing/Salsa-Dancing_Female-Salsa-Dancing", "dance", "Salsa solo"),
    "hip-hop": ("dancing/Hip-Hop-Dancing_Hip-Hop-Dancing-Bboy-Variation-One", "dance", "Hip-hop"),
    "side-to-side": ("dancing/Hip-Hop-Dancing_Hip-Hop-Dancing-Side-To-Side", "dance", "Side to side"),
    "samba": ("dancing/Samba-Dancing_Samba-Funky-Pocoto-Variation-1", "dance", "Samba"),
    "house": ("dancing/House-Dancing_House-Dance-Variation-Two", "dance", "House"),
    "shuffle": ("dancing/Shuffling_Doing-The-Shuffling-Dance", "dance", "Shuffle"),
    "charleston": ("dancing/Swing-Dancing_Dance-Swing-Charleston", "dance", "Charleston"),
    "belly-sway": ("dancing/Bellydancing_Bellydance-Variation-2", "dance", "Belly sway"),
    "pagode": ("dancing/Samba-Dancing_Female-Samba-Pagode-Variation-Five-Loop", "dance", "Pagode samba"),
    "rumba": ("dancing/Rumba-Dancing_Female-Rumba-Dancing-Loop", "dance", "Rumba"),
    "arm-wave": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Arm-Wave'-Dancing", "dance", "Arm wave"),
    "kick-step": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Kick-Step'-Dancing", "dance", "Kick step"),
    "raise-the-roof": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Raise-The-Roof'-Dancing", "dance", "Raise the roof"),
    "running-man": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Running-Man'-Dancing", "dance", "Running man"),
    "jazz-square": ("dancing/Jazz-Dancing_Female-Jazz-Square-Dancing", "dance", "Jazz square"),
    "robot": ("dancing/Robot-Hip-Hop-Dance_Robot-Hip-Hop-Dance-Variation-One", "dance", "Robot"),
    "the-twist": ("dancing/Silly-Dancing_Silly-Dancing-The-Twist", "dance", "The twist"),
    "macarena": ("dancing/Macarena-Dance_Dancing-The-Macarena", "dance", "Macarena"),
    "northern-soul": ("dancing/Northern-Soul-Dance_Basic-Northern-Soul-Step", "dance", "Northern soul"),
    "locking": ("dancing/Locking-Hip-Hop-Dance_Locking-Hip-Hop-Dance-Variation-Two", "dance", "Locking"),
    "shy-sway": ("dancing/Hip-Hop-Dancing_Timid-Dancing", "dance", "Shy sway"),
    # emotes: looped like dances, for NPCs only (kept out of the Dance picker)
    "clap": ("gestures/clapping/Clapping_Clap-While-Standing", "emote", "Clapping", "menu"),
    "cheer": ("gestures/cheering/Cheering_Male-Cheering-With-Two-Fists-Pump", "emote", "Cheering", "menu"),
    "fist-pump": ("gestures/cheering/Fist-Pump_Pumping-A-Fist", "emote", "Fist pump"),
    "wave": ("gestures/waving/Waving-Gesture_Aj-Waving-Gesture", "emote", "Waving"),
    "chatting": ("talking/Talking_General-Conversation", "emote", "Chatting"),
    "talk-question": ("talking/Talking_Asking-A-Question-With-One-Hand", "emote", "Asking"),
    "laugh": ("talking/Talking_Talking-Finding-Something-Funny", "emote", "Laughing", "menu"),
    "bartending": ("drinking/Bartending_Pouring-And-Serving-Drinks", "emote", "Bartending"),
    # in the sea (Seaside Swim, the reef): played by the player's afloat doll
    "swim-front": ("swimming/Swimming_Swimming-Underwater", "swim", "Swim"),
    "swim-tread": ("swimming/Treading-Water_Floating", "swim", "Tread water"),
    # game clips: the player's doll plays these during in-world games
    "dig": ("sports/Receiver-Catch_Receiver-Catch-On-Boundary-Line", "emote", "Dig"),
    "spike": ("sports/Goalie-Throw_Goalie-Overhand-Throw", "emote", "Spike"),
    "sing": ("talking/Singing_Singing-While-Walking-On-Stage", "emote", "Singing"),
    # held poses: the middle frame of the take
    "pose-arms-down": ("idle/Female-Standing-Pose_Arms-Down", "pose", "Arms down"),
    "pose-over-shoulder": ("idle/Female-Standing-Pose_Hands-On-Hips-Looking-Over-Shoulder", "pose", "Over the shoulder"),
    "pose-arms-raised": ("idle/Female-Standing-Pose_Legs-Crossed-Arms-Raised", "pose", "Arms raised"),
    "pose-wave": ("idle/Female-Standing-Pose_Right-Hand-On-Hip-Left-Arm-Raised-2", "pose", "Hand on hip"),
    "pose-relaxed": ("idle/Idle_Female-Idle", "pose", "Relaxed"),
    "pose-bashful": ("idle/Bashful_Being-Bashful-While-Standing", "pose", "Bashful"),
    "pose-cocky": ("idle/Being-Cocky_Cocky-Lean-Back", "pose", "Cocky"),
    "pose-lean-back": ("idle/Female-Standing-Pose_Leaning-Back-Left-Hand-On-Hip", "pose", "Lean back"),
    "pose-legs-crossed": ("idle/Female-Standing-Pose_Legs-Crossed-Left-Hand-On-Hip", "pose", "Legs crossed"),
    "pose-foot-up": ("idle/Female-Standing-Pose_Right-Foot-Raised", "pose", "Foot up"),
    "pose-thinking": ("idle/Thinking_Thinking-While-Standing", "pose", "Thinking"),
    "pose-phone": ("talking/Talking-On-Phone_Female-Standing-Talking-On-Phone", "pose", "On the phone"),
    "pose-looking-away": ("idle/Female-Standing-Pose_Looking-Down-To-The-Right", "pose", "Looking away"),
    "pose-waiting": ("idle/Male-Standing-Pose_Arms-Behind-Back", "pose", "Waiting"),
    # the Lean mood: an elbow on the bar
    "pose-lean": ("idle/Male-Standing-Pose_Left-Elbow-Resting-On-Object", "pose", "Leaning"),
    # a seat's own loop: the default for anyone sitting without a held pose
    "sit-idle": ("sitting/Sitting-Idle_Sitting-With-Breathing-Idle", "seat", "Sitting"),
    "sit-lean-back": ("sitting/Female-Sitting-Pose_Arms-Supporting", "sit", "Lean back"),
    "sit-elbows": ("sitting/Female-Sitting-Pose_Leaning-Forward-Elbows-On-Knees", "sit", "Elbows on knees"),
    "sit-crossed": ("sitting/Female-Sitting-Pose_Legs-Crossed-Right-Arm-Over-Knee", "sit", "Legs crossed"),
    "sit-chatting": ("talking/Sitting-Talking_Sitting-And-Talking-To-Another-Person", "sit", "Chatting"),
    "sit-reclined": ("sitting/Female-Sitting-Pose_Legs-Crossed-Reclining", "sit", "Reclined"),
    "sit-arms-crossed": ("sitting/Female-Sitting-Pose_Legs-Crossed-Arms-Crossed", "sit", "Arms crossed"),
    "sit-hug-knee": ("sitting/Female-Sitting-Pose_Arms-Holding-Right-Knee", "sit", "Hugging a knee"),
    "sit-at-table": ("sitting/Seated-Idle-With-Hands-On-A-Table", "sit", "At the table"),
    "sit-upright": ("sitting/Sitting-Idle_Sitting-Still-In-A-Chair", "sit", "Upright"),
    "sit-sipping": ("drinking/Sitting-Drinking_Having-A-Seat-And-Drinking-A-Canned-Beverage", "sit", "Sipping"),
    "lay-arched": ("laying/Female-Laying-Pose_Back-Arched-Arms-Supporting", "lay", "Lounging"),
    "lay-side": ("laying/Female-Laying-Pose_On-Right-Side-Right-Hand-Supporting-Head", "lay", "On my side"),
    "lay-stomach": ("laying/Female-Laying-Pose_On-Stomach-Elbows-Supporting", "lay", "On my stomach"),
}

# New in the motion pass (2026-11-07), still core: more walk styles, a run and
# a sprint, backwards walks, more idles, a jump.
CORE_NEW = {
    "walk-swagger": ("walking/styled/Walking-With-A-Swagger", "walk", "Swagger"),
    "walk-cowgirl": ("walking/styled/Female-Tough-Walk_Female-Walk-Like-A-Cowgirl-1-Stride-Loop", "walk", "Cowgirl"),
    "walk-old-school": ("walking/styled/Old-Man-Walk_Slow-Old-Man-Shuffle-Walk", "walk", "Old school shuffle"),
    "walk-careful": ("walking/Walking_Careful-Walk", "walk", "Careful"),
    "walk-hurried": ("walking/Walking_Male-Hurried-Walk", "walk", "Hurried"),
    "walk-happy": ("gestures/emotions/Walking_Male-Happy-Walk", "walk", "Happy"),
    "walk-gloomy": ("gestures/emotions/Sad-Walk_Walking-Forward-In-A-Sad-Disposition", "walk", "Gloomy"),
    "walk-high-knees": ("walking/styled/Catwalk-Walk-Forward-HighKnees_Female-Walk-Forward-Knees-High", "walk", "High knees"),
    "walk-texting": ("talking/Texting-And-Walking_Female-Walking-And-Texting-On-Phone", "walk", "Texting"),
    # Quaternius, CC0
    "walk-ual": ("ual1:Walk_Loop", "walk", "Stroll"),
    "walk-formal": ("ual1:Walk_Formal_Loop", "walk", "Formal"),
    "run": ("sports/soccer/Jog-Forward_Soccer-Jog-Forward", "walk", "Run"),
    # fast takes: 5.8 and 8.8 m/s measured, for a future sprint key
    "run-ual": ("ual1:Jog_Fwd_Loop", "walk", "Quick run"),
    "sprint-ual": ("ual1:Sprint_Loop", "walk", "Sprint"),
    "back-easy": ("walking/backwards/Walking-Backwards_Female-Walk-Backwards", "back", "Backing up"),
    "back-male": ("walking/backwards/Walking-Backwards_Male-Walk-Backwards", "back", "Backing up (stride)"),
    "back-wary": ("walking/backwards/Walk-Backwards_Slowly-Backing-Away-In-Fear", "back", "Backing away"),
    "idle-shoulders": ("idle/Idle_Looking-Over-Both-Shoulders", "idle", "Checking behind"),
    "idle-casual-2": ("idle/Standing-Idle-2", "idle", "Casual"),
    "idle-casual-3": ("idle/Standing-Idle-3", "idle", "Casual 2"),
    "idle-casual-4": ("idle/Standing-Idle-4", "idle", "Casual 3"),
    "idle-short": ("idle/Unarmed-Idle_Standing-Idle-Loop", "idle", "Standing"),
    "idle-distance": ("idle/Looking_Looking-Off-Into-The-Distance", "idle", "Gazing off"),
    "idle-tablet": ("idle/Standing-Using-Touchscreen-Tablet_Female-Using-Touchscreen-Tablet", "idle", "On a tablet"),
    "idle-sweat": ("idle/Wiping-Sweat_Wiping-Sweat-Idle", "idle", "Wiping brow"),
    "idle-phone": ("ual2:Idle_TalkingPhone_Loop", "idle", "On the phone"),
    "idle-fold-arms": ("ual2:Idle_FoldArms_Loop", "idle", "Arms folded"),
    "idle-ual": ("ual1:Idle_Loop", "idle", "Easy standing"),
    "jump": ("jumping/Jumping-And-Landing-In-Place", "trans", "Jump"),
    "jump-ual": ("ual1:Jump_Start", "trans", "Jump up"),
    "land-ual": ("ual1:Jump_Land", "trans", "Land"),
}

# -------------------------------------------------------------------- social
SOCIAL = {
    # talking (looped; NPCs in conversation, the player's emotes)
    "talk-two-hands": ("talking/Talking_Asking-A-Question-With-Two-Hands", "emote", "Explaining", "menu"),
    "talk-ask": ("talking/Talking_Asking-A-Question", "emote", "Asking"),
    "talk-argue": ("talking/Standing-Arguing_Standing-Arguing-With-Another-Person", "emote", "Arguing"),
    "talk-argue-2": ("talking/Standing-Arguing_Standing-And-Arguing-With-Another-Person", "emote", "Heated"),
    "talk-secret": ("talking/Telling-A-Secret_Telling-A-Secret", "emote", "Whisper", "menu"),
    "talk-watercooler": ("talking/Talking-At-Watercooler_Having-A-Chat-At-The-Watercooler", "emote", "Water cooler chat"),
    "talk-phone": ("talking/Talking-On-A-Cell-Phone_Male-Standing-While-Talking-On-A-Cell-Phone", "emote", "On a call"),
    "talk-phone-pace": ("talking/Talking-Phone-Pacing_Male-Talking-On-The-Cell-Phone-While-Pacing-Back-And-Forth", "emote", "Pacing on a call"),
    "talk-meeting": ("talking/Having-A-Meeting-W-Another-At-A-Desk", "emote", "In a meeting"),
    "talk-rap": ("talking/Rapping_MC-Rapping-On-The-Microphone", "emote", "Rapping"),
    "talk-ual": ("ual1:Idle_Talking_Loop", "emote", "Talking"),
    # waving and greeting
    "wave-big": ("gestures/waving/Waving_Waving", "emote", "Big wave", "menu"),
    "wave-both": ("gestures/waving/Waving_Waving-With-Both-Hands", "emote", "Both hands"),
    "wave-warm": ("gestures/waving/Waving_Emotional-Waving-Forward", "emote", "Warm wave"),
    "greet": ("gestures/greetings/Standing-Greeting_Greeting-While-Standing", "emote", "Hello", "menu"),
    "acknowledge": ("gestures/greetings/Acknowledging_Acknowledging-Gesture", "emote", "Acknowledge", "menu"),
    "bow": ("gestures/greetings/Quick-Formal-Bow_Quick-Formal-Bow", "emote", "Bow", "menu"),
    "bow-casual": ("gestures/greetings/Quick-Informal-Bow_Quick-Informal-Bow", "emote", "Small bow"),
    "salute": ("gestures/greetings/Salute_Formal-Military-Salute", "emote", "Salute", "menu"),
    # yes and no
    "nod-yes": ("gestures/yes-no/Head-Nod-Yes_Nodding-Head-Yes", "emote", "Yes", "menu"),
    "nod-hard": ("gestures/yes-no/Hard-Head-Nod_Hard-Head-Nod-Yes", "emote", "Definitely"),
    "nod-thoughtful": ("gestures/yes-no/Thoughtful-Head-Nod_Thoughtfully-Nodding-Head-Yes", "emote", "Hmm, yes"),
    "nod-sarcastic": ("gestures/yes-no/Sarcastic-Head-Nod_Sarcastically-Nodding-Head-Yes", "emote", "Sure, sure"),
    "shake-no": ("gestures/yes-no/Shaking-Head-No_Shaking-Head-No-Dismissively", "emote", "No", "menu"),
    "no-wag": ("gestures/yes-no/No_Indicating-No", "emote", "Nope"),
    "shake-thoughtful": ("gestures/yes-no/Thoughtful-Head-Shake_Shaking-Head-No-Thoughtfully", "emote", "Not sure"),
    "yes-ual": ("ual2:Yes", "emote", "Yes please"),
    # reactions and moods
    "shrug": ("gestures/Whatever-Gesture_Aj-Whatever-Gesture", "emote", "Shrug", "menu"),
    "think": ("idle/Thinking_Thinking-While-Standing", "emote", "Thinking", "menu"),
    "thumbs-up": ("gestures/Standing-Thumbs-Up_Giving-Thumbs-Up-While-Standing", "emote", "Thumbs up", "menu"),
    "point": ("gestures/pointing/Pointing-Gesture_Aj-Pointing-Gesture", "emote", "Pointing", "menu"),
    "point-big": ("gestures/pointing/Pointing-Gesture_Big-Vegas-Pointing-Gesture", "emote", "Over there"),
    "happy": ("gestures/emotions/Happy_Standing-Happily", "emote", "Happy", "menu"),
    "happy-hands": ("gestures/emotions/Happy-Hand-Gesture_Happy-Forward-Hand-Gesture", "emote", "Excited talk"),
    "sad": ("gestures/emotions/Sad-Idle_Sad-Idle-Variation-1", "emote", "Sad", "menu"),
    "cry": ("gestures/emotions/Crying_Crying-And-Rubbing-Eyes", "emote", "Crying"),
    "angry": ("gestures/emotions/Angry_Standing-Angrily", "emote", "Annoyed", "menu"),
    "surprised": ("gestures/emotions/Reacting_Being-Surprised-And-Looking-Right", "emote", "Surprised", "menu"),
    "thankful": ("idle/Thankful_Being-Thankful-While-Standing", "emote", "Thankful", "menu"),
    "bashful": ("idle/Bashful_Being-Bashful-While-Standing", "emote", "Bashful"),
    "cocky": ("idle/Being-Cocky_Cocky-Lean-Back", "emote", "Cocky"),
    "pout": ("gestures/Pouting_Standing-Pout-Gesture", "emote", "Pout"),
    "yawn": ("gestures/Yawn_Big-Yawn-While-Standing", "emote", "Yawn", "menu"),
    "sigh": ("gestures/Relieved-Sigh_Sighing-In-Relief", "emote", "Phew", "menu"),
    "terrified": ("idle/Terrified_Being-Terrified-While-Standing", "emote", "Scared"),
    "weight-gesture": ("gestures/Weight-Shift-Gesture_Big-Vegas-Weight-Shift-Gesturing", "emote", "Making a point"),
    "arm-gesture": ("gestures/Arm-Gesture_Gesturing-With-Arm-To-The-Side", "emote", "Presenting"),
    "hands-forward": ("gestures/Hands-Forward-Gesture_Two-Handed-Forward-Gesture", "emote", "Hands out"),
    "look-distance": ("idle/Looking_Looking-With-Hand-Shading-Eyes", "emote", "Looking far"),
    # cheering
    "cheer-head-bang": ("gestures/cheering/Cheering_Male-Cheering-Head-Banging", "emote", "Head banging"),
    "excited": ("gestures/cheering/Excited_Super-Excited", "emote", "Super excited", "menu"),
    "rally": ("gestures/cheering/Rallying_Rallying-The-Crowd-To-Make-Them-Cheer", "emote", "Rally the crowd"),
    "victory": ("gestures/cheering/Victory_Celebrating-After-A-Win", "emote", "Victory", "menu"),
    "fist-pump-big": ("gestures/cheering/Fist-Pump_High-Enthusiasm-Fist-Pump", "emote", "Big fist pump"),
    # conversation beats for groups of NPCs (game/dance/conversation.ts): a
    # speaker's manners, a listener's nods and shakes, the heated end
    "talk-general": ("talking/Talking_General-Conversation", "emote", "Chatting it up"),
    "talk-whisper": ("talking/Telling-A-Secret_Telling-A-Secret-2", "emote", "Whispering"),
    "talk-phone-f": ("talking/Talking-On-Phone_Female-Standing-Talking-On-Phone", "emote", "Phone call", "menu"),
    "nod-agree": ("gestures/yes-no/Agreeing_Agreeing-Yes", "emote", "Agreeing"),
    "nod-long": ("gestures/yes-no/Lengthy-Head-Nod_Nodding-Head-Yes", "emote", "Nodding along"),
    "shake-annoyed": ("gestures/yes-no/Annoyed-Head-Shake_Shaking-Head-No-Annoyed", "emote", "Tsk, no"),
    "head-sway": ("gestures/yes-no/Head-Gesture_Gesturing-Head-Side-To-Side", "emote", "So-so"),
    "dismiss": ("gestures/greetings/Dismissing-Gesture_Dismissing-With-Hand-Forward", "emote", "Wave it off"),
    "dismiss-back": ("gestures/greetings/Dismissing-Gesture_Dismissing-With-Back-Hand", "emote", "Brush off"),
    "disappointed": ("gestures/pointing/Disappointed_Disappointed-Awe-Shucks", "emote", "Aw, shucks"),
    "yell": ("gestures/emotions/Standing-Yell_Short-Yell-While-Standing", "emote", "Shouting"),
    "angry-forward": ("gestures/emotions/Angry-Gesture_Angry-Forward-Gesture", "emote", "Furious"),
    "point-angry": ("gestures/pointing/Angry-Point_Quickly-Pointing-Angrily-Forward", "emote", "Accusing"),
    "hand-raise": ("gestures/Hand-Raising_Raising-A-Hand", "emote", "Hand up"),
    "look-away": ("gestures/Look-Away-Gesture_Sarcastically-Looking-Away", "emote", "Eye roll"),
    "pat-back": ("gestures/Patting_Patting-On-The-Back", "emote", "Pat on the back"),
    "scheme": ("gestures/Plotting_Evil-Plotting", "emote", "Scheming"),
}

# -------------------------------------------------------------------- seated
SEATED = {
    # transitions: the seat's loop picks up where they end (mocap.py anchors
    # a sit-down's last frame, and a stand-up's first, on the seat's height).
    # Mixamo's stand-ups run 5 to 6 seconds, too slow for a game: only
    # Quaternius' one-second stand-up is baked.
    "sit-down": ("sitting/Stand-To-Sit_Standing-To-Sitting-Transition", "trans", "Sit down"),
    "sit-down-ual": ("ual1:Sitting_Enter", "trans", "Sit down (soft)"),
    "stand-up-ual": ("ual1:Sitting_Exit", "trans", "Stand up (soft)"),
    # looped seated idles and talk (kind seat: the same height as a sit)
    "seat-fidget": ("sitting/Sitting_Sit-With-Fidgeting-Feet", "seat", "Fidgeting"),
    "seat-waiting": ("sitting/Sitting_Sitting-And-Impatiently-Waiting", "seat", "Waiting"),
    "seat-looking": ("sitting/Sitting_Sitting-Looking-Side-To-Side", "seat", "Looking around"),
    "seat-hands-thighs": ("sitting/Sitting-Idle_Sitting-In-Chair-Hands-Resting-On-Thighs", "seat", "Hands on thighs"),
    "seat-ual": ("ual1:Sitting_Idle_Loop", "seat", "Settled in"),
    "seat-talk": ("talking/Sitting-Talking_Sitting-And-Talking-To-Another-Person", "seat", "Talking"),
    "seat-talk-2": ("talking/Sitting-Talking_Sitting-And-Talking-To-Another-Person-2", "seat", "Chatting away"),
    "seat-talk-male": ("talking/Talking_Male-Talking-While-Seated", "seat", "Telling a story"),
    "seat-talk-ual": ("ual1:Sitting_Talking_Loop", "seat", "Talking (easy)"),
    "seat-laugh": ("gestures/emotions/Sitting-Laughing_Sitting-While-Laughing", "seat", "Laughing"),
    "seat-clap": ("gestures/clapping/Clapping_Clap-While-Seated", "seat", "Clapping"),
    "seat-clap-big": ("gestures/clapping/Sitting-Clap_Sitting-Ethusiastic-Clap", "seat", "Clapping hard"),
    "seat-clap-soft": ("gestures/clapping/Sitting-Clap_Sitting-Unethusiastic-Clap", "seat", "Polite clap"),
    "seat-cheer": ("gestures/cheering/Cheering-While-Sitting_Cheering-While-Sitting-With-High-Enthusiasm", "seat", "Cheering"),
    "seat-cheer-low": ("gestures/cheering/Cheering-While-Sitting_Cheering-While-Sitting-With-Low-Enthusiasm", "seat", "Cheering softly"),
    "seat-cheer-chat": ("gestures/cheering/Cheering-While-Sitting_Cheering-While-Sitting-And-Talking-To-Neighbor", "seat", "Cheering with a friend"),
    "seat-victory": ("gestures/cheering/Sitting-Victory_Celebrating-Victory-While-Sitting", "seat", "Victory"),
    "seat-fist-pump": ("gestures/cheering/Sitting-Fist-Pump_Low-Enthusiasm-Fist-Pump-While-Sitting", "seat", "Fist pump"),
    "seat-yell": ("gestures/emotions/Sitting-Yell_Short-Yell-Sitting-Up", "seat", "Yelling"),
    "seat-disbelief": ("sitting/Sitting-Disbelief_Sitting-In-Disbelief-With-Head-Back", "seat", "Disbelief"),
    "seat-point": ("gestures/pointing/Sitting-And-Pointing_Sitting-And-Pointing-Forward", "seat", "Pointing"),
    "seat-typing": ("sitting/Typing_Sitting-At-A-Computer-And-Typing", "seat", "Typing"),
    "seat-tapping": ("sitting/Dice-Idle_Tapping-Fingers-From-A-Sitting-Position", "seat", "Drumming fingers"),
    "type-start": ("sitting/Sit-To-Type_Sitting-To-Typing", "trans", "Pull up to the desk"),
    "type-stop": ("sitting/Type-To-Sit_Typing-To-Sitting-Idle", "trans", "Lean back"),
}

# --------------------------------------------------------------------- dance2
DANCE2 = {
    "thriller": ("dancing/Thriller-Part-1_Thriller-Dance-Part-1", "dance", "Thriller"),
    "thriller-2": ("dancing/Thriller-Part-2_Thriller-Dance-Part-2", "dance", "Thriller, part 2"),
    "thriller-3": ("dancing/Thriller-Part-3_Thriller-Dance-Part-3", "dance", "Thriller, part 3"),
    "thriller-4": ("dancing/Thriller-Part-4_Thriller-Dance-Part-4", "dance", "Thriller, part 4"),
    "ymca": ("dancing/Ymca-Dance_Doing-The-Ymca-Dance", "dance", "YMCA"),
    "gangnam": ("dancing/Gangnam-Style_The-Popular-K-Pop-Dance", "dance", "K-pop hit"),
    "hokey-pokey": ("dancing/Hokey-Pokey_Doing-The-Hokey-Pokey", "dance", "Hokey pokey"),
    "chicken-dance": ("dancing/Chicken-Dance_Doing-The-Chicken-Dance", "dance", "Chicken dance"),
    "moonwalk": ("dancing/Hip-Hop-Dancing_Hip-Hop-Dance-Moonwalk", "dance", "Moonwalk"),
    "moonwalk-slide": ("dancing/Moonwalk_Walking-Backwards-Sliding-Feet", "dance", "Backslide"),
    "can-can": ("dancing/Can-Can_Doing-The-Can-Can", "dance", "Can-can"),
    "shopping-cart": ("dancing/Shopping-Cart-Dance_Shopping-Cart-Silly-Dance", "dance", "Shopping cart"),
    "cabbage-patch": ("dancing/Silly-Dancing_Silly-Dancing-The-Cabbage-Patch", "dance", "Cabbage patch"),
    "boogaloo": ("dancing/Dancing_Boogaloo", "dance", "Boogaloo"),
    "maraschino": ("dancing/Dancing-Maraschino-Step_Dancing-The-Maraschino-Step", "dance", "Maraschino step"),
    "ballet": ("dancing/Dancing_Ballet-Dance-Variation-One", "dance", "Ballet"),
    "ballet-2": ("dancing/Dancing_Ballet-Dance-Variation-Two", "dance", "Ballet, second"),
    "rainbow": ("dancing/Dancing_Female-African-Rainbow-Dance", "dance", "Rainbow"),
    "hip-shimmy": ("dancing/Hip-Hop-Dancing_Hip-Hop-Dancing-Shimmy", "dance", "Hip-hop shimmy"),
    "quake": ("dancing/Hip-Hop-Dancing_Hip-Hop-Quake-Variation-1", "dance", "Quake"),
    "slide-step": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Slide-Step'-Dancing", "dance", "Slide step"),
    "rib-pops": ("dancing/Hip-Hop-Dancing_Female-Hip-Hop-'Rib-Pops'-Dancing", "dance", "Rib pops"),
    "arm-push": ("dancing/Jazz-Dancing_Female-Jazz-Dancing-'Arm-Push'", "dance", "Arm push"),
    "rockette-kick": ("dancing/Jazz-Dancing_Female-Jazz-Dancing-'Rockette-Kick'", "dance", "Kick line"),
    "shim-sham": ("dancing/Swing-Dancing_Swing-Dance-Shim-Sham-Variation-1", "dance", "Shim sham"),
    "shim-sham-2": ("dancing/Swing-Dancing_Swing-Dance-Shim-Sham-Variation-2", "dance", "Shim sham, second"),
    "crazy-legs": ("dancing/Swing-Dancing_Swing-Dance-Charleston-Crazy-Legs", "dance", "Crazy legs"),
    "charleston-2": ("dancing/Swing-Dancing_Swing-Dance-Charleston-Variation-2", "dance", "Charleston, second"),
    "house-3": ("dancing/House-Dancing_House-Dance-Variation-3", "dance", "House, third"),
    "house-4": ("dancing/House-Dancing_House-Dance-Variation-Four", "dance", "House, fourth"),
    "salsa-clap": ("dancing/Salsa-Dancing_Salsa-Dancing-Twirl-And-Clap", "dance", "Salsa clap"),
    "salsa-up-back": ("dancing/Salsa-Dancing_Salsa-Dancing-Up-And-Back", "dance", "Salsa up and back"),
    "samba-reggae": ("dancing/Samba-Dancing_Afoxe-Samba-Reggae-Dance", "dance", "Samba reggae"),
    "samba-parade": ("dancing/Samba-Dancing_Defile-De-Samba-Parade-Variation", "dance", "Samba parade"),
    "samba-enredo": ("dancing/Samba-Dancing_Female-Fast-Samba-Enredo-Variation-Two", "dance", "Fast samba"),
    "samba-ijexa": ("dancing/Samba-Dancing_Female-Samba-Ijexa-Break", "dance", "Ijexa break"),
    "samba-olodum": ("dancing/Samba-Dancing_Samba-Dance-Olodum-Variation-Two", "dance", "Olodum"),
    "samba-gandy": ("dancing/Samba-Dancing_Samba-Gandy-Variation-1", "dance", "Gandy samba"),
    "snake": ("dancing/Snake-Hip-Hop-Dance_Snake-Hip-Hop-Dance", "dance", "Snake"),
    "step-hop": ("dancing/Step-Hip-Hop-Dance_Step-Hip-Hop-Dance", "dance", "Step hop"),
    "tut": ("dancing/Tut-Hip-Hop-Dance_Tut-Hip-Hop-Dance-Variation-One", "dance", "Tut"),
    "tut-2": ("dancing/Tut-Hip-Hop-Dance_Tut-Hip-Hop-Dance-Variation-Two", "dance", "Tut, second"),
    "wave-hop": ("dancing/Wave-Hip-Hop-Dance_Wave-Hip-Hop-Dance-Variation-One", "dance", "Wave hop"),
    "wave-hop-2": ("dancing/Wave-Hip-Hop-Dance_Wave-Hip-Hop-Dance-Variation-Two", "dance", "Wave hop, second"),
    "slide-hop": ("dancing/Slide-Hip-Hop-Dance_Slide-Hip-Hop-Dance-Variation-One", "dance", "Slide hop"),
    "booty-step": ("dancing/Booty-Hip-Hop-Dance_Booty-Step-Hip-Hop-Dance", "dance", "Booty step"),
    "arms-hop": ("dancing/Arms-Hip-Hop-Dance_Hip-Hop-Dancing-With-Arms", "dance", "Arms up"),
    "dance-ual": ("ual1:Dance_Loop", "dance", "Freestyle"),
}

# ----------------------------------------------------------------------- ual
# Quaternius, CC0. Played by the garden, the farm, the forest, the skatepark.
UAL = {
    "farm-harvest": ("ual2:Farm_Harvest", "emote", "Harvesting"),
    "farm-plant": ("ual2:Farm_PlantSeed", "emote", "Planting"),
    "farm-water": ("ual2:Farm_Watering", "emote", "Watering"),
    "chop-tree": ("ual2:TreeChopping_Loop", "emote", "Chopping"),
    "carry-walk": ("ual2:Walk_Carry_Loop", "walk", "Carrying"),
    "interact": ("ual1:Interact", "emote", "Reaching"),
    "pick-up": ("ual1:PickUp_Table", "emote", "Picking up"),
    "push": ("ual1:Push_Loop", "emote", "Pushing"),
    "throw": ("ual2:OverhandThrow", "emote", "Throwing"),
    "consume": ("ual2:Consume", "emote", "Eating"),
    "chest-open": ("ual2:Chest_Open", "emote", "Opening a chest"),
    "climb": ("ual2:ClimbUp_1m", "emote", "Climbing up"),
    "slide-start": ("ual2:Slide_Start", "trans", "Start a slide"),
    "slide-loop": ("ual2:Slide_Loop", "emote", "Sliding"),
    "slide-exit": ("ual2:Slide_Exit", "trans", "Finish a slide"),
    "kneel-fix": ("ual1:Fixing_Kneeling", "emote", "Fixing something"),
    "idle-lantern": ("ual2:Idle_Lantern_Loop", "emote", "Holding a lantern"),
    "idle-torch": ("ual1:Idle_Torch_Loop", "emote", "Holding a torch"),
    "driving": ("ual1:Driving_Loop", "seat", "Driving"),
}

# --------------------------------------------------------------------- moves
# Start, stop and turn transitions (baked in place; not wired into play yet).
MOVES = {
    "start-walk": ("walking/idle-transitions/Start-Walking_Walking-From-Standing", "trans", "Start walking"),
    "stop-walk": ("walking/idle-transitions/Stop-Walking_Walking-To-Standing-Idle", "trans", "Stop walking"),
    "start-walk-f": ("walking/idle-transitions/Female-Start-Walking_Female-Start-Walking", "trans", "Start walking (easy)"),
    "stop-walk-f": ("walking/idle-transitions/Female-Stop-Walking_Female-Stop-Walking", "trans", "Stop walking (easy)"),
    "start-sprint": ("running/Idle-To-Sprint_Start-Sprint-From-Action-Idle", "trans", "Break into a sprint"),
    "turn-left": ("walking/turns/Catwalk-Twist-L-To-Walk-180_Female-Twist-Left-Idle-To-Walk-180-Turning-Left", "trans", "Turn left"),
    "turn-right": ("walking/turns/Catwalk-Twist-R-To-Walk-180_Female-Twist-Right-Idle-To-Walk-180-Turning-Right", "trans", "Turn right"),
    "turn-180": ("walking/turns/Walking-Turn-180_Turning-180-Degrees-While-Walking", "trans", "About face"),
}

PACKS = {
    "core": {**CORE_ORIGINAL, **CORE_NEW},
    "social": SOCIAL,
    "seated": SEATED,
    "dance2": DANCE2,
    "ual": UAL,
    "moves": MOVES,
}
