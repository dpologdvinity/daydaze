// Stock car canvas liveries for NASCAR oval racing: numbers on roof and doors,
// racing stripes, and made-up sponsor logos.

import type { Paint } from "./canvasTextures.ts";

export type StockLivery = {
  number: string;
  primary: string;
  secondary: string;
  numberColor: string;
  sponsor: string;
};

export const STOCK_LIVERIES: readonly StockLivery[] = [
  {
    number: "24",
    primary: "#0b2046",
    secondary: "#e62214",
    numberColor: "#ffde00",
    sponsor: "OCTANE",
  },
  {
    number: "48",
    primary: "#0a2240",
    secondary: "#4de1ff",
    numberColor: "#ffffff",
    sponsor: "DAYDAZE",
  },
  {
    number: "88",
    primary: "#144a1d",
    secondary: "#ffffff",
    numberColor: "#ff7f00",
    sponsor: "MANGO SPARK",
  },
  {
    number: "11",
    primary: "#54146e",
    secondary: "#ff4fa8",
    numberColor: "#ffffff",
    sponsor: "VOLT",
  },
  {
    number: "9",
    primary: "#b87800",
    secondary: "#101010",
    numberColor: "#ffffff",
    sponsor: "THUNDER",
  },
  {
    number: "3",
    primary: "#111111",
    secondary: "#d62828",
    numberColor: "#ffffff",
    sponsor: "SUPERGRIP",
  },
];

/** Paints a 512x512 NASCAR stock car livery with roof & door numbers and sponsor decals. */
export function stockCarPaint(livery: StockLivery): Paint {
  return (ctx, w, h) => {
    // 1. Base body coat
    ctx.fillStyle = livery.primary;
    ctx.fillRect(0, 0, w, h);

    // 2. Hood & Roof (Top half: y = 0 to h*0.5)
    // Racing stripes across center
    ctx.fillStyle = livery.secondary;
    const stripeW = w * 0.08;
    ctx.fillRect(w * 0.42, 0, stripeW, h * 0.5);
    ctx.fillRect(w * 0.54, 0, stripeW, h * 0.5);

    // Hood sponsor decal (near front / top edge)
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.floor(w * 0.08)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(livery.sponsor, w * 0.5, h * 0.12);

    // Roof number: huge, bold, outlined (center of top half)
    ctx.font = `italic 900 ${Math.floor(w * 0.24)}px sans-serif`;
    ctx.lineWidth = Math.max(3, Math.floor(w * 0.03));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(livery.number, w * 0.5, h * 0.32);
    ctx.fillStyle = livery.numberColor;
    ctx.fillText(livery.number, w * 0.5, h * 0.32);

    // 3. Side door panels (Bottom half: y = h*0.5 to h)
    // Divider bar
    ctx.fillStyle = livery.secondary;
    ctx.fillRect(0, h * 0.52, w, h * 0.04);

    // Left door (x: 0..w*0.5, y: h*0.5..h)
    ctx.font = `italic 900 ${Math.floor(w * 0.22)}px sans-serif`;
    ctx.lineWidth = Math.max(3, Math.floor(w * 0.025));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(livery.number, w * 0.25, h * 0.72);
    ctx.fillStyle = livery.numberColor;
    ctx.fillText(livery.number, w * 0.25, h * 0.72);

    // Right door (x: w*0.5..w, y: h*0.5..h)
    ctx.strokeStyle = "#000000";
    ctx.strokeText(livery.number, w * 0.75, h * 0.72);
    ctx.fillStyle = livery.numberColor;
    ctx.fillText(livery.number, w * 0.75, h * 0.72);

    // Sponsor side tags
    ctx.font = `bold ${Math.floor(w * 0.05)}px sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(livery.sponsor, w * 0.25, h * 0.9);
    ctx.fillText(livery.sponsor, w * 0.75, h * 0.9);
  };
}
