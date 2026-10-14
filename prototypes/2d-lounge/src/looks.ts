import tones from "./tones.json";

export type ToneId = keyof typeof tones;
export type HairId = "waves" | "braids";
export type OutfitId = "flares" | "dress" | "fur";
export type ArmPose = "down" | "hip" | "drink";
export type Pose = "stand" | "sit";

export interface Look {
  tone: ToneId;
  hair: HairId;
  hairColor: string;
  brows: string;
  lips: string;
  outfit: OutfitId;
  tint: string;
  hoops: boolean;
}

export const TONES = tones;

export const TONE_OPTIONS: { id: ToneId; label: string }[] = [
  { id: "porcelain", label: "Porcelain" },
  { id: "honey", label: "Honey" },
  { id: "caramel", label: "Caramel" },
  { id: "mocha", label: "Mocha" },
  { id: "cocoa", label: "Cocoa" },
  { id: "midnight", label: "Midnight" },
];

export const HAIR_OPTIONS: { id: HairId; label: string }[] = [
  { id: "waves", label: "Butterfly waves" },
  { id: "braids", label: "Braided top knot" },
];

// CSS filters over the brunette source art; "none" keeps the drawn color.
export const HAIR_COLORS: { id: string; label: string; swatch: string }[] = [
  { id: "none", label: "Espresso", swatch: "#4a2618" },
  {
    id: "brightness(1.55) saturate(1.25) hue-rotate(6deg)",
    label: "Honey blonde",
    swatch: "#c98a3e",
  },
  {
    id: "brightness(0.42) saturate(0.7)",
    label: "Jet black",
    swatch: "#17100e",
  },
  {
    id: "hue-rotate(-22deg) saturate(2.1) brightness(0.95)",
    label: "Cherry cola",
    swatch: "#7a1420",
  },
  {
    id: "hue-rotate(-48deg) saturate(1.5) brightness(1.75)",
    label: "Rose pink",
    swatch: "#e06a9a",
  },
];

export const BROW_OPTIONS = [
  { id: "fox-snatched", label: "Snatched" },
  { id: "feathered-honey", label: "Feathered" },
  { id: "sculpted-espresso", label: "Sculpted" },
  { id: "y2k-thin", label: "Thin 90s" },
];

export const LIP_OPTIONS = [
  { id: "hot-pink-glam", label: "Fuchsia", swatch: "#e0307a" },
  { id: "burgundy-cherry", label: "Cherry", swatch: "#7c1426" },
  { id: "90s-caramel-ombre", label: "Caramel liner", swatch: "#9c5a3c" },
  { id: "nude-pink-gloss", label: "Nude gloss", swatch: "#d98a86" },
];

export const OUTFIT_OPTIONS: { id: OutfitId; label: string }[] = [
  { id: "flares", label: "Crop top and flares" },
  { id: "dress", label: "Mini dress" },
  { id: "fur", label: "Faux fur jacket" },
];

export const TINTS = [
  { id: "#ff2f9a", label: "Hot pink" },
  { id: "#8a3dff", label: "Ultraviolet" },
  { id: "#ffad1f", label: "Mango" },
  { id: "#e8e2f0", label: "Chrome" },
  { id: "#1c1424", label: "Black satin" },
  { id: "#18b98c", label: "Emerald" },
];

export const PLAYER_LOOK: Look = {
  tone: "honey",
  hair: "waves",
  hairColor: "none",
  brows: "fox-snatched",
  lips: "hot-pink-glam",
  outfit: "flares",
  tint: "#ff2f9a",
  hoops: true,
};

export const asset = (name: string) => `/spike2d/${name}.png`;

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return "#" + ch.map((c) => c.toString(16).padStart(2, "0")).join("");
}
