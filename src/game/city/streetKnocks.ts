// What a car does to the people on the street: a walker knocked down by your
// car lands where it threw her, plays her fall and get-up, then walks on from
// where she was hit; a walker who sees a car bearing down notices it after
// about a second (each in her own time) and dodges aside or freezes; and
// bystanders stop and turn to look. Pure and per walker: pedestrians.ts
// keeps her path, this keeps what happened to her on top of it.
// shortcut: local-only, like the traffic: peers see their own street (#9).

import {
  hitDirection,
  reactionAt,
  startReaction,
  type Playing,
  type ReactionId,
} from "../reactions.ts";
import { yawTowards, type Vec2 } from "../walk.ts";
import { isBlocked } from "../area.ts";
import { CITY_AREA } from "./layout.ts";
import { hitOutcome, hitReaction, knockback } from "./carHits.ts";
import { hash } from "./hash.ts";
import { pedestrianAt, type Pedestrian } from "./pedestrians.ts";

/** Seconds she takes, after a fall or a dodge, to drift back onto her line. */
export const RETURN_SECONDS = 2.5;
/** Meters a dodge takes her sideways out of a car's line. */
const DODGE = 1.8;
/** Seconds a dodge takes, and that she stands in it before walking on. */
const DODGE_SECONDS = 0.5;
const DODGE_HOLD = 0.9;
/** Seconds a freeze holds her, facing the car. */
const FREEZE_HOLD = 1.4;
/** Seconds a bystander stands and stares. */
const WATCH_HOLD = 2.5;
/** Seconds a car's throw takes to land her. */
const THROW_SECONDS = 0.4;
/** A car closer than this many seconds from her, in her lane, is a threat. */
const THREAT_SECONDS = 2.5;
/** Half the width of a car's path she counts as "in it", meters. */
const THREAT_HALF_WIDTH = 2;
/** Slower than this (m/s), a car is no threat: it is parking. */
const THREAT_SPEED = 2;
/** A person's radius, for contact, meters. */
const PERSON = 0.3;

/** A car as the street sees it: where it is, its unit heading, its speed. */
export type CarNow = {
  x: number;
  z: number;
  fx: number;
  fz: number;
  speed: number;
};

/** Something that happened to her: when, how long she stopped walking, how
 * far it moved her (and over how long), the way she faced meanwhile and the
 * reaction she played. */
export type StreetEvent = {
  kind: "knock" | "dodge" | "freeze" | "watch";
  at: number;
  hold: number;
  push: Vec2;
  pushSeconds: number;
  /** Her offset off her line when it began, left by the event before. */
  from: Vec2;
  yaw: number | null;
  play: Playing | null;
};

/** One walker's street state: seconds her walk has lost to stops before the
 * current event, the current event, and when she first saw a threat (NaN:
 * none in sight). */
export type StreetState = {
  lag: number;
  ev: StreetEvent | null;
  noticed: number;
};

export const newStreet = (): StreetState => ({
  lag: 0,
  ev: null,
  noticed: Number.NaN,
});

/** Where she is and what she is doing: `held` while she stands (fallen,
 * frozen, staring), `reaction` while a clip plays. */
