import type { Joint, Vec3 } from "./moves.ts";

/** A motion-capture loop retargeted onto the doll rig (see mocap.ts). */
export type MocapClip = {
  id: string;
  /** An emote loops like a dance, for NPCs; it stays out of the Dance picker. */
  kind: "walk" | "dance" | "emote" | "pose" | "sit" | "lay";
  label: string;
  /** The take it came from. */
  source: string;
  period: number;
};

/** One sampled pose of a clip (see mocapKeys.ts). */
export type MocapKey = {
  at: number;
  root: Vec3;
  joints: Partial<Record<Joint, Vec3>>;
};
