// The animated creatures (Quaternius' Ultimate Animated Animals, Animated Fish
// and Cute Fish, all CC0; see docs/assets.md): one skinned, vertex-colored GLB
// each in public/models/animals/ (built by art/animals/build_animals.py). The
// client's <Creature> loads a kind once and clones it per instance.

export type LandKind =
  | "alpaca"
  | "horse"
  | "donkey"
  | "cow"
  | "deer"
  | "fox"
  | "wolf"
  | "husky"
  | "shibainu"
  | "zebra"
  | "giraffe"
  | "elephant"
  | "lion"
  | "penguin"
  | "flamingo";

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
  husky: 1.1,
  shibainu: 0.9,
  zebra: 2.3,
  giraffe: 2.4,
  elephant: 4,
  lion: 2,
  penguin: 0.7,
  flamingo: 0.7,
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

/** How far each downloaded model must turn about y to face +z, the way the
 * game's yaw 0 does. The Animated Fish Pack faces -z; the poly.pizza zoo
 * models face along x (found by rendering them from above). The Quaternius
 * animal and Cute Fish packs already face +z. */
const MODEL_YAW: Partial<Record<CreatureKind, number>> = {
  dolphin: Math.PI,
  shark: Math.PI,
  whale: Math.PI,
  "manta-ray": Math.PI,
  fish1: Math.PI,
  fish2: Math.PI,
  fish3: Math.PI,
  giraffe: -Math.PI / 2,
  elephant: Math.PI / 2,
  penguin: -Math.PI / 2,
  flamingo: Math.PI / 2,
};

export const modelYaw = (kind: CreatureKind): number => MODEL_YAW[kind] ?? 0;
