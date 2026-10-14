import * as THREE from "three";
import { makeCanvas } from "../canvas.ts";
import { lathe, lumpy } from "./dollGeometry.ts";
import { makeOutline } from "./toon.ts";

// ------------------------------------------------------------ shared geometry

const TORSO: [number, number][] = [
  [0.655, 0],
  [0.668, 0.075],
  [0.7, 0.118],
  [0.75, 0.136],
  [0.8, 0.126],
  [0.85, 0.096],
  [0.885, 0.08],
  [0.925, 0.086],
  [0.975, 0.101],
  [1.025, 0.11],
  [1.065, 0.108],
  [1.095, 0.088],
  [1.115, 0.055],
  [1.125, 0],
];

function torsoShape(g: THREE.BufferGeometry, zScale = 0.7, flare = 0) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    let z = p.getZ(i) * (zScale + flare * Math.max(0, (0.8 - y) / 0.2));
    // bust
    if (z > 0) {
      const b = Math.exp(-Math.pow((y - 1.005) / 0.04, 2));
      const side = Math.exp(-Math.pow((Math.abs(x) - 0.052) / 0.045, 2));
      z += 0.032 * b * side;
    }
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

const band = (from: number, to: number, pad: number) =>
  TORSO.filter(([y]) => y >= from && y <= to).map(
    ([y, r]): [number, number] => [y, r + pad],
  );

