import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FACE_H, FACE_W, FACE_X0, FACE_Y0 } from "./faceTexture.ts";
import type { HairStyle } from "../../game/look.ts";

// Head is sculpted directly from the template outline: 1 template px = S m.
export const S = 0.00084;
const TY0 = 430;

function halfWidthPx(ty: number) {
  if (ty <= TY0) {
    const u = Math.min(1, (TY0 - ty) / 360);
    return 250 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 1 / 2.4);
  }
  const u = Math.min(1, (ty - TY0) / 332);
  return 252 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.1)), 0.68);
}
const chinShift = (ty: number) =>
  ty > TY0 ? 0.03 * Math.min(1, (ty - TY0) / 332) : 0;

/** Point on (or `pad` fraction outside) the head surface at angle `a` from front. */
export function headPoint(a: number, y: number, pad = 0) {
  const ty = TY0 - y / S;
  const h = halfWidthPx(ty) * S * (1 + pad);
  const c = Math.cos(a);
  return new THREE.Vector3(
    Math.sin(a) * h,
    y,
    c * h * (c > 0 ? 0.8 : 0.95) + chinShift(ty),
  );
}

function sculptHead(widthSegs: number, heightSegs: number) {
  const g = new THREE.SphereGeometry(1, widthSegs, heightSegs);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const r = Math.hypot(x, z);
    const a = r < 1e-6 ? 0 : Math.atan2(x, z);
    const ty = y >= 0 ? TY0 - y * 360 : TY0 - y * 332;
    const v = headPoint(a, (TY0 - ty) * S);
    if (r < 1e-6) v.set(0, v.y, chinShift(ty));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  return merged;
}

const headBase = sculptHead(72, 56);
// The far LOD head: the same silhouette on a coarse sphere, still face-UV'd.
const headBaseFar = sculptHead(24, 18);

function faceUv(g: THREE.BufferGeometry) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const tx = 512 + p.getX(i) / S;
    const ty = TY0 - p.getY(i) / S;
    uv[i * 2] = (tx - FACE_X0) / FACE_W;
    uv[i * 2 + 1] = 1 - (ty - FACE_Y0) / FACE_H;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

export const headGeometry = faceUv(headBase.clone());
const headGeometryFar = faceUv(headBaseFar.clone());

export const HEAD_TOP = (TY0 - 70) * S;
export const HEAD_CHIN = -(762 - TY0) * S;

export function lathe(profile: [number, number][], segments = 28) {
  return new THREE.LatheGeometry(
    profile.map(([y, r]) => new THREE.Vector2(Math.max(r, 0.0001), y)),
    segments,
  );
}

/** Displace along normals with layered sines: cheap faux fur / ruffles. */
export function lumpy(g: THREE.BufferGeometry, amp: number, freq: number) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const d =
      Math.sin(x * freq + Math.sin(z * freq * 0.7) * 2) *
        Math.cos(y * freq * 1.3 + x) +
      0.5 * Math.sin(z * freq * 2.1 + y * freq * 1.7);
    p.setXYZ(
      i,
      x + n.getX(i) * d * amp,
      y + n.getY(i) * d * amp,
      z + n.getZ(i) * d * amp,
    );
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- hair

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function withStrand(
  g: THREE.BufferGeometry,
  fn: (p: THREE.Vector3, n: THREE.Vector3) => THREE.Vector3,
) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const out = new Float32Array(p.count * 3);
  const v = new THREE.Vector3(),
    nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nn.fromBufferAttribute(n, i);
    const d = fn(v, nn);
    d.sub(nn.clone().multiplyScalar(d.dot(nn))).normalize();
    out.set([d.x, d.y, d.z], i * 3);
  }
  g.setAttribute("strandDir", new THREE.BufferAttribute(out, 3));
  return g;
}