export type StreetPose = {
  x: number;
  z: number;
  yaw: number;
  held: boolean;
  reaction: ReactionId | null;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Her offset off her line `time` seconds into event `ev`, along one axis. */
function offsetAxis(ev: StreetEvent, time: number, axis: 0 | 1): number {
  const since = time - ev.at;
  const k = ev.pushSeconds > 0 ? smooth(clamp01(since / ev.pushSeconds)) : 1;
  const decay = 1 - smooth(clamp01((since - ev.hold) / RETURN_SECONDS));
  return (ev.from[axis] + ev.push[axis] * k) * decay;
}

/** Seconds of her walk the event has taken by `time`. */
const heldFor = (ev: StreetEvent, time: number) =>
  Math.min(ev.hold, Math.max(0, time - ev.at));

/** Her pose at `time` (wall seconds), into `out`. */
export function streetPose(
  p: Pedestrian,
  s: StreetState,
  time: number,
  out: StreetPose,
): StreetPose {
  const ev = s.ev;
  pedestrianAt(p, time - s.lag - (ev ? heldFor(ev, time) : 0), out);
  out.held = false;
  out.reaction = null;
  if (!ev) return out;
  out.x += offsetAxis(ev, time, 0);
  out.z += offsetAxis(ev, time, 1);
  out.held = time - ev.at < ev.hold;
  if (out.held && ev.yaw !== null) out.yaw = ev.yaw;
  if (ev.play && time < ev.play.until) out.reaction = reactionAt(ev.play, time);
  return out;
}

/** Drops an event that is fully over, folding its stop into her lag. */
export function settle(s: StreetState, time: number): void {
  const ev = s.ev;
  if (!ev || time < ev.at + ev.hold + RETURN_SECONDS) return;
  s.lag += ev.hold;
  s.ev = null;
}

/** Starts `ev` on her, carrying on from wherever the last one left her. */
function begin(s: StreetState, ev: StreetEvent): void {
  const old = s.ev;
  if (old) {
    ev.from = [offsetAxis(old, ev.at, 0), offsetAxis(old, ev.at, 1)];
    s.lag += heldFor(old, ev.at);
  }
  s.ev = ev;
}

/** Whether she is down (fallen or getting up) at `time`. */
const down = (s: StreetState, time: number) =>
  s.ev?.kind === "knock" && time - s.ev.at < s.ev.hold;

/** Whether she is mid-reaction of any kind at `time`. */
const busy = (s: StreetState, time: number) =>
  s.ev !== null && time - s.ev.at < s.ev.hold;

/**
 * A car at `speed` m/s, heading (fx, fz), hits her at `time`: by its speed
 * a stumble, a knockdown or a hard fall, thrown along its way, and always a
 * get-up after a fall. A hit while she is already down changes nothing.
 */
export function knock(
  s: StreetState,
  time: number,
  speed: number,
  fx: number,
  fz: number,
): void {
  const outcome = hitOutcome(speed);
  if (!outcome || down(s, time)) return;
  const id = hitReaction(outcome);
  const play = startReaction(null, id, time);
  if (!play) return;
  const far = knockback(speed);
  begin(s, {
    kind: "knock",
    at: time,
    hold: play.until - time,
    push: [fx * far, fz * far],
    pushSeconds: THROW_SECONDS,
    from: [0, 0],
    yaw: null,
    play,
  });
  s.noticed = Number.NaN;
}

/** Seconds walker `i` takes to notice a car bearing down: about one, never
 * instantly. */
export const noticeDelay = (i: number): number => 0.75 + hash(i, 205) * 0.7;

/** Whether walker `i` freezes rather than dodges: about one in five. */
export const freezes = (i: number): boolean => hash(i, 206) < 0.22;

/** Whether `car` bears down on someone at `at`: in its path, ahead of it and
 * a few seconds off. */
export function threatened(car: CarNow, at: { x: number; z: number }): boolean {
  if (!(car.speed >= THREAT_SPEED)) return false;
  const px = at.x - car.x;
  const pz = at.z - car.z;
  const along = px * car.fx + pz * car.fz;
  const across = Math.abs(-px * car.fz + pz * car.fx);
  return (
    along > 0 &&
    across < THREAT_HALF_WIDTH &&
    along / car.speed < THREAT_SECONDS
  );
}

/** Whether someone at `at` is inside the outline of `car` (a box `length` by
 * `width` meters around its center). */
export function touches(
  car: CarNow,
  length: number,
  width: number,
  at: { x: number; z: number },
): boolean {
  const px = at.x - car.x;
  const pz = at.z - car.z;
  const along = px * car.fx + pz * car.fz;
  const across = Math.abs(-px * car.fz + pz * car.fx);
  return Math.abs(along) <= length / 2 + PERSON && across <= width / 2 + PERSON;
}

const scratch: StreetPose = {
  x: 0,
  z: 0,
  yaw: 0,
  held: false,
  reaction: null,
};

/** Flinch at a nearby siren or speeding vehicle without interrupting a fall. */
export function evadeFastCar(
  s: StreetState,
  p: Pedestrian,
  time: number,
  car: { x: number; z: number; speed: number; siren: boolean },
): void {
  if (
    busy(s, time) ||
    time - s.noticed < 1.5 ||
    (!car.siren && car.speed <= 15)
  )
    return;
  const at = streetPose(p, s, time, scratch);
  const dx = at.x - car.x;
  const dz = at.z - car.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 12) return;
  // Step across the strip, away from the car, without leaving its surface.
  const alongX = Math.abs(p.b[0] - p.a[0]) >= Math.abs(p.b[1] - p.a[1]);
  const coordinate = alongX ? at.z : at.x;
  const away = alongX ? dz : dx;
  const low = alongX ? p.bounds[2] : p.bounds[0];
  const high = alongX ? p.bounds[3] : p.bounds[1];
  const sign =
    away === 0
      ? high - coordinate >= coordinate - low
        ? 1
        : -1
      : Math.sign(away);
  let step =
    sign *
    Math.min(1, Math.max(0, sign > 0 ? high - coordinate : coordinate - low));
  if (isBlocked(CITY_AREA, alongX ? [at.x, at.z + step] : [at.x + step, at.z]))
    step = 0;
  begin(s, {
    kind: "freeze",
    at: time,
    hold: FREEZE_HOLD,
    push: alongX ? [0, step] : [step, 0],
    pushSeconds: DODGE_SECONDS,
    from: [0, 0],
    yaw: yawTowards([at.x, at.z], [car.x, car.z]),
    play: startReaction(null, "hit-front", time),
  });
}

