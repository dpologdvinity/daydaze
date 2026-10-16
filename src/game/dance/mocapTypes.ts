import type { Joint, Vec3 } from "./moves.ts";

/** A motion-capture loop retargeted onto the doll rig (see mocap.ts). */
export type MocapClip = {
  id: string;
  kind: "walk" | "dance" | "pose" | "sit" | "lay";
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
