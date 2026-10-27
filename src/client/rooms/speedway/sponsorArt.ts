// Sponsor signs for the Speedway's SAFER barriers and trackside billboards.
// Features made-up brands in the Daydaze universe.

import type { Paint } from "./canvasTextures.ts";

export type Sponsor = {
  name: string;
  tagline: string;
  bg: string;
  fg: string;
  accent: string;
};

export const SPONSORS: readonly Sponsor[] = [
  {
    name: "OCTANE",
    tagline: "ENERGY COLA",
    bg: "#0c1836",
    fg: "#ffffff",
    accent: "#ff3b30",
  },
  {
    name: "SUPERGRIP",
    tagline: "RACE RADIALS",
    bg: "#111111",
    fg: "#ffcc00",
    accent: "#ffffff",
  },
  {
    name: "VOLT",
    tagline: "SYNTHETIC OIL",
    bg: "#350c4a",
    fg: "#ff4da6",
    accent: "#4de1ff",
  },
  {
    name: "MANGO SPARK",
    tagline: "CITRUS POP",
    bg: "#0f3b1b",
    fg: "#ffffff",
    accent: "#ff9500",
  },
  {
    name: "THUNDER",
    tagline: "SPARK PLUGS",
    bg: "#4a2800",
    fg: "#ffdd44",
    accent: "#ffffff",
  },
  {
    name: "DAYDAZE",
    tagline: "OFFICIAL SPEEDWAY",
    bg: "#070b1a",
    fg: "#4de1ff",
    accent: "#ff4fa8",
  },
];

/** Paints a wide rectangular sponsor banner for barrier walls or billboards. */
export function sponsorBannerPaint(sponsor: Sponsor): Paint {
  return (ctx, w, h) => {
    ctx.fillStyle = sponsor.bg;
    ctx.fillRect(0, 0, w, h);

    // Accent borders and diagonal stripes
    ctx.fillStyle = sponsor.accent;
    ctx.fillRect(0, 0, w, h * 0.12);
    ctx.fillRect(0, h * 0.88, w, h * 0.12);

    ctx.beginPath();
    ctx.moveTo(w * 0.08, 0);
    ctx.lineTo(w * 0.14, 0);
    ctx.lineTo(w * 0.06, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.92, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w * 0.94, h);
    ctx.lineTo(w * 0.86, h);
    ctx.closePath();
    ctx.fill();

    // Main brand name
    ctx.font = `italic 900 ${Math.floor(h * 0.44)}px sans-serif`;
    ctx.fillStyle = sponsor.fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sponsor.name, w / 2, h * 0.44);

    // Subtitle tagline
    ctx.font = `bold ${Math.floor(h * 0.18)}px sans-serif`;
    ctx.fillStyle = sponsor.accent;
    ctx.fillText(sponsor.tagline, w / 2, h * 0.74);
  };
}
