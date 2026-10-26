import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BONE } from "./anims.ts";
import type {
  PiercingSpot,
  Piercings,
  PiercingStyle,
} from "../../../game/look.ts";

/** A piercing spot on the doll, in the model's own space (Y up). */
export type Anchor = { p: THREE.Vector3; n: THREE.Vector3 };
export type Anchors = Partial<Record<PiercingSpot, Anchor>>;

const isTriple = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((x) => typeof x === "number" && Number.isFinite(x));

/** The model's piercing anchors (Blender, Z up) as Y-up vectors. */
export function readAnchors(meta: unknown): Anchors {
  const out: Anchors = {};
  if (typeof meta !== "string") return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(meta);
  } catch {
    return out;
  }
  if (typeof parsed !== "object" || parsed === null) return out;
  const anchors: unknown = Reflect.get(parsed, "anchors");
  if (typeof anchors !== "object" || anchors === null) return out;
  for (const spot of ["lip", "nose", "brow", "navel"] as const) {
    const a: unknown = Reflect.get(anchors, spot);
    if (typeof a !== "object" || a === null) continue;
    const p: unknown = Reflect.get(a, "p");
    const n: unknown = Reflect.get(a, "n");
    if (!isTriple(p) || !isTriple(n)) continue;
    // Blender (x, y, z) with z up is glTF (x, z, -y)
    out[spot] = {
      p: new THREE.Vector3(p[0], p[2], -p[1]),
      n: new THREE.Vector3(n[0], n[2], -n[1]).normalize(),
    };
  }
  return out;
}

const STUD = new THREE.SphereGeometry(0.0022, 10, 8);
const RING = new THREE.TorusGeometry(0.0045, 0.0007, 6, 18);
const NAVEL_RING = new THREE.TorusGeometry(0.007, 0.0011, 6, 20);
const GEM = new THREE.SphereGeometry(0.0032, 10, 8);

const METAL = {
  silver: new THREE.MeshStandardMaterial({
    color: "#e8eaf2",
    metalness: 1,
    roughness: 0.22,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: "#ffcb5c",
    metalness: 1,
    roughness: 0.25,
  }),
  rose: new THREE.MeshStandardMaterial({
    color: "#f2a98f",
    metalness: 1,
    roughness: 0.25,
  }),
  // the fine jewelry's stones, catching the light
  diamond: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#dff4ff",
    emissiveIntensity: 0.7,
    metalness: 0.2,
    roughness: 0.02,
  }),
  opal: new THREE.MeshStandardMaterial({
    color: "#cfe9ff",
    emissive: "#ffb3d9",
    emissiveIntensity: 0.35,
    roughness: 0.15,
  }),
};

/** The material a style is made of. */
function metalOf(style: PiercingStyle): THREE.MeshStandardMaterial {
  if (style.startsWith("rose")) return METAL.rose;
  if (style.startsWith("gold")) return METAL.gold;
  if (style.startsWith("diamond")) return METAL.diamond;
  if (style.startsWith("opal")) return METAL.opal;
  return METAL.silver;
}
const GEMSTONE = new THREE.MeshStandardMaterial({
  color: "#ff5fc8",
  emissive: "#ff2f9a",
  emissiveIntensity: 0.4,
  roughness: 0.1,
});

// which bone each spot moves with (the navel rides the lower spine)
const SPOT_BONE: Record<PiercingSpot, string> = {
  lip: BONE.head,
  nose: BONE.head,
  brow: BONE.head,
  navel: BONE.spine,
};

const X = new THREE.Vector3(1, 0, 0);

/** One piece of jewelry at a spot, as a group in model space. */
function piece(spot: PiercingSpot, style: PiercingStyle, at: Anchor) {
  const metal = metalOf(style);
  const ring = style.endsWith("ring");
  const g = new THREE.Group();
  g.position.copy(at.p).addScaledVector(at.n, 0.0008);
  if (spot === "brow") {
    // a vertical bar: a bead above and below the brow tail
    const up = new THREE.Mesh(STUD, metal);
    const down = new THREE.Mesh(STUD, metal);
    up.position.y = 0.004;
    down.position.y = -0.004;
    g.add(up, down);
    return g;
  }
  if (!ring) {
    g.add(
      new THREE.Mesh(
        spot === "navel" ? GEM : STUD,
        spot === "navel" ? GEMSTONE : metal,
      ),
    );
    return g;
  }
  // a ring hangs from the spot, its plane facing sideways like a real hoop
  const hoop = new THREE.Mesh(spot === "navel" ? NAVEL_RING : RING, metal);
  hoop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), X);
  const r = spot === "navel" ? 0.007 : 0.0045;
  hoop.position.set(0, -r * 0.75, 0).addScaledVector(at.n, r * 0.35);
  g.add(hoop);
  if (spot === "navel") {
    const gem = new THREE.Mesh(GEM, GEMSTONE);
    gem.position.set(0, -r * 1.75, 0).addScaledVector(at.n, r * 0.35);
    g.add(gem);
  }
  return g;
}

/**
 * The doll's piercings, parented to her head and body bones so they move
 * with every pose.
 */
export function Jewelry({
  piercings,
  anchors,
  bones,
  restInverse,
}: {
  piercings: Piercings;
  anchors: Anchors;
  bones: Map<string, THREE.Bone>;
  restInverse: Map<string, THREE.Matrix4>;
}) {
  const pieces = useMemo(() => {
    const out: { group: THREE.Group; bone: THREE.Bone }[] = [];
    for (const [spot, style] of Object.entries(piercings) as [
      PiercingSpot,
      PiercingStyle,
    ][]) {
      const at = anchors[spot];
      const bone = bones.get(SPOT_BONE[spot]);
      const inv = restInverse.get(SPOT_BONE[spot]);
      if (style === "none" || !at || !bone || !inv) continue;
      const group = piece(spot, style, at);
      group.applyMatrix4(inv);
      out.push({ group, bone });
    }
    return out;
  }, [piercings, anchors, bones, restInverse]);

  useEffect(() => {
    for (const { group, bone } of pieces) bone.add(group);
    return () => {
      for (const { group, bone } of pieces) bone.remove(group);
    };
  }, [pieces]);
  return null;
}