/** Tapered, ribbon-flattened tube along `pts`. */
function lock(
  pts: THREE.Vector3[],
  r0: number,
  r1: number,
  flat = 0.55,
  k = 1,
) {
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
  const segs = Math.round(44 * k),
    radial = Math.max(4, Math.round(9 * k));
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const p = g.attributes.position;
  const strand = new Float32Array(p.count * 3);
  const c = new THREE.Vector3(),
    t = new THREE.Vector3(),
    o = new THREE.Vector3(),
    out = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, c);
    curve.getTangentAt(u, t);
    out.set(c.x, 0, c.z).normalize();
    // fuller in the middle, needle-fine at the tip
    const r =
      (r0 + (r1 - r0) * Math.pow(u, 1.4)) * (1 + 0.25 * Math.sin(u * Math.PI));
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      o.fromBufferAttribute(p, k).sub(c);
      const along = o.dot(out);
      o.addScaledVector(out, -along * (1 - flat)).multiplyScalar(r);
      p.setXYZ(k, c.x + o.x, c.y + o.y, c.z + o.z);
      strand.set([t.x, t.y, t.z], k * 3);
    }
  }
  g.computeVertexNormals();
  g.setAttribute("strandDir", new THREE.BufferAttribute(strand, 3));
  return g;
}

function cap(
  frontY: number,
  sideFall: number,
  flow: (p: THREE.Vector3, n: THREE.Vector3) => THREE.Vector3,
  src: THREE.BufferGeometry,
) {
  const p = src.attributes.position;
  const pos = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    pos.set(
      [p.getX(i) * 1.075, y * 1.045 + 0.008, p.getZ(i) * 1.075 - 0.004],
      i * 3,
    );
  }
  const index = src.index;
  if (!index) throw new Error("The head geometry has no index.");
  const keep: number[] = [];
  const thr = (x: number, z: number) => {
    const t = Math.abs(Math.atan2(x, z)) / Math.PI;
    const s = THREE.MathUtils.smoothstep(t, 0.16, sideFall);
    return frontY + (-0.21 - frontY) * s;
  };
  for (let f = 0; f < index.count; f += 3) {
    const a = index.getX(f),
      b = index.getX(f + 1),
      c = index.getX(f + 2);
    const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
    const cy = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
    const cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
    if (cy > thr(cx, cz)) keep.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(keep);
  g.computeVertexNormals();
  g.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(p.count * 2), 2),
  );
  return withStrand(g, flow);
}

const partFlow = (p: THREE.Vector3) =>
  new THREE.Vector3(p.x === 0 ? 0.01 : p.x, p.y - HEAD_TOP - 0.05, 0);

function fallPoint(a: number, y: number, R: number) {
  return new THREE.Vector3(Math.sin(a) * R, y, Math.cos(a) * R * 0.92);
}

function wavyLock(
  a: number,
  len: number,
  phase: number,
  pad: number,
  r0: number,
  waveAmp = 0.03,
  k = 1,
) {
  const pts = [
    headPoint(a, 0.27, pad - 0.02),
    headPoint(a, 0.17, pad + 0.02),
    headPoint(a, 0.03, pad + 0.06),
  ];
  const tan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const y = -0.12 - (len * i) / n;
    const R = 0.25 + 0.03 * Math.sin((i / n) * Math.PI) + pad * 0.15;
    const w = Math.sin(y * 13 + phase) * waveAmp * Math.min(1, i / 2);
    pts.push(fallPoint(a, y, R).addScaledVector(tan, w));
  }
  return lock(pts, r0, 0.006, 0.55, k);
}

function curtainBang(s: number, phase: number, k = 1) {
  const pts = [
    headPoint(s * 0.1, 0.29, 0.05),
    headPoint(s * 0.36, 0.245, 0.09),
    headPoint(s * 0.62, 0.175, 0.12),
    headPoint(s * 0.9, 0.085, 0.15),
    headPoint(s * 1.2, -0.04, 0.17),
  ];
  const a = s * 1.3;
  const tan = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
  [-0.18, -0.32, -0.46, -0.6].forEach((y, i) => {
    pts.push(
      fallPoint(a, y, 0.245).addScaledVector(
        tan,
        Math.sin(y * 13 + phase) * 0.028 * Math.min(1, (i + 1) / 2),
      ),
    );
  });
  return lock(pts, 0.055, 0.006, 0.5, k);
}

function tendril(s: number, len: number, k = 1) {
  const pts = [
    headPoint(s * 0.95, 0.14, 0.06),
    headPoint(s * 1.15, 0.04, 0.12),
  ];
  for (let i = 1; i <= 6; i++) {
    const y = 0.02 - (len * i) / 6;
    pts.push(
      new THREE.Vector3(
        s * (0.218 + Math.sin(i * 1.9) * 0.012),
        y,
        0.11 + Math.cos(i * 1.9) * 0.014,
      ),
    );
  }
  return lock(pts, 0.016, 0.004, 0.8, k);
}

