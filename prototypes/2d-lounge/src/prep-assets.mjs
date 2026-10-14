// One-off asset prep for the 2D lounge spike: run with `node src/spike2d/prep-assets.mjs`.
// Recolors the golden doll bust into skin tones, fades the bust bottom so the
// drawn body can take over, and downsizes every layer to 512px.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const out = "public/spike2d";
const SIZE = 512;
mkdirSync(out, { recursive: true });

// Golden template mid-skin; every tone is a per-channel ratio of this.
const MID = [237, 172, 100];
const TONES = {
  porcelain: [242, 198, 172],
  honey: MID,
  caramel: [206, 140, 84],
  mocha: [164, 104, 64],
  cocoa: [122, 74, 48],
  midnight: [96, 58, 44],
};
// Body palette sampled from the bust shoulders: base, shadow, rim light.
const BODY = { base: MID, shade: [205, 128, 68], light: [250, 208, 150] };

const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const MID_LUM = lum(MID);

function tonePixel(px, target) {
  const ratio = target.map((c, i) => c / MID[i]);
  const l = lum(px) / MID_LUM;
  const lift = Math.max(0, (MID_LUM - lum(target)) / MID_LUM) * 2;
  return px.map((c, i) => {
    let v = c * ratio[i];
    // Keep glossy highlights bright on deep tones instead of muddying them.
    if (l > 1) v += (255 - v) * Math.min(1, (l - 1) * lift);
    return Math.max(0, Math.min(255, Math.round(v)));
  });
}

// Eye boxes in template space: keep irises untouched.
const EYES = [
  [285, 405, 480, 525],
  [545, 405, 760, 525],
];

function skinWeight(r, g, b, x, y) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  const sat = (max - min) / max;
  let hue = 0;
  if (max === r) hue = (60 * ((g - b) / (max - min || 1)) + 360) % 360;
  else if (max === g) hue = 60 * ((b - r) / (max - min || 1)) + 120;
  else hue = 60 * ((r - g) / (max - min || 1)) + 240;
  if (hue > 60 && hue < 340) return 0;
  const inEye = EYES.some(
    ([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1,
  );
  if (inEye && max < 160) return 0;
  return Math.max(0, Math.min(1, (sat - 0.12) / 0.15));
}

// Alpha fade over the bust bottom (template px) so the SVG body shows through.
const FADE_START = 958;
const FADE_END = 1012;
function fade(y) {
  if (y <= FADE_START) return 1;
  if (y >= FADE_END) return 0;
  const t = (y - FADE_START) / (FADE_END - FADE_START);
  return 1 - t * t * (3 - 2 * t);
}

async function raw(file) {
  return sharp(file).ensureAlpha().resize(1024, 1024).raw().toBuffer();
}

async function save(buf, name) {
  await sharp(buf, { raw: { width: 1024, height: 1024, channels: 4 } })
    .resize(SIZE, SIZE)
    .png({ compressionLevel: 9, palette: false })
    .toFile(`${out}/${name}.png`);
}

const template = await raw("art/doll/template-doll-golden.png");
for (const [name, target] of Object.entries(TONES)) {
  const buf = Buffer.from(template);
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 4;
      const px = [buf[i], buf[i + 1], buf[i + 2]];
      const w = skinWeight(...px, x, y);
      if (w > 0) {
        const t = tonePixel(px, target);
        for (let c = 0; c < 3; c++)
          buf[i + c] = Math.round(px[c] + (t[c] - px[c]) * w);
      }
      buf[i + 3] = Math.round(buf[i + 3] * fade(y));
    }
  }
  await save(buf, `head-${name}`);
}

async function fadedLayer(file, name, fadeBottom) {
  const buf = await raw(file);
  if (fadeBottom) {
    for (let y = 940; y < 1024; y++) {
      const f = Math.max(0, 1 - (y - 940) / 80);
      for (let x = 0; x < 1024; x++) {
        const i = (y * 1024 + x) * 4 + 3;
        buf[i] = Math.round(buf[i] * f);
      }
    }
  }
  await save(buf, name);
}

const m = "gallery/modular";
await fadedLayer(`${m}/hair-wavy-butterflies-v3.png`, "hair-waves", true);
await fadedLayer(`${m}/full-hair-topknot-braids.png`, "hair-braids", true);
for (const s of [
  "feathered-honey",
  "fox-snatched",
  "sculpted-espresso",
  "y2k-thin",
])
  await fadedLayer(`${m}/full-brows-${s}.png`, `brows-${s}`, false);
for (const s of [
  "burgundy-cherry",
  "hot-pink-glam",
  "90s-caramel-ombre",
  "nude-pink-gloss",
])
  await fadedLayer(`${m}/full-lips-${s}.png`, `lips-${s}`, false);
await fadedLayer(`${m}/full-jewelry-bamboo-hoops-gold.png`, "hoops", false);

// Matching body palettes per tone, consumed by looks.ts.
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const palettes = Object.fromEntries(
  Object.entries(TONES).map(([name, target]) => [
    name,
    {
      base: hex(tonePixel(BODY.base, target)),
      shade: hex(tonePixel(BODY.shade, target)),
      light: hex(tonePixel(BODY.light, target)),
    },
  ]),
);
writeFileSync(
  "src/spike2d/tones.json",
  JSON.stringify(palettes, null, 2) + "\n",
);
console.log(palettes);
