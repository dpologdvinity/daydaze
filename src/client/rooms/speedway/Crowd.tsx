// Instanced low-poly crowd filling the Speedway grandstands, using Kenney's
// Mini Characters spectator model. Rendered as a single InstancedMesh draw call.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { seeded } from "./canvasTextures.ts";

const SPECTATOR_URL = "/models/speedway/spectator.glb";
useGLTF.preload(SPECTATOR_URL);

const ROWS = 6;
const COLS = 26;
const FAN_COLORS = [
  new THREE.Color("#ff3b30"),
  new THREE.Color("#007aff"),
  new THREE.Color("#ffcc00"),
  new THREE.Color("#34c759"),
  new THREE.Color("#ff9500"),
  new THREE.Color("#af52de"),
  new THREE.Color("#5ac8fa"),
  new THREE.Color("#ffffff"),
];

export function Crowd({
  origin = [0, -23],
}: {
  origin?: readonly [number, number];
}) {
  const { scene } = useGLTF(SPECTATOR_URL);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Extract geometry and material from the spectator GLB
  const { geometry, material } = useMemo(() => {
    let geom: THREE.BufferGeometry | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !geom) {
        geom = child.geometry;
      }
    });
    // Fallback if not found
    geom ??= new THREE.BoxGeometry(0.4, 0.9, 0.4);
    // Use standard material with vertex colors/instance colors enabled
    const instanceMat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
    });
    return { geometry: geom, material: instanceMat };
  }, [scene]);
  useEffect(() => () => material.dispose(), [material]);

  const totalFans = ROWS * COLS;

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    const rand = seeded(42);

    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      const y = r * 0.9 + 0.85;
      const z = -r * 1.1 + 0.15;
      for (let c = 0; c < COLS; c++) {
        // Skip occasional seat to look natural
        if (rand() < 0.08) continue;

        const x = -21 + (c / (COLS - 1)) * 42 + (rand() - 0.5) * 0.2;
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(0.7 + rand() * 0.08);
        // Face forward toward the track (-z)
        dummy.rotation.set(0, Math.PI + (rand() - 0.5) * 0.3, 0);
        dummy.updateMatrix();

        mesh.setMatrixAt(idx, dummy.matrix);
        const col = FAN_COLORS[Math.floor(rand() * FAN_COLORS.length)];
        mesh.setColorAt(idx, col);
        idx++;
      }
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [totalFans]);

  return (
    <group position={[origin[0], 0, origin[1]]}>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, totalFans]}
        frustumCulled={false}
      />
    </group>
  );
}
