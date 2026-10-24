// Instanced particle bursts for the in-world games: one draw call per
// effect, seeded per shot, sampled from src/game/motion/particles.ts. `Burst`
// is the glowing light burst (a target hit, a perfect note); `Splash.tsx`
// builds water and sand on the same base.

import { useFrame } from "@react-three/fiber";
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref,
} from "react";
import * as THREE from "three";
import {
  burst,
  particleAt,
  type Burst as BurstData,
  type BurstSpec,
  type Vec3,
} from "../../../../game/motion/particles.ts";
import { useReducedMotion } from "../../../motion.ts";

/** Fires a burst at a point in the room. */
export type BurstHandle = {
  /** Starts a burst at `x, y, z`, scaled by `size` (1 normal). */
  fire(x: number, y: number, z: number, size?: number): void;
};

const p: Vec3 = [0, 0, 0];
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const s = new THREE.Vector3();

/**
 * A pool of `count` particles that `fire()` sends out from a point. A new
 * burst restarts the pool. Under reduced motion the particles don't fly,
 * they just glow in place and fade.
 */
export function ParticleBurst({
  ref,
  count,
  spec,
  color,
  glow = 1,
  size = 0.06,
  additive = false,
}: {
  ref?: Ref<BurstHandle>;
  count: number;
  spec: BurstSpec;
  color: string;
  /** Emissive strength; above 1 blooms on the high tier. */
  glow?: number;
  /** Particle radius, meters. */
  size?: number;
  additive?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const calm = useReducedMotion();
  const shot = useRef<{
    data: BurstData;
    from: Vec3;
    scale: number;
    t: number;
  } | null>(null);
  const seed = useRef(1);
  const pool = useMemo(
    () => Array.from({ length: 4 }, (_, i) => burst(i + 1, count, spec)),
    [count, spec],
  );
  useImperativeHandle(
    ref,
    () => ({
      fire(x, y, z, scale = 1) {
        // a few seeded variations, cycled, so bursts differ without allocating
        const data = pool[seed.current++ % pool.length];
        if (data) shot.current = { data, from: [x, y, z], scale, t: 0 };
      },
    }),
    [pool],
  );
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: glow,
        transparent: true,
        depthWrite: false,
        roughness: 0.3,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    [color, glow, additive],
  );
  // R3F doesn't dispose objects passed through `args`
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    const im = mesh.current;
    const b = shot.current;
    if (!im) return;
    if (!b) {
      im.visible = false;
      return;
    }
    b.t += dt;
    if (b.t >= b.data.lifetime) {
      // done: hide and stop touching the matrices until the next fire()
      shot.current = null;
      im.visible = false;
      return;
    }
    im.visible = true;
    let fade = 0;
    const parts = b.data.particles;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const alpha = particleAt(b.data, part, calm ? 0 : b.t, p);
      const a = calm ? Math.max(0, 1 - b.t / part.life) : alpha;
      fade = Math.max(fade, a);
      v.set(
        b.from[0] + p[0] * b.scale,
        b.from[1] + p[1] * b.scale,
        b.from[2] + p[2] * b.scale,
      );
      const r = a > 0 ? size * b.scale * (0.4 + 0.6 * a) : 0;
      s.set(r, r, r);
      m.compose(v, q, s);
      im.setMatrixAt(i, m);
    }
    material.opacity = Math.min(1, fade * 1.4);
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, material, count]}
      frustumCulled={false}
      visible={false}
    >
      <icosahedronGeometry args={[1, 0]} />
    </instancedMesh>
  );
}

const LIGHT: BurstSpec = { speed: 3.2, lifetime: 0.7, up: 0.4, gravity: 1.5 };

/** A glowing burst of light (a hit, a perfect note). */
export function Burst({
  ref,
  color = "#7ff6ff",
}: {
  ref?: Ref<BurstHandle>;
  color?: string;
}) {
  return (
    <ParticleBurst
      ref={ref}
      count={24}
      spec={LIGHT}
      color={color}
      glow={2.4}
      size={0.045}
      additive
    />
  );
}
