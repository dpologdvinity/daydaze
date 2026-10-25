// Game seat claims: an in-world game puts the player's doll on a seat it
// moves itself (a slide, a dive, the mic). Only one game holds the seat at a
// time, and a game only ever releases the seat object it took, so two games
// in one room can't strand each other. A chair the player sat on is stood
// up from first.

/** What a claim needs from the player: her seat and whether she's on a chair. */
type Holder<S> = { seat: S | null; sitting: boolean };

/**
 * Puts `mine` on the player unless another game's seat is there; a chair
 * seat is stood up from. Returns whether the seat is now `mine`.
 */
export function claimSeat<S>(p: Holder<S>, mine: S): boolean {
  if (p.seat === mine) return true;
  if (p.seat && !p.sitting) return false;
  p.sitting = false;
  p.seat = mine;
  return true;
}

/** Takes `mine` off the player, if it's still hers. */
export function releaseSeat<S>(p: Holder<S>, mine: S): void {
  if (p.seat === mine) p.seat = null;
}
