import { useEffect, useMemo, type Ref } from "react";
import type { Group } from "three";
import { MeshPhysicalMaterial } from "three";
import type { CarSpec } from "../../../game/driving/car.ts";
import { carParts, GLASS, LIGHT, RIM, TRIM, TYRE } from "./carModels.ts";

/**
 * A low-poly car in its class's silhouette: painted shell, glass, trim, tyres,
 * rims and lamps. Nose points down +z, so yaw matches the physics. Starts hidden.
 * Each model is a handful of merged meshes, so a car costs about six draw calls.
 */
export function CarMesh({
  spec,
  color,
  ref,
}: {
  spec: CarSpec;
  color: string;
  ref?: Ref<Group>;
}) {
  const parts = carParts(spec);
  // Clearcoat lacquer on the paint, the only per-car material.
  const paint = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color,
        roughness: 0.38,
        metalness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
    [color],
  );
  useEffect(() => () => paint.dispose(), [paint]);
  return (
    <group ref={ref} visible={false}>
      {parts.paint && <mesh geometry={parts.paint} material={paint} />}
      {parts.glass && <mesh geometry={parts.glass} material={GLASS} />}
      {parts.trim && <mesh geometry={parts.trim} material={TRIM} />}
      {parts.tyre && <mesh geometry={parts.tyre} material={TYRE} />}
      {parts.rim && <mesh geometry={parts.rim} material={RIM} />}
      {parts.light && <mesh geometry={parts.light} material={LIGHT} />}
    </group>
  );
}
