export const SKINS = [
  { id: "#f3d4c4", label: "Porcelain" },
  { id: "#e6b48e", label: "Golden" },
  { id: "#c48d68", label: "Caramel" },
  { id: "#94603f", label: "Mocha" },
  { id: "#633c29", label: "Espresso" },
] as const;

export const HAIR_STYLES = [
  { id: "waves", label: "Glossy waves" },
  { id: "ponytail", label: "Snatched pony" },
  { id: "buns", label: "Space buns" },
  { id: "bob", label: "Sleek bob" },
  { id: "braids", label: "Knotless braids" },
  { id: "afro", label: "Afro puff" },
] as const;

export const HAIR_COLORS = [
  { id: "#1b1014", label: "Ink" },
  { id: "#4a2a1c", label: "Espresso" },
  { id: "#b77a3e", label: "Honey" },
  { id: "#f1d78f", label: "Platinum" },
  { id: "#ff4fb3", label: "Bubblegum" },
  { id: "#7b4dff", label: "Ultraviolet" },
] as const;

export const LIPS = [
  { id: "lips-hot-pink-glam", label: "Hot pink glam" },
  { id: "lips-burgundy-cherry", label: "Cherry" },
  { id: "lips-nude-pink-gloss", label: "Nude gloss" },
  { id: "lips-90s-caramel-ombre", label: "90s caramel" },
] as const;

export const BROWS = [
  { id: "brows-y2k-thin", label: "Y2K thin" },
  { id: "brows-fox-snatched", label: "Fox" },
  { id: "brows-sculpted-espresso", label: "Sculpted" },
  { id: "brows-feathered-honey", label: "Feathered" },
] as const;

export const OUTFITS = [
  { id: "flares", label: "Crop and flares" },
  { id: "mini", label: "Slip mini" },
  { id: "fur", label: "Faux fur" },
] as const;

export const OUTFIT_COLORS = [
  { id: "#ff2f9a", label: "Fuchsia" },
  { id: "#ffb02e", label: "Amber" },
  { id: "#9b5cff", label: "Violet" },
  { id: "#e8e2ff", label: "Chrome" },
  { id: "#141018", label: "Midnight" },
  { id: "#3fe0d0", label: "Aqua" },
] as const;

export const EYESHADOWS = [
  { id: "#d23cff", label: "Orchid" },
  { id: "#ff2f9a", label: "Fuchsia" },
  { id: "#ffb02e", label: "Amber" },
  { id: "#3fe0d0", label: "Lagoon" },
  { id: "#8a5a3c", label: "Bronze" },
  // The prototype's space-buns regular wore this without it being pickable.
  { id: "#7b4dff", label: "Ultraviolet" },
] as const;

export const MOODS = [
  { id: "idle", label: "Idle" },
  { id: "pose", label: "Pose" },
  { id: "dance", label: "Dance" },
  { id: "sit", label: "Sit" },
  { id: "lean", label: "Lean" },
] as const;

type Option = { readonly id: string; readonly label: string };
type IdOf<T extends readonly Option[]> = T[number]["id"];

export type HairStyle = IdOf<typeof HAIR_STYLES>;
export type Outfit = IdOf<typeof OUTFITS>;
export type Mood = IdOf<typeof MOODS>;

/** Eye colours for the 3D doll's irises. */
export const EYE_COLORS = [
  { id: "#6b3f22", label: "Brown" },
  { id: "#3a2216", label: "Deep brown" },
  { id: "#8a6a2e", label: "Hazel" },
  { id: "#3f7a4a", label: "Green" },
  { id: "#3d6fa8", label: "Blue" },
  { id: "#7d8790", label: "Grey" },
  { id: "#8e4dff", label: "Violet" },
] as const;

export const BODY_SHAPES = [
  { id: "classic", label: "Classic" },
  { id: "curvy", label: "Curvy" },
  { id: "slim", label: "Slim" },
  { id: "athletic", label: "Athletic" },
] as const;

/** Face sliders, -1..1; ids are the doll model's shape-key names. */
export const FACE_SLIDERS = [
  { id: "eyeSize", label: "Eye size" },
  { id: "eyeTilt", label: "Eye tilt" },
  { id: "nose", label: "Nose width" },
  { id: "lips", label: "Lip fullness" },
  { id: "cheeks", label: "Cheekbones" },
  { id: "jaw", label: "Jaw" },
] as const;

export type FaceSlider = IdOf<typeof FACE_SLIDERS>;
export type BodyShape = IdOf<typeof BODY_SHAPES>;

export type Face = Record<FaceSlider, number> & {
  body: BodyShape;
  eyeColor: IdOf<typeof EYE_COLORS>;
};

export const DEFAULT_FACE: Face = {
  eyeSize: 0,
  eyeTilt: 0,
  nose: 0,
  lips: 0,
  cheeks: 0,
  jaw: 0,
  body: "classic",
  eyeColor: "#6b3f22",
};

// A face travels inside the look as one short string, because looks go over
// the network as flat maps of short strings. One letter per slider (a..u is
// -1..1 in steps of 0.1), then the body shape's and eye colour's indexes.
const STEPS = "abcdefghijklmnopqrstu";