/**
 * Walker `i` with `car` near her at `time`: while it bears down she notices
 * it after her own delay, then dodges sideways out of its line or freezes
 * and faces it, flinching. Call it every step the car is about.
 */
export function startle(
  s: StreetState,
  p: Pedestrian,
  i: number,
  time: number,
  car: CarNow,
): void {
  // mid-reaction she is not watching the road: a later car is noticed afresh
  if (busy(s, time)) {
    s.noticed = Number.NaN;
    return;
  }
  const at = streetPose(p, s, time, scratch);
  if (!threatened(car, at)) {
    s.noticed = Number.NaN;
    return;
  }
  if (Number.isNaN(s.noticed)) s.noticed = time;
  if (time - s.noticed < noticeDelay(i)) return;
  s.noticed = Number.NaN;
  const me: Vec2 = [at.x, at.z];
  const from: Vec2 = [car.x, car.z];
  if (freezes(i)) {
    begin(s, {
      kind: "freeze",
      at: time,
      hold: FREEZE_HOLD,
      push: [0, 0],
      pushSeconds: 0,
      from: [0, 0],
      yaw: yawTowards(me, from),
      play: startReaction(null, "hit-front", time),
    });
    return;
  }
  // sideways, away from the car's line (dead center: her own way)
  const side = -(at.x - car.x) * car.fz + (at.z - car.z) * car.fx;
  const sign = side > 0 || (side === 0 && hash(i, 207) < 0.5) ? 1 : -1;
  begin(s, {
    kind: "dodge",
    at: time,
    hold: DODGE_HOLD,
    push: [-car.fz * DODGE * sign, car.fx * DODGE * sign],
    pushSeconds: DODGE_SECONDS,
    from: [0, 0],
    yaw: null,
    play: startReaction(null, hitDirection(at.yaw, me, from), time),
  });
}

/** A bystander stops and turns to look at `spot` (a hit nearby). Never
 * interrupts someone mid-reaction. */
export function watch(
  s: StreetState,
  p: Pedestrian,
  time: number,
  spot: Vec2,
): void {
  if (busy(s, time)) return;
  const at = streetPose(p, s, time, scratch);
  begin(s, {
    kind: "watch",
    at: time,
    hold: WATCH_HOLD,
    push: [0, 0],
    pushSeconds: 0,
    from: [0, 0],
    yaw: yawTowards([at.x, at.z], spot),
    play: null,
  });
}
