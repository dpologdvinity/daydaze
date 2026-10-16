/**
 * Walk styles. Each is a handful of numbers the pose code turns into a
 * stride: how far the legs swing, how the hips sway and drop, how the arms
 * swing close to the body, how much the feet cross toward the midline (a
 * runway walk puts one foot in front of the other), and the cadence.
 */
export type Gait = {
  id: string;
  label: string;
  /** Thigh swing, radians each way. */
  stride: number;
  /** Knee bend on the swinging leg. */
  knee: number;
  /** Arm swing, radians each way, and elbow bend. */
  armSwing: number;
  elbow: number;
  /** Side-to-side hip tilt and shift. */
  hipSway: number;
  /** Feet stepping toward the midline: 0 normal, 1 catwalk. */
  cross: number;
  /** Shoulders turning against the hips. */
  twist: number;
  /** Up-and-down bounce, metres. */
  bounce: number;
  /** Steps per metre, relative to natural. */
  cadence: number;
  /** Chin up (+) or down (-). */
  chin: number;
  /** A motion-capture walk loop that replaces the built stride. */
  clip?: string;
};

export const GAITS = [
  {
    id: "natural",
    label: "Natural",
    stride: 0.36,
    knee: 0.55,
    armSwing: 0.22,
    elbow: 0.18,
    hipSway: 0.035,
    cross: 0.15,
    twist: 0.05,
    bounce: 0.012,
    cadence: 1,
    chin: 0,
    clip: "walk-natural",
  },
  {
    id: "relaxed",
    label: "Relaxed stroll",
    stride: 0.3,
    knee: 0.5,
    armSwing: 0.16,
    elbow: 0.12,
    hipSway: 0.03,
    cross: 0.1,
    twist: 0.04,
    bounce: 0.009,
    cadence: 0.9,
    chin: -0.03,
    clip: "walk-relaxed",
  },
  {
    id: "confident",
    label: "Confident",
    stride: 0.4,
    knee: 0.5,
    armSwing: 0.26,
    elbow: 0.2,
    hipSway: 0.05,
    cross: 0.3,
    twist: 0.06,
    bounce: 0.01,
    cadence: 1.05,
    chin: 0.05,
    clip: "walk-brisk",
  },
  {
    id: "runway",
    label: "Runway",
    stride: 0.42,
    knee: 0.45,
    armSwing: 0.14,
    elbow: 0.06,
    hipSway: 0.07,
    cross: 1,
    twist: 0.03,
    bounce: 0.006,
    cadence: 0.92,
    chin: 0.08,
  },
  {
    id: "sassy",
    label: "Sassy strut",
    stride: 0.38,
    knee: 0.5,
    armSwing: 0.2,
    elbow: 0.25,
    hipSway: 0.09,
    cross: 0.7,
    twist: 0.08,
    bounce: 0.008,
    cadence: 1,
    chin: 0.04,
  },
] as const satisfies readonly Gait[];

export type GaitId = (typeof GAITS)[number]["id"];

export function isGait(value: unknown): value is GaitId {
  return GAITS.some((g) => g.id === value);
}

export function gaitOf(id: string | undefined): Gait {
  return GAITS.find((g) => g.id === id) ?? GAITS[0];
}
