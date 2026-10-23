// Crazy Eights with the jail guard: five cards each, match the top card's
// suit or rank, eights are wild and name the next suit, draw when you
// can't go. First to empty their hand wins. Pure and seeded.

export const SUITS = ["♠", "♥", "♦", "♣"] as const;
export type Card = { rank: number; suit: number };
export type Who = "you" | "guard";

export type Table = {
  deck: readonly Card[];
  pile: readonly Card[];
  /** The suit to follow: the top card's, or the one an eight named. */
  suit: number;
  you: readonly Card[];
  guard: readonly Card[];
  turn: Who;
  winner: Who | null;
  /** What the guard did on their last turn, for the table talk. */
  guardDid: string;
};

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
export const label = (c: Card) => `${RANKS[c.rank - 1]}${SUITS[c.suit]}`;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(cards: readonly Card[], seed: number): Card[] {
  const out = [...cards];
  const random = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as Card, out[i] as Card];
  }
  return out;
}

export function deal(seed: number): Table {
  const full: Card[] = [];
  for (let suit = 0; suit < 4; suit++)
    for (let rank = 1; rank <= 13; rank++) full.push({ rank, suit });
  const deck = shuffled(full, seed);
  const you = deck.slice(0, 5);
  const guard = deck.slice(5, 10);
  // the first face-up card is never an eight
  const rest = deck.slice(10);
  const first = rest.findIndex((c) => c.rank !== 8);
  const top = rest[first] ?? { rank: 1, suit: 0 };
  return {
    deck: rest.filter((_, i) => i !== first),
    pile: [top],
    suit: top.suit,
    you,
    guard,
    turn: "you",
    winner: null,
    guardDid: "",
  };
}

export const topCard = (t: Table): Card =>
  t.pile[t.pile.length - 1] ?? { rank: 1, suit: 0 };

export const playable = (t: Table, c: Card) =>
  c.rank === 8 || c.suit === t.suit || c.rank === topCard(t).rank;

/** Draws one card for `who`, reshuffling the pile under the top card when
 * the deck runs out. */
function drawFor(t: Table, who: Who): Table {
  let { deck, pile } = t;
  if (deck.length === 0 && pile.length > 1) {
    deck = shuffled(pile.slice(0, -1), pile.length * 31 + t.you.length);
    pile = pile.slice(-1);
  }
  const [card, ...rest] = deck;
  if (!card) return { ...t, deck, pile };
  return who === "you"
    ? { ...t, deck: rest, pile, you: [...t.you, card] }
    : { ...t, deck: rest, pile, guard: [...t.guard, card] };
}

function lay(t: Table, who: Who, index: number, suit?: number): Table {
  const hand = who === "you" ? t.you : t.guard;
  const card = hand[index];
  if (!card) return t;
  const left = hand.filter((_, i) => i !== index);
  const next: Table = {
    ...t,
    pile: [...t.pile, card],
    suit: card.rank === 8 ? (suit ?? card.suit) : card.suit,
    you: who === "you" ? left : t.you,
    guard: who === "guard" ? left : t.guard,
    turn: who === "you" ? "guard" : "you",
  };
  return left.length === 0 ? { ...next, winner: who } : next;
}

/** The guard's move: a matching card if they have one (eights last, naming
 * the suit they hold most of), else they draw one and play it if they can. */
export function guardMove(t: Table): Table {
  if (t.winner || t.turn !== "guard") return t;
  const pick = (h: readonly Card[]) => {
    const plain = h.findIndex((c) => c.rank !== 8 && playable(t, c));
    return plain >= 0 ? plain : h.findIndex((c) => c.rank === 8);
  };
  const most = (h: readonly Card[]) => {
    const n = [0, 1, 2, 3].map(
      (s) => h.filter((c) => c.suit === s && c.rank !== 8).length,
    );
    return n.indexOf(Math.max(...n));
  };
  let i = pick(t.guard);
  let table = t;
  let drew = false;
  if (i < 0) {
    table = drawFor(t, "guard");
    drew = true;
    const last = table.guard.length - 1;
    const card = table.guard[last];
    i = card && playable(table, card) ? last : -1;
  }
  if (i < 0)
    return { ...table, turn: "you", guardDid: "The guard draws and passes." };
  const card = table.guard[i];
  const played = lay(
    table,
    "guard",
    i,
    most(table.guard.filter((_, k) => k !== i)),
  );
  return {
    ...played,
    guardDid: `${drew ? "The guard draws, then plays" : "The guard plays"} ${card ? label(card) : ""}${card?.rank === 8 ? `, calling ${SUITS[played.suit]}` : ""}.`,
  };
}

/** `who` plays card `index` (naming `suit` for an eight), with nobody
 * answering: a game between two players. Illegal plays are ignored. */
export function seatPlay(
  t: Table,
  who: Who,
  index: number,
  suit?: number,
): Table {
  const card = (who === "you" ? t.you : t.guard)[index];
  if (t.winner || t.turn !== who || !card || !playable(t, card)) return t;
  return lay(t, who, index, suit);
}

/** `who` draws a card and passes the turn. */
export function seatDraw(t: Table, who: Who): Table {
  if (t.winner || t.turn !== who) return t;
  return { ...drawFor(t, who), turn: who === "you" ? "guard" : "you" };
}

/** Your move: play card `index` (naming `suit` for an eight). Illegal plays
 * are ignored. The guard answers at once. */
export function playCard(t: Table, index: number, suit?: number): Table {
  const played = seatPlay(t, "you", index, suit);
  return played === t ? t : guardMove(played);
}

/** You can't (or won't) go: draw a card and the guard takes their turn. */
export function drawCard(t: Table): Table {
  if (t.winner || t.turn !== "you") return t;
  return guardMove(seatDraw(t, "you"));
}