function bun(s: number) {
  const c = new THREE.Vector3(s * 0.135, 0.265, -0.01);
  const parts: THREE.BufferGeometry[] = [];
  const ball = new THREE.SphereGeometry(0.085, 28, 20);
  ball.translate(c.x, c.y, c.z);
  parts.push(
    withStrand(ball, (p) => new THREE.Vector3(-(p.z - c.z), 0, p.x - c.x)),
  );
  [0, 1, 2].forEach((k) => {
    const t = new THREE.TorusGeometry(
      0.066 - k * 0.012,
      0.028 - k * 0.004,
      12,
      40,
    );
    const m = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(Math.PI / 2 + k * 0.5, s * k * 0.6, k * 0.4),
    );
    t.applyMatrix4(m);
    t.translate(c.x, c.y + 0.01 + k * 0.025, c.z);
    const axis = new THREE.Vector3(0, 0, 1).applyMatrix4(m);
    parts.push(
      withStrand(t, (p) => new THREE.Vector3().subVectors(p, c).cross(axis)),
    );
  });
  return parts;
}

// A plait: two strands wound round each other down the back.
function plait(s: number, phase: number, twist: number, k = 1) {
  const pts: THREE.Vector3[] = [headPoint(s * 0.9, 0.1, 0.1)];
  for (let i = 1; i <= 8; i++) {
    const y = 0.06 - i * 0.075;
    pts.push(
      new THREE.Vector3(
        s * (0.2 + 0.02 * Math.sin(i * 1.4)) +
          twist * Math.sin(i * 2.6 + phase),
        y,
        -0.06 - i * 0.02 + twist * Math.cos(i * 2.6 + phase),
      ),
    );
  }
  return lock(pts, 0.024, 0.014, 0.85, k);
}

const PUFF_C = new THREE.Vector3(0, 0.27, -0.03);

export const PONY_ROOT = new THREE.Vector3(0, 0.255, -0.175);

function strip(g: THREE.BufferGeometry) {
  const keep = ["position", "normal", "uv", "strandDir"];
  for (const k of Object.keys(g.attributes))
    if (!keep.includes(k)) g.deleteAttribute(k);
  return g.index ? g : mergeVertices(g);
}

function merge(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error("Hair parts have mismatched attributes.");
  return merged;
}

export type HairGeo = {
  main: THREE.BufferGeometry;
  pony?: THREE.BufferGeometry;
  tie?: THREE.Vector3;
};

const hairCache = new Map<HairStyle, HairGeo>();

// Far LOD: each hair mesh's coarse twin, swapped in by Doll beyond its range.
const farHair = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
export const farGeometry = (g: THREE.BufferGeometry) => farHair.get(g) ?? g;
farHair.set(headGeometry, headGeometryFar);

const NEAR = 1;
const FAR = 0.45;

