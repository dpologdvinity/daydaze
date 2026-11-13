// The Uptown Aquarium's light: a dim hall made of water you can see into.
// Caustics ripple across the tank floor and the aisle, light shafts fall
// through the water, pools of blue spill onto the hall's floor, and cyan rims
// trace the tank's edges. All of it is emissive and additive, so it costs
// draw calls (a dozen or so) but no real lights.

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { hdr } from "../shared/materials.ts";

const SIZE = 128;

/** A tileable caustic network (Dave Hoskins' "tileable water caustic", one
 * frozen frame) as a white-on-black texture: bright where the light bunches. */
function causticTexture(): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const TAU = Math.PI * 2;
  const t = 1.4;
  const inten = 0.005;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const px = ((x / SIZE) * TAU) % TAU;
      const py = ((y / SIZE) * TAU) % TAU;
      const cx = px - 250;
      const cy = py - 250;
      let ix = cx;
      let iy = cy;
      let c = 1;
      for (let n = 0; n < 5; n++) {
        const tn = t * (1 - 3.5 / (n + 1));
        const nx = cx + Math.cos(tn - ix) + Math.sin(tn + iy);
        const ny = cy + Math.sin(tn - iy) + Math.cos(tn + ix);
        ix = nx;
        iy = ny;
        c +=
          1 /
          Math.hypot(
            cx / (Math.sin(ix + tn) / inten),
            cy / (Math.cos(iy + tn) / inten),
          );
      }
      c /= 5;
      c = 1.17 - Math.pow(c, 1.4);
      const v = Math.min(1, Math.pow(Math.abs(c), 8)) * 255;
      const i = (y * SIZE + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** A soft round glow, white in the middle and clear at the rim. */
function glowTexture(): THREE.DataTexture {
  const S = 64;
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot((x + 0.5) / S - 0.5, (y + 0.5) / S - 0.5) * 2;
      const v = Math.max(0, 1 - d) ** 2 * 255;
      const i = (y * S + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const additive = (map: THREE.Texture, color: string, k: number) =>
  new THREE.MeshBasicMaterial({
    map,
    color: hdr(color, k),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

/** Two layers of caustics drifting past each other over the tank floor and the
 * aisle beneath the glass tunnel. `zc` is the tank's middle, `depth` its length. */
export function Caustics({ zc, depth }: { zc: number; depth: number }) {
  const calm = useReducedMotion();
  const layers = useMemo(() => {
    const a = causticTexture();
    const b = a.clone();
    b.needsUpdate = true;
    a.repeat.set(4.5, 2.6);
    b.repeat.set(3.1, 1.8);
    return [
      { tex: a, material: additive(a, "#7fe3ff", 1.5), drift: [0.012, 0.007] },
      { tex: b, material: additive(b, "#b9f2ff", 1.1), drift: [-0.008, 0.011] },
    ] as const;
  }, []);
  useFrame(({ clock }) => {
    const t = calm ? 0 : clock.elapsedTime;
    for (const l of layers) l.tex.offset.set(t * l.drift[0], t * l.drift[1]);
  });
  return (
    <>
      {layers.map((l, i) => (
        <mesh
          key={i}
          position={[0, 0.03 + i * 0.005, zc]}
          rotation-x={-Math.PI / 2}
          material={l.material}
        >
          <planeGeometry args={[15.4, depth]} />
        </mesh>
      ))}
    </>
  );
}

/** Pale cones of light falling through the water from the tank's lid. */
export function LightShafts({ zc }: { zc: number }) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: hdr("#8fdcff", 1),
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const cone = useMemo(() => new THREE.ConeGeometry(1.5, 5.8, 20, 1, true), []);
  const spots: readonly [number, number][] = [
    [-5.2, -2],
    [-2.4, 1.2],
    [2.2, -1.5],
    [5.2, 1],
    [0, -5],
  ];
  return (
    <>
      {spots.map(([x, dz], i) => (
        <mesh
          key={i}
          geometry={cone}
          material={material}
          position={[x, 2.95, zc + dz]}
          rotation-z={(i % 2 ? 1 : -1) * 0.05}
        />
      ))}
    </>
  );
}

/** Blue light spilled onto the hall's floor in front of the tank and round the
 * touch pool, and a cyan rim along the tank's lid and the tunnel's mouths. */
export function HallLight({ zc, depth }: { zc: number; depth: number }) {
  const glow = useMemo(() => glowTexture(), []);
  const pool = useMemo(() => additive(glow, "#3fc8ff", 0.9), [glow]);
  const rim = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: hdr("#58e6ff", 2.4),
        toneMapped: false,
      }),
    [],
  );
  const pools: readonly [number, number, number][] = [
    [-5.4, 3.6, 3.4],
    [-1.8, 4.1, 3.6],
    [1.8, 4.1, 3.6],
    [5.4, 3.6, 3.4],
    [-3.6, 4.4, 3.4],
  ];
  const front = zc + depth / 2 + 0.2;
  return (
    <>
      {pools.map(([x, z, r], i) => (
        <mesh
          key={i}
          position={[x, 0.025, z]}
          rotation-x={-Math.PI / 2}
          material={pool}
        >
          <planeGeometry args={[r * 2, r * 2]} />
        </mesh>
      ))}
      {/* the lid's front and side edges */}
      <mesh position={[0, 5.98, front]} material={rim}>
        <boxGeometry args={[15.8, 0.07, 0.07]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 7.85, 5.98, zc]} material={rim}>
          <boxGeometry args={[0.07, 0.07, depth + 0.4]} />
        </mesh>
      ))}
      {/* the tunnel's mouths, rings of light over the aisle */}
      {[zc - depth / 2 + 1, zc + depth / 2 - 1].map((z, i) => (
        <mesh key={i} position={[0, 0, z]} rotation-z={0} material={rim}>
          <torusGeometry args={[3.2, 0.05, 6, 32, Math.PI]} />
        </mesh>
      ))}
    </>
  );
}
