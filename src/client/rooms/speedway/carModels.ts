import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type Color,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CarSpec } from "../../../game/driving/car.ts";
import { NEON } from "./neon.ts";

// Side profiles are [z as a share of length, height in meters]. Nose at +z.
type Pt = [number, number];
// [width, height, depth, x, y, z] in meters.
type Box = [number, number, number, number, number, number];

type Profile = {
  /** Painted lower shell, closed along the ground. */
  paint: Pt[];
  /** Greenhouse, closed along the beltline the paint ends at. */
  glass: Pt[];
  /** Axle position as a share of length, front and rear. */
  axle: number;
  wheelR: number;
  tyreW: number;
  /** Lower bumper height, or null for no bumpers (kart). */
  bumperY: number | null;
  /** Lamp height, or null for no lamps. */
  lampY: number | null;
  /** Mirror height, or null for none. */
  mirrorY: number | null;
  extras: (L: number, W: number) => Box[];
};

const NONE: Box[] = [];

const PROFILES: Record<string, Profile> = {
  // 2000s compact sedan: three boxes, square glass.
  "quill-lite": {
    paint: [
      [-0.5, 0.24],
      [-0.5, 0.7],
      [-0.44, 0.78],
      [0.28, 0.78],
      [0.44, 0.74],
      [0.5, 0.66],
      [0.5, 0.24],
    ],
    glass: [
      [-0.28, 0.78],
      [-0.18, 1.2],
      [0.1, 1.22],
      [0.28, 0.78],
    ],
    axle: 0.32,
    wheelR: 0.31,
    tyreW: 0.24,
    bumperY: 0.3,
    lampY: 0.66,
    mirrorY: 0.9,
    extras: () => NONE,
  },
  // Bubbly 2000s hatch: round nose, tall glass, short bonnet.
  pebble: {
    paint: [
      [-0.5, 0.26],
      [-0.5, 0.64],
      [-0.47, 0.78],
      [-0.36, 0.82],
      [0.2, 0.82],
      [0.38, 0.76],
      [0.48, 0.64],
      [0.5, 0.5],
      [0.5, 0.26],
    ],
    glass: [
      [-0.44, 0.82],
      [-0.42, 1.16],
      [-0.34, 1.32],
      [-0.1, 1.4],
      [0.16, 1.36],
      [0.3, 1.18],
      [0.36, 0.82],
    ],
    axle: 0.3,
    wheelR: 0.3,
    tyreW: 0.23,
    bumperY: 0.3,
    lampY: 0.7,
    mirrorY: 0.92,
    extras: () => NONE,
  },
  // Compact SUV: tall, boxy, roof rails.
  "trail-mate": {
    paint: [
      [-0.5, 0.34],
      [-0.5, 0.96],
      [-0.2, 0.98],
      [0.34, 0.96],
      [0.5, 0.8],
      [0.5, 0.34],
    ],
    glass: [
      [-0.48, 0.96],
      [-0.46, 1.5],
      [0.12, 1.52],
      [0.36, 1.0],
      [0.34, 0.96],
    ],
    axle: 0.31,
    wheelR: 0.36,
    tyreW: 0.27,
    bumperY: 0.34,
    lampY: 0.84,
    mirrorY: 1.05,
    extras: (L, W) => [[W * 0.8, 0.05, L * 0.4, 0, 1.56, -0.05 * L]],
  },
  // Electric fastback: long sloping glass, lip spoiler.
  "arc-s": {
    paint: [
      [-0.5, 0.22],
      [-0.5, 0.74],
      [-0.36, 0.78],
      [0.3, 0.78],
      [0.5, 0.7],
      [0.5, 0.22],
    ],
    glass: [
      [-0.36, 0.78],
      [-0.14, 1.14],
      [0.04, 1.2],
      [0.26, 1.0],
      [0.3, 0.78],
    ],
    axle: 0.32,
    wheelR: 0.31,
    tyreW: 0.24,
    bumperY: 0.28,
    lampY: 0.68,
    mirrorY: 0.92,
    extras: (L, W) => [[W * 0.8, 0.04, 0.2, 0, 0.9, -0.46 * L]],
  },
  // Executive sedan: long bonnet, chrome grille bar.
  "halden-7": {
    paint: [
      [-0.5, 0.24],
      [-0.5, 0.8],
      [-0.4, 0.84],
      [0.3, 0.84],
      [0.5, 0.74],
      [0.5, 0.24],
    ],
    glass: [
      [-0.4, 0.84],
      [-0.2, 1.3],
      [0.14, 1.32],
      [0.3, 0.84],
    ],
    axle: 0.33,
    wheelR: 0.32,
    tyreW: 0.25,
    bumperY: 0.3,
    lampY: 0.74,
    mirrorY: 0.98,
    extras: (L, W) => [[W * 0.5, 0.06, 0.04, 0, 0.7, 0.5 * L + 0.01]],
  },
  // Mid-engine supercar: low wedge, cab forward, rear wing on pylons.
  "vespera-gt": {
    paint: [
      [-0.5, 0.2],
      [-0.5, 0.5],
      [-0.3, 0.56],
      [0.2, 0.56],
      [0.5, 0.44],
      [0.5, 0.2],
    ],
    glass: [
      [-0.2, 0.56],
      [-0.06, 0.92],
      [0.16, 0.94],
      [0.34, 0.56],
    ],
    axle: 0.34,
    wheelR: 0.3,
    tyreW: 0.28,
    bumperY: 0.24,
    lampY: 0.5,
    mirrorY: 0.6,
    extras: (L, W) => [
      [W * 0.9, 0.04, 0.22, 0, 0.84, -0.46 * L],
      [0.06, 0.3, 0.06, W * 0.3, 0.7, -0.44 * L],
      [0.06, 0.3, 0.06, -W * 0.3, 0.7, -0.44 * L],
      [W * 0.96, 0.03, 0.2, 0, 0.2, 0.52 * L],
    ],
  },
  // Full-size pickup: tall cab up front, an open bed, a roof light bar.
  ridgeback: {
    paint: [
      [-0.5, 0.42],
      [-0.5, 1.02],
      [0.36, 1.02],
      [0.5, 0.92],
      [0.5, 0.42],
    ],
    glass: [
      [-0.06, 1.02],
      [-0.04, 1.62],
      [0.22, 1.62],
      [0.34, 1.02],
    ],
    axle: 0.33,
    wheelR: 0.4,
    tyreW: 0.3,
    bumperY: 0.42,
    lampY: 0.88,
    mirrorY: 1.15,
    extras: (L, W) => [
      [W * 0.86, 0.04, L * 0.42, 0, 1.0, -0.27 * L],
      [W * 0.7, 0.06, 0.1, 0, 1.66, 0.08 * L],
    ],
  },
  // 2000s minivan: one long box of glass, roof rails.
  "atlas-van": {
    paint: [
      [-0.5, 0.3],
      [-0.5, 0.9],
      [0.3, 0.9],
      [0.5, 0.74],
      [0.5, 0.3],
    ],
    glass: [
      [-0.48, 0.9],
      [-0.46, 1.58],
      [0.16, 1.6],
      [0.42, 0.96],
      [0.4, 0.9],
    ],
    axle: 0.33,
    wheelR: 0.32,
    tyreW: 0.24,
    bumperY: 0.32,
    lampY: 0.78,
    mirrorY: 1.0,
    extras: (L, W) => [[W * 0.8, 0.05, L * 0.5, 0, 1.64, -0.05 * L]],
  },
  // Tuner coupe: low and short, a big wing on pylons, a front splitter.
  "kestrel-rs": {
    paint: [
      [-0.5, 0.22],
      [-0.5, 0.66],
      [-0.34, 0.72],
      [0.26, 0.72],
      [0.5, 0.6],
      [0.5, 0.22],
    ],
    glass: [
      [-0.32, 0.72],
      [-0.14, 1.12],
      [0.06, 1.14],
      [0.26, 0.72],
    ],
    axle: 0.32,
    wheelR: 0.31,
    tyreW: 0.25,
    bumperY: 0.26,
    lampY: 0.62,
    mirrorY: 0.86,
    extras: (L, W) => [
      [W * 0.9, 0.04, 0.24, 0, 1.0, -0.46 * L],
      [0.06, 0.28, 0.06, W * 0.32, 0.84, -0.45 * L],
      [0.06, 0.28, 0.06, -W * 0.32, 0.84, -0.45 * L],
      [W * 0.96, 0.03, 0.14, 0, 0.2, 0.52 * L],
    ],
  },
  // Muscle car: a long hood with a scoop, a fastback and a ducktail.
  "strada-v8": {
    paint: [
      [-0.5, 0.24],
      [-0.5, 0.74],
      [-0.4, 0.78],
      [0.46, 0.78],
      [0.5, 0.72],
      [0.5, 0.24],
    ],
    glass: [
      [-0.34, 0.78],
      [-0.16, 1.16],
      [0.04, 1.18],
      [0.16, 0.78],
    ],
    axle: 0.33,
    wheelR: 0.33,
    tyreW: 0.28,
    bumperY: 0.3,
    lampY: 0.66,
    mirrorY: 0.92,
    extras: (L, W) => [
      [0.5, 0.1, 0.6, 0, 0.83, 0.3 * L],
      [W * 0.9, 0.05, 0.1, 0, 0.8, -0.49 * L],
    ],
  },
  // Roadster: open top, just a windshield, two headrests and roll hoops.
  "nova-spyder": {
    paint: [
      [-0.5, 0.22],
      [-0.5, 0.62],
      [-0.3, 0.66],
      [0.2, 0.66],
      [0.5, 0.52],
      [0.5, 0.22],
    ],
    glass: [
      [0.1, 0.66],
      [0.0, 0.98],
      [0.04, 0.98],
      [0.16, 0.66],
    ],
    axle: 0.33,
    wheelR: 0.3,
    tyreW: 0.25,
    bumperY: 0.24,
    lampY: 0.54,
    mirrorY: 0.76,
    extras: (L, W) => [
      [0.36, 0.26, 0.3, W * 0.22, 0.78, -0.14 * L],
      [0.36, 0.26, 0.3, -W * 0.22, 0.78, -0.14 * L],
      [0.04, 0.34, 0.04, W * 0.22, 0.84, -0.2 * L],
      [0.04, 0.34, 0.04, -W * 0.22, 0.84, -0.2 * L],
    ],
  },
  // Hypercar: the lowest wedge, a huge wing, fins and a diffuser.
  "zenith-x": {
    paint: [
      [-0.5, 0.2],
      [-0.5, 0.48],
      [-0.34, 0.52],
      [0.16, 0.52],
      [0.5, 0.38],
      [0.5, 0.2],
    ],
    glass: [
      [-0.24, 0.52],
      [-0.08, 0.9],
      [0.12, 0.92],
      [0.32, 0.52],
    ],
    axle: 0.35,
    wheelR: 0.31,
    tyreW: 0.3,
    bumperY: 0.22,
    lampY: 0.44,
    mirrorY: 0.58,
    extras: (L, W) => [
      [W * 1.0, 0.04, 0.3, 0, 0.98, -0.47 * L],
      [0.04, 0.42, 0.3, W * 0.42, 0.78, -0.45 * L],
      [0.04, 0.42, 0.3, -W * 0.42, 0.78, -0.45 * L],
      [W * 0.9, 0.12, 0.2, 0, 0.24, -0.5 * L],
      [W * 1.0, 0.03, 0.16, 0, 0.18, 0.53 * L],
    ],
  },
  // Open kart: seat, nose wing and a roll bar over the driver.
  "zip-kart": {
    paint: [
      [-0.5, 0.16],
      [-0.5, 0.38],
      [-0.1, 0.44],
      [0.3, 0.46],
      [0.5, 0.3],
      [0.5, 0.16],
    ],
    glass: [
      [-0.2, 0.44],
      [-0.22, 0.64],
      [0, 0.66],
      [0, 0.44],
    ],
    axle: 0.22,
    wheelR: 0.16,
    tyreW: 0.2,
    bumperY: null,
    lampY: null,
    mirrorY: null,
    extras: (L, W) => [
      [W * 0.8, 0.04, 0.04, 0, 0.62, -0.12 * L],
      [0.04, 0.3, 0.04, W * 0.4, 0.48, -0.12 * L],
      [0.04, 0.3, 0.04, -W * 0.4, 0.48, -0.12 * L],
      [W * 0.96, 0.03, 0.12, 0, 0.2, 0.52 * L],
    ],
  },
};

