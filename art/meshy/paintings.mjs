// Turns the Meshy paintings in art/meshy/art/<name>.png into the game's
// public/art/<name>.webp: crops away any wall or margin the image model drew
// around the artwork, then scales the longest side to 1024 px.
// The crop finds the detailed region: the image model paints the art busy and
// the wall around it smooth, so rows and columns whose mean edge strength stays
// under a share of the busiest one are trimmed from each side. CROPS overrides
// the guess with a box in fractions [x0, y0, x1, y1] where it misjudges.
// Usage: node art/meshy/paintings.mjs [name ...]   (default: every PNG)
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const IN = path.join(ROOT, "art/meshy/art");
const OUT = path.join(ROOT, "public/art");
/** Hand-set crop boxes, fractions of width and height. */
const CROPS = {
  "dd-travel": [0.12, 0.05, 0.88, 0.92],
  "dd-boardwalk": [0.05, 0.01, 0.95, 0.98],
  "dd-night-market": [0.02, 0, 0.98, 0.99],
  "dd-skyline": [0.04, 0.01, 0.98, 0.99],
  "ph-fiesta-street": [0.03, 0.06, 0.95, 0.92],
  "ph-lola-kitchen": [0.12, 0.06, 0.91, 0.85],
  "ph-noche-buena": [0.09, 0.11, 0.91, 0.86],
  "ph-manila-bay": [0.03, 0.03, 0.97, 0.97],
  "sap-picnic": [0.22, 0.17, 0.78, 0.77],
  "sap-ferris-wheel": [0.11, 0.04, 0.89, 0.9],
  "sap-ice-rink": [0.1, 0.05, 0.9, 0.88],
  "sap-mermaids": [0.05, 0.01, 0.95, 0.92],
  "sap-slow-dance": [0.21, 0.16, 0.79, 0.74],
  "sap-pop-art": [0.09, 0.14, 0.91, 0.8],
  "sap-flash-game": [0, 0, 1, 1],
  "sap-marina": [0.14, 0.06, 0.86, 0.93],
  "sap-rainy-window": [0, 0, 1, 1],
};
const N = 256;

/** The busy region of a square-resized greyscale copy, as fractions. */
async function detect(file) {
  const { data } = await sharp(file)
    .resize(N, N, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const col = new Float64Array(N);
  const row = new Float64Array(N);
  for (let y = 1; y < N - 1; y++)
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const g =
        Math.abs(data[i + 1] - data[i - 1]) + Math.abs(data[i + N] - data[i - N]);
      col[x] += g;
      row[y] += g;
    }
  const bounds = (e) => {
    // smooth over 5 lines so one stray edge (a frame's lip) doesn't count
    const s = e.map((_, i) => {
      let t = 0;
      for (let k = -2; k <= 2; k++) t += e[Math.min(N - 1, Math.max(0, i + k))];
      return t / 5;
    });
    const sorted = [...s].sort((a, b) => a - b);
    const cut = sorted[Math.floor(N * 0.75)] * 0.3;
    let a = 0;
    while (a < N / 3 && s[a] < cut) a++;
    let b = N - 1;
    while (b > (2 * N) / 3 && s[b] < cut) b--;
    return [a / N, (b + 1) / N];
  };
  const [x0, x1] = bounds(col);
  const [y0, y1] = bounds(row);
  return [x0, y0, x1, y1];
}

mkdirSync(OUT, { recursive: true });
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(IN)
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.slice(0, -4));
for (const name of names) {
  const file = path.join(IN, `${name}.png`);
  const { width = 0, height = 0 } = await sharp(file).metadata();
  const box = CROPS[name] ?? (await detect(file));
  // a 1% inset hides the last line of wall or frame lip the guess leaves
  const inset = CROPS[name] ? 0 : 0.01;
  const left = Math.round((box[0] + inset) * width);
  const top = Math.round((box[1] + inset) * height);
  const w = Math.round((box[2] - box[0] - 2 * inset) * width);
  const h = Math.round((box[3] - box[1] - 2 * inset) * height);
  await sharp(file)
    .extract({ left, top, width: w, height: h })
    .resize(1024, 1024, { fit: "inside" })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log(name, box.map((v) => v.toFixed(2)).join(" "));
}
