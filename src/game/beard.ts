// Facial hair, laid out as short hair strokes on the face texture (the
// client paints them in the hair color, faceCanvas.ts). A beard grows over
// the jaw and chin and along the upper lip, never on the lips themselves:
// stubble is a fine shadow, a short beard a trimmed one, a full beard climbs
// the cheeks with longer hairs. Seeded, so a face always grows the same
// beard. Coordinates are the face texture's, 0..1 with y down. Pure.

import type { Beard } from "./look.ts";

type Point = readonly [number, number];

/** The face landmarks a beard follows (a subset of the doll's marks). */
export type FaceMarks = {
  noseTip: Point;
  mouthL: Point;
  mouthR: Point;
  lCheek: Point;
  rCheek: Point;
};

/** One hair: where it starts, its angle (radians, 0 = right, y down), its
 * length and how dark it is. */
export type Stroke = {
  x: number;
  y: number;
  angle: number;
  len: number;
  alpha: number;
};

const STYLE: Record<
  Exclude<Beard, "none">,
  { count: number; len: number; alpha: number; cheek: number }
> = {
  // `cheek`: how far above the mouth's level it climbs at the sides
  stubble: { count: 1400, len: 0.004, alpha: 0.22, cheek: 0.03 },
  short: { count: 1300, len: 0.011, alpha: 0.5, cheek: 0.05 },
  full: { count: 2000, len: 0.018, alpha: 0.65, cheek: 0.09 },
};

export function beardStrokes(beard: Beard, m: FaceMarks): Stroke[] {
  if (beard === "none") return [];
  const style = STYLE[beard];
  let h = 0x9e3779b9;
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    h ^= h + Math.imul(h ^ (h >>> 7), 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
  const cx = (m.mouthL[0] + m.mouthR[0]) / 2;
  const mouthY = (m.mouthL[1] + m.mouthR[1]) / 2;
  // the marks are the doll's own left and right: either may sit higher in x
  const halfMouth = Math.abs(m.mouthR[0] - m.mouthL[0]) / 2;
  const halfJaw = Math.abs(m.rCheek[0] - m.lCheek[0]) / 2 + 0.04;
  const chin = mouthY + 0.2;
  // the cheeks' line the beard climbs to, highest at the sides
  const cheekLine = (x: number) => {
    const side = Math.min(1, Math.abs(x - cx) / halfJaw);
    return mouthY + 0.02 - style.cheek * side * side;
  };
  const strokes: Stroke[] = [];
  for (let tries = 0; strokes.length < style.count && tries < 40_000; tries++) {
    const x = cx + (rand() * 2 - 1) * halfJaw;
    const y = m.noseTip[1] + 0.025 + rand() * (chin - m.noseTip[1] - 0.025);
    // inside the jaw: an ellipse narrowing to the chin
    const below = Math.max(0, (y - mouthY) / (chin - mouthY));
    if (Math.abs(x - cx) > halfJaw * Math.sqrt(1 - below * below)) continue;
    // above the mouth, only the mustache, a band under the nose
    if (y < mouthY - 0.02 && Math.abs(x - cx) > halfMouth + 0.015) {
      if (y < cheekLine(x)) continue;
    }
    // never on the lips
    const lips =
      ((x - cx) / (halfMouth + 0.01)) ** 2 + ((y - mouthY) / 0.025) ** 2;
    if (lips < 1) continue;
    // hairs point down and a little outward, curving round the jaw
    const out = (x - cx) / halfJaw;
    strokes.push({
      x,
      y,
      angle: Math.PI / 2 - out * 0.6 + (rand() - 0.5) * 0.5,
      len: style.len * (0.7 + rand() * 0.6),
      alpha: style.alpha * (0.6 + rand() * 0.4),
    });
  }
  return strokes;
}