const TO_WORLD = new Matrix4().set(
  0,
  0,
  -1,
  0,
  0,
  1,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
);

// Extrudes a z-y outline across the width, centered on x. Det +1, so normals stay outward.
function sideShell(pts: Pt[], length: number, depth: number): BufferGeometry {
  const shape = new Shape(pts.map(([z, y]) => new Vector2(z * length, y)));
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2);
  g.applyMatrix4(TO_WORLD);
  return g;
}

// Every bucket merges, so the pieces must share one attribute layout.
function plain(g: BufferGeometry): BufferGeometry {
  return g.index ? g.toNonIndexed() : g;
}

function tint(g: BufferGeometry, color: Color): BufferGeometry {
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return g;
}

function box(b: Box): BufferGeometry {
  const [w, h, d, x, y, z] = b;
  return new BoxGeometry(w, h, d).translate(x, y, z);
}

export type Bucket = "paint" | "glass" | "trim" | "tyre" | "rim" | "light";
export type CarParts = Partial<Record<Bucket, BufferGeometry>>;

function merged(list: BufferGeometry[]): BufferGeometry | undefined {
  if (list.length === 0) return undefined;
  const g = mergeGeometries(list);
  if (!g) throw new Error("car parts failed to merge");
  return g;
}

// Shared by every car, so each car adds only its paint material.
export const GLASS = new MeshStandardMaterial({
  color: "#14203a",
  roughness: 0.08,
  metalness: 0.6,
});
export const TRIM = new MeshStandardMaterial({
  color: "#1c1a24",
  roughness: 0.55,
  metalness: 0.2,
});
export const TYRE = new MeshStandardMaterial({
  color: "#0c0c10",
  roughness: 0.9,
});
export const RIM = new MeshStandardMaterial({
  color: "#d4d8e4",
  roughness: 0.28,
  metalness: 0.55,
});
// Vertex color carries the lamp hue, so one draw call covers head- and tail-lights.
export const LIGHT = new MeshBasicMaterial({
  vertexColors: true,
  toneMapped: false,
});

