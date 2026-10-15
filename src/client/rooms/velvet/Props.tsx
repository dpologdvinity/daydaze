import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { lathe } from "../../avatar/dollGeometry.ts";
import { GLASS } from "./materials.ts";

// Same profiles as shared/Cocktail.tsx, kept here so every glass is instanced.
const GLASS_GEO = lathe(
  [
    [0, 0.05],
    [0.01, 0.05],
    [0.012, 0.008],
    [0.09, 0.006],
    [0.11, 0.03],
    [0.17, 0.05],
    [0.24, 0.042],
    [0.3, 0.056],
  ],
  24,
);
const DRINK_GEO = lathe(
  [
    [0.1, 0],
    [0.11, 0.026],
    [0.17, 0.045],
    [0.24, 0.037],
    [0.27, 0.044],
    [0.27, 0],
  ],
  24,
);

export type Cocktail = {
  position: [number, number, number];
  color: string;
  scale?: number;
};

/**
 * Cocktail glasses with their drinks. Two draw calls for any number of
 * glasses: one instanced glass, one instanced drink tinted per glass.
 */
export function Cocktails({ items }: { items: readonly Cocktail[] }) {
  const glass = useRef<THREE.InstancedMesh>(null);
  const drink = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.position);
      o.scale.setScalar(it.scale ?? 1);
      o.updateMatrix();
      glass.current?.setMatrixAt(i, o.matrix);
      drink.current?.setMatrixAt(i, o.matrix);
      drink.current?.setColorAt(i, c.set(it.color).multiplyScalar(1.8));
    });
    if (glass.current) glass.current.instanceMatrix.needsUpdate = true;
    if (drink.current) {
      drink.current.instanceMatrix.needsUpdate = true;
      if (drink.current.instanceColor)
        drink.current.instanceColor.needsUpdate = true;
    }
  }, [items]);
  return (
    <>
      <instancedMesh
        ref={glass}
        args={[GLASS_GEO, GLASS, items.length]}
      />
      <instancedMesh ref={drink} args={[DRINK_GEO, undefined, items.length]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}
