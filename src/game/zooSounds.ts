// The Zoo's animal calls: now and then one of the animals that has a recorded
// call (elephants, lions, flamingos, zebras, penguins, the cow and the donkey) lets one out, as loud as it
// is near. Pure: the client passes where the listener and the animals are.
import type { Vec2 } from "./walk.ts";
import type { Species } from "./zoo.ts";

/** The call each species makes (file ids in public/audio/). */
export const CALLS = {
  elephant: "elephant",
  lion: "lion",
  flamingo: "flamingos",
  zebra: "zebra",
  penguin: "penguin",
  cow: "cow",
  donkey: "donkey",
} as const satisfies Partial<Record<Species | "cow" | "donkey", string>>;
export type CallId = (typeof CALLS)[keyof typeof CALLS];
/** An animal that may call: a habitat species or one of the farm's voices. */
export type Caller = Species | "cow" | "donkey";
const hasCall = (kind: Caller): kind is keyof typeof CALLS =>
  Object.hasOwn(CALLS, kind);

/** Past this many meters a call is not worth playing. */
export const HEARING = 24;

/** Seconds to wait before the next call: 6 to 16. */
export const nextDelay = (roll: number): number => 6 + roll * 10;

/** How loud a call is from `distance` meters: full at the fence, fading to
 * nothing at HEARING, then squared so it drops off quickly. */
export function loudness(distance: number): number {
  const t = Math.max(0, 1 - distance / HEARING);
  return t * t;
}

/** The next call, or null when nothing worth hearing is in range. `pick` (0..1) chooses
 * which of the animals with a call speaks up. */
export function pickCall(
  listener: Vec2,
  animals: readonly { kind: Caller; at: Vec2 }[],
  pick: number,
): { id: CallId; gain: number } | null {
  const voices = animals.flatMap((a) =>
    hasCall(a.kind) ? [{ id: CALLS[a.kind], at: a.at }] : [],
  );
  const one =
    voices[Math.min(voices.length - 1, Math.floor(pick * voices.length))];
  if (!one) return null;
  const gain = loudness(
    Math.hypot(one.at[0] - listener[0], one.at[1] - listener[1]),
  );
  if (gain < 0.03) return null;
  return { id: one.id, gain: Math.min(1, gain) };
}