function buildHair(style: HairStyle, k: number, src: THREE.BufferGeometry) {
  const r = rng(style.length * 977 + 13);
  const deg = Math.PI / 180;
  const parts: THREE.BufferGeometry[] = [];
  let pony: THREE.BufferGeometry | undefined;
  if (style === "waves") {
    parts.push(cap(0.172, 0.5, partFlow, src));
    for (let a = 62; a <= 298; a += 11) {
      parts.push(
        wavyLock(a * deg, 0.62 + r() * 0.1, r() * 6, 0.1, 0.05, 0.03, k),
      );
    }
    for (let a = 70; a <= 290; a += 13) {
      parts.push(
        wavyLock(
          (a + 5) * deg,
          0.5 + r() * 0.12,
          r() * 6,
          0.16,
          0.042,
          0.035,
          k,
        ),
      );
    }
    parts.push(curtainBang(1, 0.5, k), curtainBang(-1, 2.1, k));
  } else if (style === "ponytail") {
    const q = PONY_ROOT;
    parts.push(
      cap(0.178, 0.78, (p) => new THREE.Vector3().subVectors(q, p), src),
      tendril(1, 0.3, k),
      tendril(-1, 0.3, k),
    );
    const locks: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 13; i++) {
      const ox = (r() - 0.5) * 0.08,
        oz = (r() - 0.5) * 0.04;
      const ph = r() * 6;
      const pts = [
        new THREE.Vector3(ox * 0.2, 0, 0),
        new THREE.Vector3(ox * 0.6, 0.075, -0.07 + oz),
        new THREE.Vector3(ox, 0.06, -0.16 + oz),
        new THREE.Vector3(ox * 1.3, -0.06, -0.22 + oz),
      ];
      for (let j = 1; j <= 4; j++) {
        const y = -0.06 - j * 0.15;
        pts.push(
          new THREE.Vector3(
            ox * (1.3 - j * 0.15) + Math.sin(y * 10 + ph) * 0.02,
            y,
            -0.22 + oz + j * 0.012,
          ),
        );
      }
      locks.push(lock(pts, 0.04, 0.005, 0.7, k));
    }
    pony = merge(locks.map(strip));
  } else if (style === "sleek-bob") {
    // a glossy shell with curtain bangs and no loose locks
    parts.push(
      cap(0.174, 0.46, partFlow, src),
      curtainBang(1, 0.5),
      curtainBang(-1, 2.1),
    );
  } else if (style === "curl-cloud") {
    parts.push(cap(0.176, 0.6, partFlow, src));
    const deg = Math.PI / 180;
    for (let a = 60; a <= 300; a += 9) {
      parts.push(wavyLock(a * deg, 0.55 + r() * 0.2, r() * 6, 0.2, 0.07));
    }
  } else if (style === "bob") {
    parts.push(cap(0.172, 0.5, partFlow, src));
    for (let a = 64; a <= 296; a += 8) {
      parts.push(wavyLock(a * deg, 0.07, 0, 0.11, 0.05, 0, k));
    }
    parts.push(curtainBang(1, 0.2, k), curtainBang(-1, 1.4, k));
  } else if (style === "braids") {
    parts.push(cap(0.172, 0.5, partFlow, src));
    for (const side of [1, -1]) {
      parts.push(plait(side, 0, 0.014, k), plait(side, Math.PI, 0.014, k));
    }
    parts.push(tendril(1, 0.22, k), tendril(-1, 0.22, k));
  } else if (style === "afro") {
    parts.push(cap(0.172, 0.5, partFlow, src));
    const puff = new THREE.SphereGeometry(
      0.25,
      Math.round(36 * k) + 4,
      Math.round(24 * k) + 4,
    );
    puff.scale(1, 0.95, 1);
    puff.translate(0, 0.25, -0.03);
    lumpy(puff, 0.03, 45);
    parts.push(
      withStrand(puff, (p) => new THREE.Vector3().subVectors(p, PUFF_C)),
    );
  } else {
    parts.push(cap(0.172, 0.55, partFlow, src), ...bun(1), ...bun(-1));
    parts.push(tendril(1, 0.36, k), tendril(-1, 0.36, k));
    for (let a = 112; a <= 248; a += 12) {
      parts.push(
        wavyLock(a * deg, 0.42 + r() * 0.08, r() * 6, 0.1, 0.045, 0.03, k),
      );
    }
  }
  return {
    main: merge(parts.map(strip)),
    pony,
    tie: style === "ponytail" ? PONY_ROOT : undefined,
  };
}

// the 3D-only styles stand in as the nearest toon shape while models load
const TOON_HAIR: Partial<Record<HairStyle, HairStyle>> = {
  "long-straight": "waves",
  "long-curly": "curl-cloud",
  "mid-straight": "bob",
  "mid-wavy": "bob",
  "mid-curly": "curl-cloud",
  pixie: "sleek-bob",
  mermaid: "waves",
  shag: "bob",
  coils: "curl-cloud",
  "low-pony": "ponytail",
  pigtails: "braids",
  "top-knot": "buns",
};

export function hairGeometry(asked: HairStyle): HairGeo {
  const style = TOON_HAIR[asked] ?? asked;
  const hit = hairCache.get(style);
  if (hit) return hit;
  const near = buildHair(style, NEAR, headBase);
  const far = buildHair(style, FAR, headBaseFar);
  farHair.set(near.main, far.main);
  if (near.pony && far.pony) farHair.set(near.pony, far.pony);
  hairCache.set(style, near);
  return near;
}
