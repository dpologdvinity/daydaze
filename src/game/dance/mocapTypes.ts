/** The clip files ("packs"): core is always loaded, the rest on demand (the
 * first time a doll wants one of their clips; see anims.ts). */
export const MOCAP_PACKS = [
  "core",
  "social",
  "seated",
  "dance2",
  "ual",
  "moves",
] as const;
export type MocapPack = (typeof MOCAP_PACKS)[number];

/** A motion-capture clip baked onto the doll's skeleton (see mocap.ts; the
 * keyframes live in public/models/doll/anims*.glb, played by HumanDoll). */
export type MocapClip = {
  id: string;
  /**
   * walk: a gait's loop. idle: a standing loop. dance, emote: looped moves
   * (an emote is for NPCs and games, kept out of the Dance picker). pose,
   * sit, lay: held, a single pose. seat: a looped sit. swim: a looped stroke
   * or tread, played by an afloat doll (clips.ts). back: a backwards walk.
   * trans: a one-shot (sitting down, standing up, a jump), played once.
   */
  kind:
    | "walk"
    | "idle"
    | "dance"
    | "emote"
    | "pose"
    | "sit"
    | "lay"
    | "seat"
    | "swim"
    | "back"
    | "trans";
  label: string;
  /** The take it was baked from, led by its provider ("Mixamo <take>"). */
  source: string;
  /** Loop length, seconds; 0 for a held pose. */
  period: number;
  /** A walk's natural ground speed, m/s (see stride.ts). */
  speed?: number;
  /** The file it is baked into. */
  pack: MocapPack;
  /** An emote in the player's emote menu. */
  menu?: boolean;
};
