// Doll body geometry, all in the 1024px bust template space (head canvas is the
// top 1024 rows of a 1024x2200 doll box; feet land at y=2170).
import type { ArmPose, Pose } from "./looks";

/** Centerline point: x, y, limb width. */
export type Pt = [number, number, number];
type XY = [number, number];

export const DOLL_W = 1024;
export const DOLL_H = 2200;
export const FOOT_Y = 2170;
/** Seated dolls sit lower in their box so their shoes still land on FOOT_Y. */
export const SIT_DROP = 85;

export function limbRing(pts: Pt[]): XY[] {
  const n = pts.length;
  const dirs = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len] as XY;
  });
  const side = (i: number, s: number): XY => {
    const [x, y, w] = pts[i];
    const [dx, dy] = dirs[i];
    return [x - dy * s * (w / 2), y + dx * s * (w / 2)];
  };
  const cap = (i: number, back: boolean): XY[] => {
    const [x, y, w] = pts[i];
    const [dx, dy] = dirs[i];
    const out: XY[] = [];
    for (let k = 1; k < 6; k++) {
      const phi = (k / 6) * Math.PI;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      // forward cap sweeps left->tip->right, back cap right->tail->left
      const nx = back ? dy : -dy;
      const ny = back ? -dx : dx;
      const fx = back ? -dx : dx;
      const fy = back ? -dy : dy;
      out.push([
        x + (nx * c + fx * s) * (w / 2),
        y + (ny * c + fy * s) * (w / 2),
      ]);
    }
    return out;
  };
  const left = pts.map((_, i) => side(i, 1));
  const right = pts.map((_, i) => side(i, -1)).reverse();
  return [...left, ...cap(n - 1, false), ...right, ...cap(0, true)];
}

const f = (v: number) => v.toFixed(1);

