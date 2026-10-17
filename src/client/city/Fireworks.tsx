import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { playFireworkBoom } from "../../audio/worldSounds.ts";
import {
  BURN,
  RISE,
  SHELL_COLORS,
  shellsAt,
  showOn,
  type Shell,
} from "../../game/city/fireworks.ts";
import { useReducedMotion } from "../motion.ts";
import { showClock } from "./fireworksClock.ts";

const SLOTS = 12;
const STARS = 72;
/** Per slot: the rising comet, then its stars. */
const PER = STARS + 1;

/** Star directions on a sphere (golden spiral), and round a ring. */
const SPHERE = Array.from({ length: STARS }, (_, i) => {
  const y = 1 - ((i + 0.5) / STARS) * 2;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.39996;
  return [Math.cos(a) * r, y, Math.sin(a) * r] as const;
});
const RING = Array.from({ length: STARS }, (_, i) => {
  const a = (i / STARS) * Math.PI * 2;
  return [Math.cos(a), Math.sin(a) * 0.9, Math.sin(a) * 0.3] as const;
});
const PALETTE = SHELL_COLORS.map((c) => new THREE.Color(c));

/** A soft round star: white at the heart, fading to black, which additive
 * blending turns clear. */
function starTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.3, "#bbbbbb");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new THREE.CanvasTexture(c);
}

/**
 * The fireworks show over the sea off Beachside: every few minutes, shells
 * climb from the water and burst into peonies, rings and drooping willows,
 * with a finale three at a time. One points draw, additive, no lights.
 * Booms reach the shore, fading with distance. Off under reduced motion.
 */
export function Fireworks() {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const points = useRef<THREE.Points>(null);
  const shells = useRef<Shell[]>([]);
  const boomed = useRef(-1);
  const at = useMemo(() => new THREE.Vector3(), []);
  const star = useMemo(starTexture, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SLOTS * PER * 3), 3),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(SLOTS * PER * 3), 3),
    );
    // the stars move far from where the geometry starts
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }, []);
  useFrame(() => {
    const p = points.current;
    if (!p) return;
    const t = showClock();
    // the last shells burn on a little after the show stops launching
    p.visible = !calm && (showOn(t) || showOn(t - RISE - BURN));
    if (!p.visible) return;
    const list = shellsAt(t, shells.current);
    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    const pa = pos.array;
    const ca = col.array;
    if (!(pa instanceof Float32Array) || !(ca instanceof Float32Array)) return;
    ca.fill(0);
    let loudest = 0;
    for (let s = 0; s < Math.min(SLOTS, list.length); s++) {
      const sh = list[s];
      const base = s * PER * 3;
      const c = PALETTE[sh.color];
      if (sh.age < RISE) {
        // the comet climbing, easing as it nears the top
        const f = sh.age / RISE;
        pa[base] = sh.x;
        pa[base + 1] = sh.height * (1 - (1 - f) * (1 - f));
        pa[base + 2] = sh.z;
        ca[base] = 1;
        ca[base + 1] = 0.85;
        ca[base + 2] = 0.6;
        continue;
      }
      if (sh.id > boomed.current) {
        boomed.current = sh.id;
        const d = camera.position.distanceTo(at.set(sh.x, sh.height, sh.z));
        loudest = Math.max(loudest, 1 - d / 520);
      }
      const b = (sh.age - RISE) / BURN;
      const spread = sh.size * (1 - Math.pow(1 - Math.min(1, b * 1.6), 3));
      const droop = (sh.kind === "willow" ? 22 : 9) * b * b;
      const fade = Math.pow(1 - b, 1.4) * (sh.kind === "willow" ? 1.6 : 2.2);
      const dirs = sh.kind === "ring" ? RING : SPHERE;
      for (let i = 0; i < STARS; i++) {
        const k = base + (i + 1) * 3;
        const [dx, dy, dz] = dirs[i];
        pa[k] = sh.x + dx * spread;
        pa[k + 1] = sh.height + dy * spread - droop;
        pa[k + 2] = sh.z + dz * spread;
        // stars twinkle out at the end
        const tw = b > 0.7 && (i * 7 + Math.floor(t * 20)) % 3 === 0 ? 0.3 : 1;
        ca[k] = c.r * fade * tw;
        ca[k + 1] = c.g * fade * tw;
        ca[k + 2] = c.b * fade * tw;
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    if (loudest > 0.05) playFireworkBoom(loudest);
  });
  return (
    <points ref={points} geometry={geo} frustumCulled={false} visible={false}>
      <pointsMaterial
        size={4}
        map={star}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
        toneMapped={false}
      />
    </points>
  );
}
