// Clear slurs only: the audience is adults, so general swearing stays allowed.
const SLURS = [
  "beaner",
  "chink",
  "fag",
  "faggot",
  "gook",
  "kike",
  "nigga",
  "nigger",
  "paki",
  "raghead",
  "retard",
  "spic",
  "towelhead",
  "tranny",
  "wetback",
];
// Masked only for players who turn on the strict personal filter.
const PROFANITY = [
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "cock",
  "cunt",
  "damn",
  "dick",
  "dickhead",
  "fuck",
  "fucked",
  "fucker",
  "fuckin",
  "fucking",
  "motherfucker",
  "piss",
  "prick",
  "pussy",
  "shit",
  "shithead",
  "shitty",
  "slut",
  "twat",
  "wanker",
  "whore",
];
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "@": "a",
  $: "s",
};
const TOKEN = /[\p{L}\p{N}@$]+/gu;

/** "ass" → "a+s{2,}": repeats may be stretched but never shortened. */
function stretchable(word: string): string {
  return word.replace(/(.)\1*/g, (run, letter: string) =>
    run.length > 1 ? `${letter}{${run.length},}` : `${letter}+`,
  );
}
function wordPattern(words: string[]): RegExp {
  return new RegExp(`^(?:${words.map(stretchable).join("|")})(?:e?s|z)?$`);
}
const SLUR_WORD = wordPattern(SLURS);
const STRICT_WORD = wordPattern([...SLURS, ...PROFANITY]);
// Short slurs ("spic") hide inside ordinary names ("SpicyMango"), so only long
// ones are searched as substrings of a username.
const SLUR_INSIDE = new RegExp(
  SLURS.filter((word) => word.length >= 5)
    .map(stretchable)
    .join("|"),
);

function normalize(token: string): string {
  return token.toLowerCase().replace(/[01345@$]/g, (char) => LEET[char]);
}

/** Masks listed words whole-token, so "Scunthorpe" and "class" pass through. */
export function filterChat(text: string, opts: { strict: boolean }): string {
  const pattern = opts.strict ? STRICT_WORD : SLUR_WORD;
  return text.replace(TOKEN, (token) =>
    pattern.test(normalize(token)) ? "*".repeat([...token].length) : token,
  );
}

export function isAllowedUsername(name: string): boolean {
  const tokens = name.match(TOKEN) ?? [];
  if (tokens.some((token) => SLUR_WORD.test(normalize(token)))) return false;
  return !SLUR_INSIDE.test(normalize(tokens.join("")).replace(/[^a-z]/g, ""));
}