/** Closed Catmull-Rom spline through the ring. */
export function smoothPath(ring: XY[]): string {
  const n = ring.length;
  const p = (i: number) => ring[(i + n) % n];
  let d = `M${f(ring[0][0])} ${f(ring[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

/** Scalloped fur edge: resample the ring and bulge each step outward. */
export function fluffPath(ring: XY[], step = 34, bump = 15): string {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const pts: XY[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(len / step));
    for (let j = 0; j < k; j++)
      pts.push([
        a[0] + ((b[0] - a[0]) * j) / k,
        a[1] + ((b[1] - a[1]) * j) / k,
      ]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    const s = area > 0 ? 1 : -1;
    const wob = bump * (0.7 + 0.6 * rand(i));
    const cx = (a[0] + b[0]) / 2 + ((s * ty) / len) * wob;
    const cy = (a[1] + b[1]) / 2 + ((-s * tx) / len) * wob;
    d += `Q${f(cx)} ${f(cy)} ${f(b[0])} ${f(b[1])}`;
  }
  return d + "Z";
}

export function rand(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const mirrorPt = ([x, y, w]: Pt): Pt => [DOLL_W - x, y, w];
const mirrorLimbs = (limbs: Pt[][]) => limbs.map((l) => l.map(mirrorPt));

export interface ArmDef {
  limbs: Pt[][];
  hand: Pt[];
  /** Where a held glass sits, if the pose holds one. */
  holds?: XY;
}

const ARMS: Record<ArmPose, ArmDef> = {
  down: {
    limbs: [
      [
        [266, 955, 96],
        [254, 1150, 84],
        [244, 1290, 70],
        [240, 1400, 60],
        [242, 1492, 52],
      ],
    ],
    hand: [
      [242, 1490, 52],
      [241, 1550, 58],
      [242, 1598, 38],
    ],
  },
  hip: {
    limbs: [
      [
        [266, 955, 92],
        [238, 1100, 80],
        [190, 1250, 68],
      ],
      [
        [190, 1250, 64],
        [270, 1312, 56],
        [345, 1340, 48],
      ],
    ],
    hand: [
      [345, 1340, 48],
      [385, 1348, 54],
      [416, 1352, 36],
    ],
  },
  drink: {
    limbs: [
      [
        [266, 955, 92],
        [256, 1120, 80],
        [252, 1268, 68],
      ],
      [
        [252, 1268, 64],
        [286, 1180, 56],
        [318, 1098, 48],
      ],
    ],
    hand: [
      [318, 1100, 48],
      [326, 1062, 54],
      [332, 1030, 36],
    ],
    holds: [330, 1040],
  },
};

export function armDef(pose: ArmPose, right: boolean): ArmDef {
  const a = ARMS[pose];
  if (!right) return a;
  return {
    limbs: mirrorLimbs(a.limbs),
    hand: a.hand.map(mirrorPt),
    holds: a.holds && [DOLL_W - a.holds[0], a.holds[1]],
  };
}

export interface LegDef {
  limbs: Pt[][];
  ankle: XY;
  shoeRot: number;
}

const STAND_LEG: LegDef = {
  limbs: [
    [
      [430, 1405, 172],
      [440, 1600, 136],
      [448, 1770, 80],
      [452, 1880, 88],
      [458, 2035, 46],
    ],
  ],
  ankle: [458, 2040],
  shoeRot: 0,
};

export function legDefs(pose: Pose): [LegDef, LegDef] {
  if (pose === "stand")
    return [
      STAND_LEG,
      {
        limbs: mirrorLimbs(STAND_LEG.limbs),
        ankle: [DOLL_W - STAND_LEG.ankle[0], STAND_LEG.ankle[1]],
        shoeRot: 0,
      },
    ];
  // Seated, knees together, calves swept to one side.
  return [
    {
      limbs: [
        [
          [430, 1405, 172],
          [446, 1522, 160],
        ],
        [
          [450, 1530, 86],
          [520, 1720, 90],
          [600, 1950, 46],
        ],
      ],
      ankle: [605, 1957],
      shoeRot: -20,
    },
    {
      limbs: [
        [
          [594, 1405, 172],
          [586, 1522, 160],
        ],
        [
          [586, 1530, 86],
          [650, 1720, 90],
          [720, 1940, 46],
        ],
      ],
      ankle: [725, 1947],
      shoeRot: -20,
    },
  ];
}

/** Flared trouser legs follow the leg limbs, wider, flaring over the shoe. */
export function pantLimbs(leg: LegDef): Pt[][] {
  // Start the first limb above the waistband so its round cap gets clipped flat.
  const [hx, hy, hw] = leg.limbs[0][0];
  const limbs = [
    [[hx, hy - 90, hw] as Pt, ...leg.limbs[0]],
    ...leg.limbs.slice(1),
  ];
  return limbs.map((limb, li) =>
    limb.map((p, pi) => {
      const lastLimb = li === limbs.length - 1;
      if (lastLimb && pi === limb.length - 1) {
        const prev = limb[pi - 1];
        const dx = p[0] - prev[0];
        const dy = p[1] - prev[1];
        const len = Math.hypot(dx, dy);
        return [p[0] + (dx / len) * 50, p[1] + (dy / len) * 50, 205] as Pt;
      }
      return [p[0], p[1], p[2] * 1.1 + 16] as Pt;
    }),
  );
}

const TORSO_LEFT: XY[] = [
  [330, 930],
  [318, 980],
  [314, 1012],
  [318, 1090],
  [345, 1180],
  [390, 1262],
  [378, 1320],
  [350, 1395],
  [372, 1450],
  [440, 1472],
];

export const TORSO_PATH = smoothPath([
  [512, 924],
  ...TORSO_LEFT,
  [512, 1478],
  ...TORSO_LEFT.map(([x, y]) => [DOLL_W - x, y] as XY).reverse(),
]);

const JACKET_LEFT: XY[] = [
  [372, 846],
  [440, 880],
  [462, 960],
  [456, 1080],
  [442, 1200],
  [430, 1300],
  [380, 1320],
  [316, 1302],
  [298, 1200],
  [270, 1080],
  [212, 980],
  [220, 905],
  [292, 862],
];
export const JACKET_PANELS = [
  JACKET_LEFT,
  JACKET_LEFT.map(([x, y]) => [DOLL_W - x, y] as XY).reverse(),
];
