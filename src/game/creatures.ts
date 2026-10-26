// The animated creatures (Quaternius' Ultimate Animated Animals, Animated Fish
// and Cute Fish, all CC0; see docs/assets.md): one skinned, vertex-colored GLB
// each in public/models/animals/ (built by art/animals/build_animals.py). The
// client's <Creature> loads a kind once and clones it per instance.

export type LandKind =
  "alpaca" | "horse" | "donkey" | "cow" | "deer" | "fox" | "wolf";

export type FishKind =
  | "dolphin"
  | "shark"
  | "whale"
  | "manta-ray"
  | "fish1"
  | "fish2"
  | "fish3"
  | "cute-clownfish"
  | "cute-bluetang"
  | "cute-yellowtang"
  | "cute-goldfish"
  | "cute-puffer"
  | "cute-koi"
  | "cute-butterflyfish"
  | "cute-lionfish"
  | "cute-mandarinfish"
  | "cute-zebraclownfish";

export type CreatureKind = LandKind | FishKind;

/** The clips a GLB can carry: land animals have the first set, fish `swim`. */
export type Clip =
  "idle" | "idle2" | "graze" | "eat" | "walk" | "run" | "react" | "swim";

/** Body length in meters (nose to tail) each kind is scaled to. */
export const LENGTH: Record<CreatureKind, number> = {
  alpaca: 1.4,
  horse: 2.4,
  donkey: 1.9,
  cow: 2.4,
  deer: 1.9,
  fox: 0.9,
  wolf: 1.3,
  dolphin: 2.6,
  shark: 3.4,
  whale: 5,
  "manta-ray": 2.4,
  fish1: 0.5,
  fish2: 0.5,
  fish3: 0.5,
  "cute-clownfish": 0.4,
  "cute-bluetang": 0.4,
  "cute-yellowtang": 0.4,
  "cute-goldfish": 0.45,
  "cute-puffer": 0.4,
  "cute-koi": 0.55,
  "cute-butterflyfish": 0.4,
  "cute-lionfish": 0.5,
  "cute-mandarinfish": 0.4,
  "cute-zebraclownfish": 0.4,
};

/** A creature's GLB path. */
export const creatureUrl = (kind: CreatureKind) =>
  `/models/animals/${kind}.glb`;

/** The clip each wandering mood plays (creature.ts Mood). */
export const MOOD_CLIP = {
  idle: "idle",
  walk: "walk",
  eat: "graze",
  alert: "idle2",
} as const satisfies Record<string, Clip>;

/** The Animated Fish Pack models face -z (the other packs face +z, the way
 * the game's yaw 0 does), so they carry a half turn. */
export const modelYaw = (kind: CreatureKind): number =>
  [
    "dolphin",
    "shark",
    "whale",
    "manta-ray",
    "fish1",
    "fish2",
    "fish3",
  ].includes(kind)
    ? Math.PI
    : 0;