export const G = {
  torso: torsoShape(lathe(TORSO, 32)),
  neck: lathe(
    [
      [1.04, 0.036],
      [1.13, 0.03],
      [1.25, 0.03],
    ],
    16,
  ),
  upperArm: lathe(
    [
      [-0.25, 0],
      [-0.24, 0.021],
      [-0.13, 0.026],
      [-0.02, 0.031],
      [0.012, 0.024],
      [0.02, 0],
    ],
    16,
  ),
  foreArm: lathe(
    [
      [-0.222, 0],
      [-0.212, 0.016],
      [-0.15, 0.019],
      [-0.05, 0.023],
      [0, 0.021],
      [0.012, 0],
    ],
    16,
  ),
  hand: new THREE.SphereGeometry(1, 16, 12),
  thigh: lathe(
    [
      [-0.345, 0],
      [-0.33, 0.041],
      [-0.25, 0.049],
      [-0.12, 0.06],
      [-0.02, 0.066],
      [0.02, 0.05],
      [0.035, 0],
    ],
    20,
  ),
  shin: lathe(
    [
      [-0.325, 0],
      [-0.31, 0.023],
      [-0.27, 0.026],
      [-0.16, 0.038],
      [-0.07, 0.041],
      [0, 0.039],
      [0.014, 0],
    ],
    20,
  ),
  ear: new THREE.SphereGeometry(1, 12, 10),
  // clothes
  cropTop: torsoShape(lathe(band(0.935, 1.1, 0.008), 32)),
  lowRise: torsoShape(lathe(band(0.665, 0.79, 0.008), 32)),
  // swimwear
  bikiniTop: torsoShape(lathe(band(0.96, 1.05, 0.009), 32)),
  bikiniBottom: torsoShape(lathe(band(0.655, 0.73, 0.007), 32)),
  onePiece: torsoShape(lathe(band(0.655, 1.06, 0.008), 32)),
  flareThigh: lathe(
    [
      [-0.34, 0.052],
      [-0.25, 0.058],
      [-0.12, 0.068],
      [-0.02, 0.074],
      [0.02, 0.06],
    ],
    20,
  ),
  flareShin: lathe(
    [
      [-0.37, 0.092],
      [-0.33, 0.08],
      [-0.26, 0.062],
      [-0.16, 0.05],
      [-0.06, 0.049],
      [0.02, 0.052],
    ],
    20,
  ),
  dress: torsoShape(
    lathe(
      [
        [0.6, 0.178],
        [0.64, 0.162],
        [0.7, 0.148],
        [0.76, 0.14],
        [0.81, 0.124],
        [0.855, 0.104],
        [0.89, 0.09],
        [0.93, 0.095],
        [0.975, 0.109],
        [1.025, 0.118],
        [1.06, 0.115],
        [1.085, 0.1],
      ],
      36,
    ),
    0.7,
    0.18,
  ),
  skirt: torsoShape(
    lathe(
      [
        [0.62, 0.17],
        [0.66, 0.158],
        [0.72, 0.147],
        [0.78, 0.138],
        [0.8, 0.133],
      ],
      36,
    ),
    0.7,
    0.16,
  ),
  jacket: lumpy(
    torsoShape(
      new THREE.LatheGeometry(
        band(0.84, 1.1, 0.045).map(([y, r]) => new THREE.Vector2(r, y)),
        36,
        0.55,
        Math.PI * 2 - 1.1,
      ),
      0.82,
    ),
    0.007,
    90,
  ),
  collar: lumpy(new THREE.TorusGeometry(0.12, 0.052, 14, 36), 0.012, 70),
  hem: lumpy(new THREE.TorusGeometry(0.15, 0.03, 10, 36), 0.008, 80),
  furSleeve: lumpy(
    lathe(
      [
        [-0.24, 0.05],
        [-0.12, 0.056],
        [-0.02, 0.06],
        [0.03, 0.05],
      ],
      18,
    ),
    0.009,
    80,
  ),
  furFore: lumpy(
    lathe(
      [
        [-0.2, 0.05],
        [-0.12, 0.044],
        [-0.02, 0.044],
        [0.02, 0.04],
      ],
      18,
    ),
    0.008,
    80,
  ),
  cuff: lumpy(new THREE.TorusGeometry(0.05, 0.026, 10, 24), 0.008, 90),
  belt: new THREE.TorusGeometry(0.128, 0.007, 8, 48),
  strap: new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.075, 0.065),
      new THREE.Vector3(0, 1.122, 0.012),
      new THREE.Vector3(0, 1.1, -0.06),
    ]),
    12,
    0.0045,
    6,
  ),
  // shoes
  sole: new THREE.BoxGeometry(0.09, 0.055, 0.15, 1, 1, 1),
  heel: new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14),
  upper: new THREE.SphereGeometry(1, 18, 12),
  strapRing: new THREE.TorusGeometry(0.032, 0.007, 8, 20),
  hoop: new THREE.TorusGeometry(0.036, 0.0045, 8, 32),
  scrunchie: lumpy(new THREE.TorusGeometry(0.04, 0.018, 12, 24), 0.004, 120),
  glass: lathe(
    [
      [-0.07, 0.03],
      [-0.068, 0.002],
      [-0.03, 0.004],
      [-0.02, 0.02],
      [0.0, 0.034],
      [0.01, 0.036],
    ],
    20,
  ),
  shadow: new THREE.CircleGeometry(0.34, 32),
};
G.jacket.computeVertexNormals();
G.belt.rotateX(Math.PI / 2);
G.belt.scale(1, 1, 0.72);
G.belt.translate(0, 0.765, 0);
G.collar.rotateX(Math.PI / 2);
G.collar.scale(1, 1, 0.78);
G.collar.translate(0, 1.11, -0.008);
G.hem.rotateX(Math.PI / 2);
G.hem.scale(1, 1, 0.75);
G.hem.translate(0, 0.84, 0);
G.cuff.rotateX(Math.PI / 2);
G.cuff.translate(0, -0.2, 0);
G.scrunchie.rotateX(-0.9);

export const shadowTex = (() => {
  const { canvas: c, ctx } = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.75)");
  g.addColorStop(0.6, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

export const OUTLINE = makeOutline(0.0055, false);
export const HAIR_OUTLINE = makeOutline(0.0065, true);
export const GOLD = new THREE.MeshStandardMaterial({
  color: "#ffcf73",
  metalness: 1,
  roughness: 0.22,
  envMapIntensity: 1.6,
});
export const GLASS = new THREE.MeshStandardMaterial({
  color: "#ffe6f4",
  metalness: 0.2,
  roughness: 0.05,
  transparent: true,
  opacity: 0.35,
});
export const DRINK_MATERIAL = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#ff9a1f").multiplyScalar(1.6),
  toneMapped: false,
});
