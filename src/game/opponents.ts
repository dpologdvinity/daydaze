// Paintball and Laser Tag opponents: which animation clip each one plays.
//
// The rival AI (laserTag.ts) decides where each rival stands, whether she is
// out in the open, when she fires and when she is tagged and down. This module
// only maps that state to one of the Universal Animation Library clips in
// public/models/opponents/opponent-clips.glb (same skeleton as the opponents'
// bodies, no retargeting). Pure, so the mapping is tested without a renderer.

/** The clips the opponents use: the library's own action names. */
export const CLIPS = [
  "Idle_Loop",
  "Pistol_Idle_Loop",
  "Pistol_Aim_Neutral",
  "Pistol_Shoot",
  "Pistol_Reload",
  "Jog_Fwd_Loop",
  "Sprint_Loop",
  "Crouch_Idle_Loop",
  "Crouch_Fwd_Loop",
  "Hit_Chest",
  "Hit_Head",
  "Death01",
] as const;
export type OpponentClipId = (typeof CLIPS)[number];

/** How long the flinch lasts after a tag, before she drops. */
export const HIT_SECONDS = 0.35;
/** How long the shooting clip plays after a shot (Pistol_Shoot is 0.5 s). */
export const SHOT_SECONDS = 0.5;
/** She reloads this long after a shot, when she is back behind cover. */
export const RELOAD_AFTER = 0.5;
/** The last stretch of her downtime that plays the fall backward. */
export const getUpSeconds = 0.8;

/** What the AI says about one rival right now. */
export type OpponentSense = {
  /** A round is on (otherwise she just stands about). */
  playing: boolean;
  /** She has been tagged and is not back up yet. */
  down: boolean;
  /** Seconds since the tag that put her down (Infinity if none). */
  sinceTag: number;
  /** Seconds until she is back up (0 when she is). */
  untilUp: number;
  /** She is moving between her cover and her peek spot. */
  moving: boolean;
  /** She is at her peek spot, out in the open. */
  open: boolean;
  /** Seconds since her last shot at you (Infinity if none). */
  sinceShot: number;
};

/** One clip to play: whether it loops, whether it runs backward, and a key
 * that differs between any two plans, for telling when the clip changes. */
export type ClipPlan = {
  readonly clip: OpponentClipId;
  readonly loop: boolean;
  readonly reverse: boolean;
  readonly key: string;
};

const plan = (
  clip: OpponentClipId,
  loop = true,
  reverse = false,
): ClipPlan => ({ clip, loop, reverse, key: `${clip}${reverse ? "<" : ">"}` });

// made once: the map runs every frame for every rival and returns these
const IDLE = plan("Idle_Loop");
const FLINCH = plan("Hit_Chest", false);
const DOWN = plan("Death01", false);
const GET_UP = plan("Death01", false, true);
const RUN = plan("Jog_Fwd_Loop");
const CREEP = plan("Crouch_Fwd_Loop");
const SHOOT = plan("Pistol_Shoot", false);
const AIM = plan("Pistol_Aim_Neutral");
const RELOAD = plan("Pistol_Reload", false);
const CROUCH = plan("Crouch_Idle_Loop");

/** The clip rival `s` should play: down beats moving beats firing beats
 * aiming or crouching. */
export function opponentClip(s: OpponentSense): ClipPlan {
  if (!s.playing) return IDLE;
  if (s.down) {
    if (s.sinceTag < HIT_SECONDS) return FLINCH;
    // she gets up by the fall played backward
    return s.untilUp <= getUpSeconds ? GET_UP : DOWN;
  }
  // a rival heading for her peek spot runs; one heading home creeps low
  if (s.moving) return s.open ? RUN : CREEP;
  if (s.open) return s.sinceShot < SHOT_SECONDS ? SHOOT : AIM;
  return s.sinceShot > RELOAD_AFTER && s.sinceShot < RELOAD_AFTER + 1.3
    ? RELOAD
    : CROUCH;
}
