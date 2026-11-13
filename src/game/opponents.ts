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

/** One clip to play: whether it loops, and whether it runs backward. */
export type ClipPlan = {
  clip: OpponentClipId;
  loop: boolean;
  reverse: boolean;
};

const plan = (
  clip: OpponentClipId,
  loop = true,
  reverse = false,
): ClipPlan => ({
  clip,
  loop,
  reverse,
});

/** The clip rival `s` should play: down beats moving beats firing beats
 * aiming or crouching. */
export function opponentClip(s: OpponentSense): ClipPlan {
  if (!s.playing) return plan("Idle_Loop");
  if (s.down) {
    if (s.sinceTag < HIT_SECONDS) return plan("Hit_Chest", false);
    // she gets up by the fall played backward
    return plan("Death01", false, s.untilUp <= getUpSeconds);
  }
  // a rival heading for her peek spot runs; one heading home creeps low
  if (s.moving) return plan(s.open ? "Jog_Fwd_Loop" : "Crouch_Fwd_Loop");
  if (s.open) {
    return s.sinceShot < SHOT_SECONDS
      ? plan("Pistol_Shoot", false)
      : plan("Pistol_Aim_Neutral");
  }
  return s.sinceShot > RELOAD_AFTER && s.sinceShot < RELOAD_AFTER + 1.3
    ? plan("Pistol_Reload", false)
    : plan("Crouch_Idle_Loop");
}
