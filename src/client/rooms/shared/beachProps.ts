// The beach props cut from Jef Belmans' diorama (CC-BY, art/beach/build_diorama.py):
// a sun bed, beach umbrellas in three palettes and a draped towel, each one
// vertex-colored mesh standing on y = 0 (bed and umbrella at their own feet,
// the bed's raised back toward -z). The Water Park deck and the hotel rooftop
// share them.

import { useGLTF } from "@react-three/drei";
import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { bakedGeometry } from "../../world/bakedGeometry.ts";

/** `name` as plain floats, `size` per vertex: the optimized GLBs store UVs and colors normalized. */
function asFloats(g: THREE.BufferGeometry, name: string, size: 2 | 3) {
  const a = g.getAttribute(name);
  if (!a) return;
  const out = new Float32Array(a.count * size);
  for (let i = 0; i < a.count; i++) {
    out[i * size] = a.getX(i);
    out[i * size + 1] = a.getY(i);
    if (size === 3) out[i * size + 2] = a.getZ(i);
  }
  g.setAttribute(name, new THREE.BufferAttribute(out, size));
}

export const BEACH_PROPS = [
  "sunbed",
  "umbrella-pink",
  "umbrella-sky",
  "umbrella-mint",
  "towel-draped",
] as const;
export type BeachProp = (typeof BEACH_PROPS)[number];

/** The seat of the sun bed: 1.9 m long, 0.7 m wide, its cushion line 0.26 m up. */
export const SUNBED = { length: 1.9, width: 0.7, seat: 0.26 } as const;

/** The geometry of one loaded prop: its one mesh, node transform baked in. */
export type BeachGeometry = (name: BeachProp) => THREE.BufferGeometry;

/** Loads the named props, suspending meanwhile. */
export function useBeachProps(names: readonly BeachProp[]): BeachGeometry {
  const gltfs = useGLTF(names.map((n) => `/models/beach/${n}.glb`));
  const found = useMemo(() => {
    const out = new Map<BeachProp, THREE.BufferGeometry>();
    names.forEach((name, i) => {
      const scene = gltfs[i]?.scene;
      scene?.updateMatrixWorld(true);
      scene?.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || out.has(name)) return;
        const g = bakedGeometry(o);
        asFloats(g, "uv", 2);
        asFloats(g, "color", 3);
        out.set(name, g);
      });
    });
    return out;
  }, [gltfs, names]);
  return useCallback(
    (name) => {
      const geometry = found.get(name);
      if (!geometry)
        throw new Error(`beach/${name}.glb was not loaded or has no mesh`);
      return geometry;
    },
    [found],
  );
}