function carProfileParts(spec: CarSpec, p: Profile): CarParts {
  const L = spec.length;
  const W = spec.width;
  const paint: BufferGeometry[] = [plain(sideShell(p.paint, L, W))];
  const glass: BufferGeometry[] = [plain(sideShell(p.glass, L, W * 0.86))];
  const trim: BufferGeometry[] = [];
  const tyre: BufferGeometry[] = [];
  const rim: BufferGeometry[] = [];
  const light: BufferGeometry[] = [];
  for (const z of [p.axle * L, -p.axle * L]) {
    for (const side of [1, -1]) {
      const x = side * (W / 2 - 0.04);
      tyre.push(
        plain(
          new CylinderGeometry(p.wheelR, p.wheelR, p.tyreW, 24)
            .rotateZ(Math.PI / 2)
            .translate(x, p.wheelR, z),
        ),
      );
      // five spokes and a center cap on the wheel's outer face
      const face = x + side * p.tyreW * 0.54;
      for (let k = 0; k < 5; k++)
        rim.push(
          plain(
            new BoxGeometry(0.02, p.wheelR * 1.05, 0.05)
              .rotateX((k / 5) * Math.PI * 2)
              .translate(face, p.wheelR, z),
          ),
        );
      rim.push(
        plain(
          new CylinderGeometry(p.wheelR * 0.16, p.wheelR * 0.16, 0.04, 10)
            .rotateZ(Math.PI / 2)
            .translate(face + side * 0.01, p.wheelR, z),
        ),
      );
      // the wheel arch: a dark half ring over the tyre
      if (p.bumperY !== null)
        trim.push(
          new TorusGeometry(p.wheelR * 1.12, 0.035, 6, 16, Math.PI)
            .rotateY(Math.PI / 2)
            .translate(side * (W / 2 + 0.01), p.wheelR, z),
        );
      rim.push(
        plain(
          new CylinderGeometry(
            p.wheelR * 0.58,
            p.wheelR * 0.58,
            p.tyreW * 1.06,
            10,
          )
            .rotateZ(Math.PI / 2)
            .translate(x, p.wheelR, z),
        ),
      );
    }
  }
  if (p.bumperY !== null) {
    trim.push(box([W * 0.98, 0.14, 0.12, 0, p.bumperY, L / 2 + 0.02]));
    trim.push(box([W * 0.98, 0.14, 0.12, 0, p.bumperY, -L / 2 - 0.02]));
  }
  if (p.mirrorY !== null) {
    for (const side of [1, -1]) {
      trim.push(
        box([0.12, 0.1, 0.14, side * (W / 2 + 0.06), p.mirrorY, 0.14 * L]),
      );
    }
  }
  if (p.lampY !== null) {
    for (const side of [1, -1]) {
      light.push(
        tint(
          plain(box([0.3, 0.1, 0.05, side * W * 0.34, p.lampY, L / 2 - 0.01])),
          NEON.white,
        ),
      );
      light.push(
        tint(
          plain(box([0.3, 0.1, 0.05, side * W * 0.34, p.lampY, -L / 2 + 0.01])),
          NEON.red,
        ),
      );
    }
  }
  if (p.bumperY !== null && p.lampY !== null) {
    // grille between the headlamps, plates front and back, an exhaust
    trim.push(box([W * 0.42, 0.14, 0.03, 0, p.lampY - 0.06, L / 2 + 0.005]));
    for (const end of [1, -1])
      rim.push(
        plain(
          box([0.5, 0.12, 0.02, 0, p.bumperY + 0.02, end * (L / 2 + 0.09)]),
        ),
      );
    rim.push(
      plain(
        new CylinderGeometry(0.04, 0.045, 0.22, 10)
          .rotateX(Math.PI / 2)
          .translate(W * 0.28, p.bumperY - 0.06, -L / 2 - 0.06),
      ),
    );
    for (const side of [1, -1]) {
      const x = side * (W / 2 + 0.004);
      // door seams, handles and a side skirt
      for (const z of [0.1 * L, -0.12 * L])
        trim.push(box([0.01, 0.42, 0.012, x, p.bumperY + 0.42, z]));
      rim.push(
        plain(
          box([0.02, 0.03, 0.12, x + side * 0.01, p.bumperY + 0.5, 0.02 * L]),
        ),
      );
      trim.push(box([0.03, 0.06, L * 0.42, x, p.bumperY - 0.02, 0]));
      // amber indicators at the front corners
      light.push(
        tint(
          plain(box([0.03, 0.06, 0.12, x, p.lampY, L / 2 - 0.12])),
          NEON.gold,
        ),
      );
    }
  }
  for (const b of p.extras(L, W)) trim.push(box(b));
  return {
    paint: merged(paint),
    glass: merged(glass),
    trim: merged(trim.map(plain)),
    tyre: merged(tyre),
    rim: merged(rim),
    light: merged(light),
  };
}