export function encodeFace(face: Face): string {
  const slider = (v: number) =>
    STEPS[Math.round((Math.max(-1, Math.min(1, v)) + 1) * 10)];
  return (
    FACE_SLIDERS.map((s) => slider(face[s.id])).join("") +
    BODY_SHAPES.findIndex((b) => b.id === face.body) +
    EYE_COLORS.findIndex((c) => c.id === face.eyeColor)
  );
}

/** The face a look's code describes; null when the code is malformed. */
export function decodeFace(code: unknown): Face | null {
  if (typeof code !== "string" || code.length !== FACE_SLIDERS.length + 2)
    return null;
  const face: Face = { ...DEFAULT_FACE };
  for (const [i, s] of FACE_SLIDERS.entries()) {
    const step = STEPS.indexOf(code[i]);
    if (step < 0) return null;
    face[s.id] = (step - 10) / 10;
  }
  const body = BODY_SHAPES[Number(code[FACE_SLIDERS.length])];
  const eye = EYE_COLORS[Number(code[FACE_SLIDERS.length + 1])];
  if (!body || !eye) return null;
  face.body = body.id;
  face.eyeColor = eye.id;
  return face;
}

/** A look's face, or the default for looks from before the 3D doll. */
export function faceOf(look: Look): Face {
  return decodeFace(look.face) ?? DEFAULT_FACE;
}

export type Look = {
  skin: IdOf<typeof SKINS>;
  hairStyle: HairStyle;
  hairColor: IdOf<typeof HAIR_COLORS>;
  lips: IdOf<typeof LIPS>;
  brows: IdOf<typeof BROWS>;
  outfit: Outfit;
  outfitColor: IdOf<typeof OUTFIT_COLORS>;
  shadow: IdOf<typeof EYESHADOWS>;
  /** encodeFace's code for the face sliders, body shape and eye colour;
   * looks from before the 3D doll have none and wear DEFAULT_FACE. */
  face?: string;
};

const LOOK_CATALOGS: {
  [K in Exclude<keyof Look, "face">]: readonly {
    readonly id: Look[K];
    readonly label: string;
  }[];
} = {
  skin: SKINS,
  hairStyle: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  lips: LIPS,
  brows: BROWS,
  outfit: OUTFITS,
  outfitColor: OUTFIT_COLORS,
  shadow: EYESHADOWS,
};

function isId(catalog: readonly Option[], value: unknown): boolean {
  return catalog.some((option) => option.id === value);
}

export function validateLook(value: unknown): value is Look {
  if (typeof value !== "object" || value === null) return false;
  // Own enumerable fields only, so prototypes and arrays cannot sneak through.
  const fields = new Map<string, unknown>(Object.entries(value));
  const catalogs = Object.entries(LOOK_CATALOGS);
  const hasFace = fields.has("face");
  return (
    fields.size === catalogs.length + (hasFace ? 1 : 0) &&
    (!hasFace || decodeFace(fields.get("face")) !== null) &&
    catalogs.every(([key, catalog]) => isId(catalog, fields.get(key)))
  );
}

export const SWIMSUITS = [
  { id: "one-piece", label: "One-piece" },
  { id: "bikini", label: "Bikini" },
] as const;

export type Swimsuit = IdOf<typeof SWIMSUITS>;

/** The Water Park look: its own save slot, so the outfit is never touched. */
export type SwimLook = {
  style: Swimsuit;
  color: IdOf<typeof OUTFIT_COLORS>;
};

export const DEFAULT_SWIM: SwimLook = { style: "bikini", color: "#3fe0d0" };

export function validateSwim(value: unknown): value is SwimLook {
  if (typeof value !== "object" || value === null) return false;
  const fields = new Map<string, unknown>(Object.entries(value));
  return (
    fields.size === 2 &&
    isId(SWIMSUITS, fields.get("style")) &&
    isId(OUTFIT_COLORS, fields.get("color"))
  );
}

/** What the doll wears in a room: the swimsuit in swimwear rooms, else null. */
export function swimFor(
  room: { swimwear?: boolean },
  swim: SwimLook,
): SwimLook | null {
  return room.swimwear ? swim : null;
}

export function isMood(value: unknown): value is Mood {
  return isId(MOODS, value);
}

export const DEFAULT_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "waves",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "flares",
  outfitColor: "#ff2f9a",
  shadow: "#d23cff",
};

// Velvet Room regulars from the prototype; `at` is [x, y, z] in metres.
export const NPC_LOOKS: readonly {
  look: Look;
  mood: Mood;
  at: readonly [number, number, number];
  rot: number;
}[] = [
  {
    look: {
      skin: "#633c29",
      hairStyle: "ponytail",
      hairColor: "#f1d78f",
      lips: "lips-burgundy-cherry",
      brows: "brows-fox-snatched",
      outfit: "mini",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
    mood: "lean",
    at: [-1.4, 0, -3.95],
    rot: 0.35,
  },
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "buns",
      hairColor: "#ff4fb3",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "fur",
      outfitColor: "#e8e2ff",
      shadow: "#7b4dff",
    },
    mood: "sit",
    at: [5.35, 0, 1.0],
    rot: -Math.PI / 2 - 0.25,
  },
  {
    look: {
      skin: "#c48d68",
      hairStyle: "waves",
      hairColor: "#7b4dff",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-sculpted-espresso",
      outfit: "flares",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
    mood: "dance",
    at: [-2.7, 0.025, 1.3],
    rot: 0.6,
  },
];
