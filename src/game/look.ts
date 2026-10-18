import { isGait } from "./gaits.ts";
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
  // Salon styles: sold by the stylist, see shop.ts.
  { id: "sleek-bob", label: "Sleek bob" },
  { id: "curl-cloud", label: "Curl cloud" },
  { id: "bob", label: "Bob" },
  { id: "braids", label: "Knotless braids" },
  { id: "afro", label: "Afro puff" },
  { id: "long-straight", label: "Long and sleek" },
  { id: "long-curly", label: "Long curls" },
  { id: "mid-straight", label: "Shoulder-length" },
  { id: "mid-wavy", label: "Shoulder waves" },
  { id: "mid-curly", label: "Shoulder curls" },
  { id: "pixie", label: "Pixie" },
  { id: "mermaid", label: "Mermaid waves" },
  { id: "shag", label: "Shag" },
  { id: "coils", label: "Coils" },
  { id: "low-pony", label: "Low pony" },
  { id: "pigtails", label: "Pigtails" },
  { id: "top-knot", label: "Top knot" },
] as const;

export const HAIR_COLORS = [
  { id: "#1b1014", label: "Ink" },
  { id: "#4a2a1c", label: "Espresso" },
  { id: "#b77a3e", label: "Honey" },
  { id: "#f1d78f", label: "Platinum" },
  { id: "#ff4fb3", label: "Bubblegum" },
  { id: "#7b4dff", label: "Ultraviolet" },
  { id: "#7ee8a2", label: "Mint soda" },
  // the Blowout Bar's colors, sold at the salon
  { id: "#c0c0c8", label: "Silver fox" },
  { id: "#ff8a3d", label: "Copper" },
  { id: "#3a6bff", label: "Sapphire" },
  { id: "#ffb3d9", label: "Cotton candy" },
] as const;

/** Lipsticks; `swatch` is the color the closet shows. */
export const LIPS = [
  { id: "lips-hot-pink-glam", label: "Hot pink glam", swatch: "#e8338a" },
  { id: "lips-burgundy-cherry", label: "Cherry", swatch: "#7d1030" },
  { id: "lips-nude-pink-gloss", label: "Nude gloss", swatch: "#d38f8a" },
  { id: "lips-90s-caramel-ombre", label: "90s caramel", swatch: "#b06a4a" },
  // Beauty supply testers, see shop.ts.
  { id: "lips-chrome-berry", label: "Chrome berry", swatch: "#9b2a6e" },
  {
    id: "lips-blue-raspberry-gloss",
    label: "Blue raspberry gloss",
    swatch: "#3d6fe0",
  },
  { id: "lips-red-carpet", label: "Red carpet", swatch: "#c8102e" },
  { id: "lips-mauve-velvet", label: "Mauve velvet", swatch: "#a0607a" },
  { id: "lips-coral-pop", label: "Coral pop", swatch: "#ff6f61" },
  { id: "lips-plum-noir", label: "Plum noir", swatch: "#4a1030" },
  { id: "lips-peach-fizz", label: "Peach fizz", swatch: "#f2a07b" },
  { id: "lips-brick-matte", label: "Brick matte", swatch: "#9c3b2a" },
  { id: "lips-bare-balm", label: "Bare balm", swatch: "#c98f86" },
] as const;

export const BROWS = [
  { id: "brows-y2k-thin", label: "Y2K thin" },
  { id: "brows-fox-snatched", label: "Fox" },
  { id: "brows-sculpted-espresso", label: "Sculpted" },
  { id: "brows-feathered-honey", label: "Feathered" },
] as const;

/** The doll geometry each outfit is cut from. Shop outfits reuse these shapes. */
export type Silhouette =
  "flares" | "mini" | "fur" | "jeans" | "shorts" | "blouse";

