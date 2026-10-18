import {
  addHit,
  addTea,
  decay,
  HIGH_DECAY_SECONDS,
  TRIP_DECAY_SECONDS,
  type HighLook,
  type Hit,
} from "../../game/effects/high.ts";

// The local player's high (weed) and trip (shrooms), in memory like the
// buzz: a reload sobers the doll up. 18+ rooms only.
let high = 0;
let trip = 0;
const listeners = new Set<() => void>();
const changed = () => {
  for (const listen of listeners) listen();
};

/** This frame's high and trip visuals, rewritten by DrunkState. */
export const liveHigh: HighLook = { glow: 0, hue: 0, breathe: 0, drift: 1 };

export const getHigh = () => high;
export const getTrip = () => trip;

export function takeHit(hit: Hit): void {
  high = addHit(high, hit);
  changed();
}

export function sipTea(): void {
  trip = addTea(trip);
  changed();
}

/** Fades both by `seconds` of play. Called once a frame. */
export function ageHigh(seconds: number): void {
  high = decay(high, seconds, HIGH_DECAY_SECONDS);
  trip = decay(trip, seconds, TRIP_DECAY_SECONDS);
}

export function onHighChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
