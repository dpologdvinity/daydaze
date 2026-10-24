// Beach volleyball at the net on the city beach: first to seven against the
// pair across the net. Each time it comes over, dig it as it reaches you,
// then spike your setter's ball at the top. A perfect spike is a kill; a
// good one gets dug and comes back quicker; a mistimed dig or a spike into
// the net is their point. Swings grade like tennis (tennis.ts). Pure.
//
// The ball's flight for each touch is here too, in court coordinates (the
// net along x at z = 0, your side z < 0, theirs z > 0), so the beach and the
// pool draw the same rally.
import { lobIn, type Flight, type Vec3 } from "./motion/ball.ts";
import type { Swing } from "./tennis.ts";

export const TO_WIN = 7;

export type Rally = {
  you: number;
  them: number;
  /** Times they've dug your spike in this point. */
  rally: number;
  /** What your next press does. */
  touch: "dig" | "spike";
};

export const NEW_RALLY: Rally = { you: 0, them: 0, rally: 0, touch: "dig" };

export type Outcome = "dug" | "rally" | "kill" | "lost";

/** Seconds until the ball is there to hit: their attack speeds up each time
 * they dig yours; the set always hangs the same. */
export function ballSeconds(m: Rally): number {
  return m.touch === "spike" ? 1 : Math.max(0.7, 1.4 - m.rally * 0.12);
}

export const matchOver = (m: Rally) => m.you >= TO_WIN || m.them >= TO_WIN;

export function play(
  m: Rally,
  swing: Swing,
): { match: Rally; outcome: Outcome } {
  if (matchOver(m)) return { match: m, outcome: "lost" };
  const miss = swing === "early" || swing === "late";
  if (miss)
    return {
      match: { ...m, them: m.them + 1, rally: 0, touch: "dig" },
      outcome: "lost",
    };
  if (m.touch === "dig")
    return { match: { ...m, touch: "spike" }, outcome: "dug" };
  if (swing === "perfect")
    return {
      match: { ...m, you: m.you + 1, rally: 0, touch: "dig" },
      outcome: "kill",
    };
  return {
    match: { ...m, rally: m.rally + 1, touch: "dig" },
    outcome: "rally",
  };
}

/** A court's size in meters: half the net's width, each side's depth, and
 * the height of the net's top. */
export type Court = { half: number; depth: number; net: number };

/**
 * A touch's flight: their attack (to your dig), your set (up to your spike),
 * your kill (into their sand), their dig of your spike, your spike into the
 * net, or your shanked dig into your own sand.
 */
export type Shot = "attack" | "set" | "kill" | "their-dig" | "net" | "miss";

/** Where you dig, for a lane across the court (-1 left .. 1 right). */
export const digSpot = (c: Court, lane: number): Vec3 => [
  lane * c.half * 0.4,
  0.7,
  -c.depth * 0.55,
];

/** Where you meet the set at the top of your jump. */
export const spikeSpot = (c: Court, lane: number): Vec3 => [
  lane * c.half * 0.25,
  2.9,
  -0.9,
];

/** The ball's flight for `shot` on `lane`, landing `seconds` after it's hit. */
export function shotFlight(
  c: Court,
  shot: Shot,
  seconds: number,
  lane: number,
): Flight {
  const l = Math.max(-1, Math.min(1, lane));
  const dig = digSpot(c, l);
  const spike = spikeSpot(c, l);
  switch (shot) {
    case "attack":
      // their hitter at the net, high, down to where you dig
      return lobIn([-l * c.half * 0.3, 3.1, 1.4], dig, seconds);
    case "set":
      return lobIn(dig, spike, seconds);
    case "kill":
      return lobIn(spike, [-l * c.half * 0.6, 0.11, c.depth * 0.5], seconds);
    case "their-dig":
      return lobIn(spike, [l * c.half * 0.4, 0.7, c.depth * 0.55], seconds);
    case "net":
      return lobIn(spike, [spike[0], 1.3, -0.08], seconds);
    case "miss":
      return lobIn(
        dig,
        [
          Math.max(-c.half, Math.min(c.half, dig[0] + (l >= 0 ? -2 : 2))),
          0.11,
          -c.depth * 0.85,
        ],
        seconds,
      );
  }
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/**
 * Where the pair across the net stand for a ball headed to `ball`: the digger
 * runs under it when it's on their side (inside the court), the setter
 * shadows it at the net; on your side they wait in their base spots.
 */
export function opponentSpots(
  c: Court,
  ball: Vec3,
): [[number, number], [number, number]] {
  if (ball[2] <= 0)
    return [
      [c.half * 0.35, c.depth * 0.55],
      [-c.half * 0.3, 1.4],
    ];
  return [
    [clamp(ball[0], -c.half, c.half), clamp(ball[2], 1.5, c.depth)],
    [clamp(ball[0] * 0.4, -c.half, c.half), 1.2],
  ];
}