export const OUTFITS = [
  { id: "flares", label: "Crop and flares", silhouette: "flares" },
  { id: "mini", label: "Slip mini", silhouette: "mini" },
  { id: "fur", label: "Faux fur", silhouette: "fur" },
  { id: "jeans", label: "Tee and skinny jeans", silhouette: "jeans" },
  { id: "shorts", label: "Tee and denim shorts", silhouette: "shorts" },
  { id: "blouse", label: "Blouse and pencil skirt", silhouette: "blouse" },
  // Boutique outfits, see shop.ts.
  { id: "tracksuit-y2k", label: "Y2K velour tracksuit", silhouette: "flares" },
  { id: "baby-tee-mini", label: "Baby tee and mini", silhouette: "mini" },
  { id: "sequin-slip", label: "Sequin slip gown", silhouette: "mini" },
  { id: "glam-faux-fur", label: "Glam faux-fur wrap", silhouette: "fur" },
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
  // Beauty supply testers, see shop.ts.
  { id: "#ffd1f0", label: "Cotton candy" },
  { id: "#2e7dff", label: "Electric blue" },
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

export function silhouetteOf(outfit: Outfit): Silhouette {
  return OUTFITS.find((option) => option.id === outfit)?.silhouette ?? "flares";
}
export type Mood = IdOf<typeof MOODS>;

/** Eye colors for the 3D doll's irises. */
export const EYE_COLORS = [
  { id: "#6b3f22", label: "Brown" },
  { id: "#3a2216", label: "Deep brown" },
  { id: "#8a6a2e", label: "Hazel" },
  { id: "#3f7a4a", label: "Green" },
  { id: "#3d6fa8", label: "Blue" },
  { id: "#7d8790", label: "Gray" },
  { id: "#8e4dff", label: "Violet" },
  { id: "#b5762a", label: "Honey amber" },
  { id: "#9fc8e8", label: "Ice blue" },
  { id: "#1f8a5a", label: "Emerald" },
] as const;

export const FIGURES = [
  { id: "classic", label: "Hourglass" },
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

/** Face presets: the first of each group is the base face (no shape key);
 * the rest are the doll model's keys `<group>_<id>`. */
export const EYE_SHAPES = [
  { id: "almond", label: "Almond" },
  { id: "round", label: "Round" },
  { id: "hooded", label: "Hooded" },
  { id: "upturned", label: "Upturned" },
  { id: "downturned", label: "Downturned" },
] as const;
export const NOSES = [
  { id: "straight", label: "Straight" },
  { id: "button", label: "Button" },
  { id: "narrow", label: "Narrow" },
  { id: "wide", label: "Wide" },
  { id: "roman", label: "Roman" },
] as const;
export const LIP_SHAPES = [
  { id: "natural", label: "Natural" },
  { id: "full", label: "Full" },
  { id: "thin", label: "Thin" },
  { id: "heart", label: "Heart" },
  { id: "wide", label: "Wide" },
] as const;
export const FACE_SHAPES = [
  { id: "oval", label: "Oval" },
  { id: "round", label: "Round" },
  { id: "heart", label: "Heart" },
  { id: "square", label: "Square" },
  { id: "diamond", label: "Diamond" },
] as const;

/** Each preset group, its face field and its shape-key prefix. */
export const FACE_PRESETS = [
  { field: "eyeShape", key: "eye", options: EYE_SHAPES },
  { field: "noseShape", key: "nose", options: NOSES },
  { field: "lipShape", key: "lips", options: LIP_SHAPES },
  { field: "faceShape", key: "face", options: FACE_SHAPES },
] as const;

export type FaceSlider = IdOf<typeof FACE_SLIDERS>;
export type Figure = IdOf<typeof FIGURES>;

export type Face = Record<FaceSlider, number> & {
  figure: Figure;
  eyeColor: IdOf<typeof EYE_COLORS>;
  eyeShape: IdOf<typeof EYE_SHAPES>;
  noseShape: IdOf<typeof NOSES>;
  lipShape: IdOf<typeof LIP_SHAPES>;
  faceShape: IdOf<typeof FACE_SHAPES>;
};

export const DEFAULT_FACE: Face = {
  eyeSize: 0,
  eyeTilt: 0,
  nose: 0,
  lips: 0,
  cheeks: 0,
  jaw: 0,
  figure: "classic",
  eyeColor: "#6b3f22",
  eyeShape: "almond",
  noseShape: "straight",
  lipShape: "natural",
  faceShape: "oval",
};

// A face travels inside the look as one short string, because looks go over
// the network as flat maps of short strings. One letter per slider (a..u is
// -1..1 in steps of 0.1), then the body shape's and eye color's indexes.
const STEPS = "abcdefghijklmnopqrstu";

export function encodeFace(face: Face): string {
  const slider = (v: number) =>
    STEPS[Math.round((Math.max(-1, Math.min(1, v)) + 1) * 10)];
  return (
    FACE_SLIDERS.map((s) => slider(face[s.id])).join("") +
    FIGURES.findIndex((b) => b.id === face.figure) +
    EYE_COLORS.findIndex((c) => c.id === face.eyeColor) +
    FACE_PRESETS.map((g) =>
      Math.max(
        0,
        g.options.findIndex((o) => o.id === face[g.field]),
      ),
    ).join("")
  );
}

/** The face a look's code describes; null when the code is malformed. */
export function decodeFace(code: unknown): Face | null {
  const base = FACE_SLIDERS.length + 2;
  // codes from before the face presets stop after the eye color
  if (
    typeof code !== "string" ||
    (code.length !== base && code.length !== base + FACE_PRESETS.length) ||
    !/^[a-u]+[0-9]+$/.test(code)
  )
    return null;
  const face: Face = { ...DEFAULT_FACE };
  for (const [i, s] of FACE_SLIDERS.entries()) {
    const step = STEPS.indexOf(code[i]);
    if (step < 0) return null;
    face[s.id] = (step - 10) / 10;
  }
  const body = FIGURES[Number(code[FACE_SLIDERS.length])];
  const eye = EYE_COLORS[Number(code[FACE_SLIDERS.length + 1])];
  if (!body || !eye) return null;
  face.figure = body.id;
  face.eyeColor = eye.id;
  for (const [i, g] of FACE_PRESETS.entries()) {
    if (code.length === base) break;
    const option = g.options[Number(code[base + i])];
    if (!option) return null;
    Object.assign(face, { [g.field]: option.id });
  }
  return face;
}

/**
 * A face for a doll whose look has none (NPCs), varied by its seed so a crowd
 * does not share one face. Same seed, same face.
 */
export function seededFace(seed: number): Face {
  let x = Math.floor(seed * 9301 + 49297) >>> 0 || 1;
  const next = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  const pick = <T>(list: readonly T[]): T =>
    list[Math.floor(next() * list.length)];
  const face: Face = { ...DEFAULT_FACE };
  // gentle variety only: strangers should all look good
  for (const s of FACE_SLIDERS)
    face[s.id] = Math.round((next() * 0.6 - 0.3) * 10) / 10;
  face.figure = pick(FIGURES).id;
  // natural eye colors only; violet is a closet pick
  face.eyeColor = pick(EYE_COLORS.filter((c) => c.id !== "#8e4dff")).id;
  face.eyeShape = pick(["almond", "upturned", "round"] as const);
  face.noseShape = pick(["straight", "button", "narrow"] as const);
  face.lipShape = pick(["natural", "full", "heart"] as const);
  face.faceShape = pick(["oval", "heart", "diamond", "round"] as const);
  return face;
}

/** Makeup for an NPC: a polished look, varied by seed. */
export function seededMakeup(seed: number): Makeup {
  const n = Math.floor(seed * 7919) >>> 0;
  return {
    liner: (["thin", "winged", "winged", "smoky"] as const)[n % 4],
    gloss: (["satin", "glossy", "glass"] as const)[(n >> 2) % 3],
    blush: (["rose", "peach", "berry", "coral"] as const)[(n >> 4) % 4],
    blushStrength: "soft",
    highlight: (["champagne", "rose-gold", "icy"] as const)[(n >> 6) % 3],
    shadowStyle: (["wash", "smoky", "halo"] as const)[(n >> 8) % 3],
  };
}

/** A look's face, or the default for looks from before the 3D doll. */
export function faceOf(look: Look): Face {
  return decodeFace(look.face) ?? DEFAULT_FACE;
}

export const LINERS = [
  { id: "none", label: "No liner" },
  { id: "thin", label: "Thin line" },
  { id: "winged", label: "Winged" },
  { id: "smoky", label: "Smoky" },
  { id: "graphic", label: "Graphic" },
] as const;

export const GLOSSES = [
  { id: "matte", label: "Matte" },
  { id: "satin", label: "Satin" },
  { id: "glossy", label: "Glossy" },
  { id: "glass", label: "Glass" },
] as const;

export const BLUSHES = [
  { id: "none", label: "No blush", swatch: "#00000000" },
  { id: "rose", label: "Rose", swatch: "#ff6c9a" },
  { id: "peach", label: "Peach", swatch: "#ff9a76" },
  { id: "berry", label: "Berry", swatch: "#c2306e" },
  { id: "coral", label: "Coral", swatch: "#ff5a5a" },
  { id: "bronze", label: "Bronze", swatch: "#b5653a" },
] as const;

export const STRENGTHS = [
  { id: "soft", label: "Soft" },
  { id: "medium", label: "Medium" },
  { id: "bold", label: "Bold" },
] as const;

export const HIGHLIGHTERS = [
  { id: "none", label: "No highlighter", swatch: "#00000000" },
  { id: "champagne", label: "Champagne", swatch: "#f7e2b5" },
  { id: "rose-gold", label: "Rose gold", swatch: "#f2b8a2" },
  { id: "icy", label: "Icy pearl", swatch: "#e6f2ff" },
  { id: "bronze", label: "Bronze glow", swatch: "#d79a5c" },
] as const;

export const SHADOW_STYLES = [
  { id: "wash", label: "Wash" },
  { id: "cut-crease", label: "Cut crease" },
  { id: "smoky", label: "Smoky" },
  { id: "halo", label: "Halo" },
] as const;

export type Makeup = {
  liner: IdOf<typeof LINERS>;
  gloss: IdOf<typeof GLOSSES>;
  blush: IdOf<typeof BLUSHES>;
  blushStrength: IdOf<typeof STRENGTHS>;
  highlight: IdOf<typeof HIGHLIGHTERS>;
  shadowStyle: IdOf<typeof SHADOW_STYLES>;
};

export const DEFAULT_MAKEUP: Makeup = {
  liner: "winged",
  gloss: "glossy",
  blush: "rose",
  blushStrength: "soft",
  highlight: "champagne",
  shadowStyle: "wash",
};

// Makeup travels as one short code, like the face: one digit per choice,
// each the option's index in its catalog.
const MAKEUP_PARTS = [
  ["liner", LINERS],
  ["gloss", GLOSSES],
  ["blush", BLUSHES],
  ["blushStrength", STRENGTHS],
  ["highlight", HIGHLIGHTERS],
  ["shadowStyle", SHADOW_STYLES],
] as const;

export function encodeMakeup(m: Makeup): string {
  return MAKEUP_PARTS.map(([key, list]) =>
    Math.max(
      0,
      list.findIndex((o) => o.id === m[key]),
    ),
  ).join("");
}

export function decodeMakeup(code: unknown): Makeup | null {
  if (typeof code !== "string" || code.length !== MAKEUP_PARTS.length)
    return null;
  const out: Makeup = { ...DEFAULT_MAKEUP };
  for (const [i, [key, list]] of MAKEUP_PARTS.entries()) {
    const option = list[Number(code[i])];
    if (!option || !/^[0-9]$/.test(code[i])) return null;
    Object.assign(out, { [key]: option.id });
  }
  return out;
}

/** A look's makeup, or the default for looks from before the makeup bag. */
export function makeupOf(look: Look): Makeup {
  return decodeMakeup(look.makeup) ?? DEFAULT_MAKEUP;
}

/** Piercing spots on the doll; each takes one of PIERCING_STYLES. */
export const PIERCING_SPOTS = [
  { id: "lip", label: "Lip" },
  { id: "nose", label: "Nose" },
  { id: "brow", label: "Eyebrow" },
  { id: "navel", label: "Belly button" },
] as const;

export const PIERCING_STYLES = [
  { id: "none", label: "None" },
  { id: "silver-stud", label: "Silver stud" },
  { id: "silver-ring", label: "Silver ring" },
  { id: "gold-stud", label: "Gold stud" },
  { id: "gold-ring", label: "Gold ring" },
  // Ink & Needle's fine jewelry, sold at the piercing parlor
  { id: "rose-gold-stud", label: "Rose gold stud" },
  { id: "rose-gold-ring", label: "Rose gold ring" },
  { id: "diamond-stud", label: "Diamond stud" },
  { id: "opal-stud", label: "Opal stud" },
] as const;

export type PiercingSpot = IdOf<typeof PIERCING_SPOTS>;
export type PiercingStyle = IdOf<typeof PIERCING_STYLES>;
export type Piercings = Record<PiercingSpot, PiercingStyle>;

export const NO_PIERCINGS: Piercings = {
  lip: "none",
  nose: "none",
  brow: "none",
  navel: "none",
};

/** One digit per spot: the style's index in PIERCING_STYLES. */
export function encodePiercings(p: Piercings): string {
  return PIERCING_SPOTS.map((s) =>
    Math.max(
      0,
      PIERCING_STYLES.findIndex((o) => o.id === p[s.id]),
    ),
  ).join("");
}

export function decodePiercings(code: unknown): Piercings | null {
  if (typeof code !== "string" || !/^[0-9]+$/.test(code)) return null;
  if (code.length !== PIERCING_SPOTS.length) return null;
  const out: Piercings = { ...NO_PIERCINGS };
  for (const [i, s] of PIERCING_SPOTS.entries()) {
    const style = PIERCING_STYLES[Number(code[i])];
    if (!style) return null;
    out[s.id] = style.id;
  }
  return out;
}

export function piercingsOf(look: Look): Piercings {
  return decodePiercings(look.piercings) ?? NO_PIERCINGS;
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
  /** encodeFace's code for the face sliders, body shape and eye color;
   * looks from before the 3D doll have none and wear DEFAULT_FACE. */
  face?: string;
  /** encodeMakeup's code; looks without one wear DEFAULT_MAKEUP. */
  makeup?: string;
  /** encodePiercings' code; looks without one have none. */
  piercings?: string;
  /** A walk style from GAITS; looks without one walk naturally. */
  gait?: string;
};

const LOOK_CATALOGS: {
  [
    K in Exclude<keyof Look, "face" | "makeup" | "piercings" | "gait">
  ]: readonly {
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
  const hasMakeup = fields.has("makeup");
  const hasPiercings = fields.has("piercings");
  const hasGait = fields.has("gait");
  return (
    fields.size ===
      catalogs.length +
        (hasFace ? 1 : 0) +
        (hasMakeup ? 1 : 0) +
        (hasPiercings ? 1 : 0) +
        (hasGait ? 1 : 0) &&
    (!hasGait || isGait(fields.get("gait"))) &&
    (!hasPiercings || decodePiercings(fields.get("piercings")) !== null) &&
    (!hasFace || decodeFace(fields.get("face")) !== null) &&
    (!hasMakeup || decodeMakeup(fields.get("makeup")) !== null) &&
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

// Velvet Room regulars from the prototype; `at` is [x, y, z] in meters.
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
