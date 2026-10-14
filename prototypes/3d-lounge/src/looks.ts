export type HairStyle = "waves" | "ponytail" | "buns";
export type Outfit = "flares" | "mini" | "fur";
export type Mood = "idle" | "pose" | "dance" | "sit" | "lean";

export type Look = {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  lips: string;
  brows: string;
  outfit: Outfit;
  outfitColor: string;
  shadow: string;
};

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
  { id: "#ffb02e", label: "Mango" },
  { id: "#9b5cff", label: "Violet" },
  { id: "#e8e2ff", label: "Chrome" },
  { id: "#141018", label: "Midnight" },
  { id: "#3fe0d0", label: "Aqua" },
] as const;

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

export const NPC_LOOKS: {
  look: Look;
  mood: Mood;
  at: [number, number, number];
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
