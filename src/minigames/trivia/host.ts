// The quiz host's patter on trivia night: handwritten lines for the welcome,
// a right answer, a wrong one (or a clock that ran out), and the final score.
// Each bank has ten or more; hostLine walks a bank by index so neighboring
// questions never repeat a line. Pure.

export const HOST_MOMENTS = ["open", "right", "wrong", "high", "low"] as const;
export type HostMoment = (typeof HOST_MOMENTS)[number];

export const HOST_LINES: Record<HostMoment, readonly string[]> = {
  open: [
    "Welcome, welcome! Pencils up, phones down. I'm watching you.",
    "Ten questions, fifteen seconds each, and the bragging rights are real.",
    "Good evening, quizzers! Tonight's theme is the 2000s, so dust off your flip phone.",
    "No huddling, no googling, no shouting. Okay, a little shouting.",
    "Our champions win nothing but glory and a very small round of applause.",
    "Let's begin! Remember: every wrong answer is just a funny story later.",
    "Fresh questions, same old pressure. Ready?",
    "Think fast, answer faster. The clock is not your friend tonight.",
    "I wrote these myself, so if one is mean, that's my sense of humor.",
    "First question's coming in hot. Eyes up!",
  ],
  right: [
    "Correct! Somebody was paying attention in 2004.",
    "That's the one! Give yourself a snap.",
    "Yes! Ding ding ding!",
    "Right on the money. I'm a little jealous.",
    "Nailed it. Do not let it go to your head.",
    "Correct, and with style.",
    "You knew that and you did not even blink.",
    "That's a point for the home team.",
    "Spot on! The room felt that one.",
    "Brilliant. Next question, same energy.",
    "Right again! Somebody call a historian.",
    "Yes, yes, yes! You're on a roll.",
  ],
  wrong: [
    "Ooh, so close. Okay, not that close.",
    "Not quite, but I admire the confidence.",
    "That's a no from me. Shake it off.",
    "Wrong, but wrong in an interesting way.",
    "The answer was over there. You were looking over here.",
    "It happens to the best of us. Mostly to me.",
    "Oof. We will never speak of it again.",
    "Close your eyes, take a breath, forget that one.",
    "Nope! But the next one is a gift. Probably.",
    "Time's up or a bad guess, either way it's behind us now.",
    "That one stumped half the room last week too.",
    "Don't worry, there's no penalty for being charmingly wrong.",
  ],
  high: [
    "Seven or better! You, my friend, should be on a team poster.",
    "What a round! I'm going to have to write harder questions.",
    "That's a champion's score. The trophy is imaginary but the pride is real.",
    "Incredible. Somebody get this quizzer a snack.",
    "You were on fire tonight. Please sit near me next week.",
    "Top of the leaderboard energy. Take a bow.",
    "That's the kind of score that makes the host nervous.",
    "Outstanding! Your team name is going on the wall.",
    "Flawless instincts. Collect your coins, champion.",
    "Now that is how you do trivia night!",
  ],
  low: [
    "Well, you showed up, and showing up counts.",
    "A learning experience! Come back next Tuesday and get revenge.",
    "Not your night, but the fries tasted great, right?",
    "Chin up. Even legends have an off round.",
    "The questions were hard. That's what I'm telling everyone.",
    "You gave it your all. That's what the coins are for.",
    "Every great quizzer started somewhere, usually here, usually confused.",
    "A round to forget. A night to remember.",
    "Good effort! Go chat with the regulars, they've got tips.",
    "Next week the theme might be your best subject. Fingers crossed.",
  ],
};

/** The host's line for a moment; `n` (a question number, say) walks the bank. */
export function hostLine(moment: HostMoment, n: number): string {
  const bank = HOST_LINES[moment];
  const i = ((Math.trunc(n) % bank.length) + bank.length) % bank.length;
  return bank[i] ?? bank[0] ?? "";
}

/** The closing moment for a round's score out of ten: seven or more is high. */
export function hostMoment(right: number): "high" | "low" {
  return right >= 7 ? "high" : "low";
}
