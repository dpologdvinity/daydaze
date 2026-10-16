import type { Joint, Vec3 } from "./moves.ts";

/** A motion-capture loop retargeted onto the doll rig (see mocap.ts). */
export type MocapClip = {
  id: string;
  kind: "walk" | "dance";
  label: string;
  /** The CMU take it came from. */
  source: string;
  period: number;
  keys: readonly {
    at: number;
    root: Vec3;
    joints: Partial<Record<Joint, Vec3>>;
  }[];
};
