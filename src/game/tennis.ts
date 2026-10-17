// Tennis at the Courtside Club: seven points against the club pro. She
// feeds the ball over the net; swing as it reaches you. A swing near the
// moment it arrives sends it back, a perfect one deep in a rally is a
// winner, and a swing that's too early or too late (or none) loses the
// point. Each return comes back quicker. Pure and deterministic.

export const POINTS = 7;
/** How far either side of the bounce a swing still gets the ball back. */
export const REACH = 0.32;
/** Swings this close to the ball's arrival are perfect. */
export const SWEET = 0.09;
/** Perfect returns from this shot of the rally on are winners. */
export const WINNER_FROM = 3;

export type Swing = "perfect" | "good" | "early" | "late";

/** Seconds the ball takes to come to you on shot `rally` (0 = the serve). */
export function ballSeconds(rally: number): number {
  return Math.max(0.75, 1.5 - rally * 0.1);
}

/** Which side of you it comes to: -1 backhand, 1 forehand. */
export function sideOf(point: number, rally: number): -1 | 1 {
  const v = Math.sin((point * 7 + rally * 3) * 12.9898) * 43758.5453;
  return v - Math.floor(v) < 0.5 ? -1 : 1;
}

/** A swing `error` seconds off the ball's arrival (negative: early). */
export function gradeSwing(error: number): Swing {
  if (!Number.isFinite(error)) return "late";
  if (Math.abs(error) <= SWEET) return "perfect";
  if (Math.abs(error) <= REACH) return "good";
  return error < 0 ? "early" : "late";
}

export type Match = {
  /** Each point played: true when you won it. */
  points: readonly boolean[];
  /** Shots you've returned in the current point. */
  rally: number;
};

export const NEW_MATCH: Match = { points: [], rally: 0 };

export type Outcome = "rally" | "winner" | "lost";

/** Plays your swing on the current shot: the rally goes on, you hit a
 * winner, or you lose the point. */
export function play(
  match: Match,
  swing: Swing,
): { match: Match; outcome: Outcome } {
  if (matchOver(match)) return { match, outcome: "lost" };
  if (swing === "early" || swing === "late")
    return {
      match: { points: [...match.points, false], rally: 0 },
      outcome: "lost",
    };
  if (swing === "perfect" && match.rally + 1 >= WINNER_FROM)
    return {
      match: { points: [...match.points, true], rally: 0 },
      outcome: "winner",
    };
  return { match: { ...match, rally: match.rally + 1 }, outcome: "rally" };
}

export function matchOver(match: Match): boolean {
  return match.points.length >= POINTS;
}

export function pointsWon(match: Match): number {
  return match.points.filter(Boolean).length;
}