// Bumper car: a round dodgem body, a rubber ring, a seat and a pole with a lamp.
function bumperParts(spec: CarSpec): CarParts {
  const r = spec.width / 2;
  const paint = plain(
    new CylinderGeometry(r * 0.94, r, 0.5, 28).translate(0, 0.35, 0),
  );
  const glass = plain(
    new CylinderGeometry(0.4, 0.44, 0.2, 20).translate(0, 0.7, 0),
  );
  const trim = [
    plain(
      new TorusGeometry(r - 0.06, 0.07, 8, 28)
        .rotateX(Math.PI / 2)
        .translate(0, 0.38, 0),
    ),
    plain(new CylinderGeometry(0.5, 0.5, 0.04, 28).translate(0, 0.62, 0)),
    plain(new CylinderGeometry(0.025, 0.025, 1.2, 6).translate(0, 1.2, 0)),
  ];
  const light = [
    tint(
      plain(new SphereGeometry(0.09, 8, 6).translate(0, 1.85, 0)),
      NEON.cyan,
    ),
  ];
  return {
    paint,
    glass,
    trim: merged(trim),
    light: merged(light),
  };
}

const cache = new Map<string, CarParts>();

/** Geometry for one roster car, built once and shared by every car of that model. */
export function carParts(spec: CarSpec): CarParts {
  const cached = cache.get(spec.id);
  if (cached) return cached;
  // shortcut: an unknown roster id draws the sedan, add a profile when a car is added
  const parts =
    spec.class === "bumper"
      ? bumperParts(spec)
      : carProfileParts(spec, PROFILES[spec.id] ?? PROFILES["quill-lite"]);
  cache.set(spec.id, parts);
  return parts;
}
