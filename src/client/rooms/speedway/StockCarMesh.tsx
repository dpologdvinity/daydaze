// A stock car from Quaternius Realistic Car Pack: glTF model repainted with
// canvas livery texture (numbers, racing stripes, sponsor logos). Nose points
// down +z to match physics.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";
import { useCanvasTexture } from "./canvasTextures.ts";
import {
  STOCK_LIVERIES,
  stockCarPaint,
  type StockLivery,
} from "./stockCarArt.ts";

const CAR_MODELS = [
  "/models/speedway/stock-car-1.glb",
  "/models/speedway/stock-car-2.glb",
  "/models/speedway/stock-car-3.glb",
  "/models/speedway/stock-car-4.glb",
];

// Preload all 4 stock car models
for (const url of CAR_MODELS) {
  useGLTF.preload(url);
}

export function StockCarMesh({
  index,
  livery,
  ref,
  visible = false,
}: {
  index: number;
  livery?: StockLivery;
  ref?: Ref<THREE.Group>;
  visible?: boolean;
}) {
  const modelUrl = CAR_MODELS[index % CAR_MODELS.length];
  const { scene } = useGLTF(modelUrl);
  const liv = livery ?? STOCK_LIVERIES[index % STOCK_LIVERIES.length];

  const texture = useCanvasTexture(
    `stock-car:${index}:${liv.number}:${liv.primary}:${liv.sponsor}`,
    512,
    512,
    stockCarPaint(liv),
  );

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.35,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
  }, [texture]);

  useEffect(() => () => material.dispose(), [material]);

  // Clone geometry once per model
  const carObject = useMemo(() => {
    const root = new THREE.Group();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const copy = new THREE.Mesh(child.geometry, material);
        copy.castShadow = false;
        copy.receiveShadow = false;
        root.add(copy);
      }
    });
    return root;
  }, [scene, material]);

  return (
    <group ref={ref} visible={visible}>
      <primitive object={carObject} />
    </group>
  );
}
