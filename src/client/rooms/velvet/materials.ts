import * as THREE from "three";
import { hdr, neonMat } from "../shared/materials.ts";

// Module-level so every piece that uses one of these batches into one mesh.

export const VELVET = new THREE.MeshPhysicalMaterial({
  color: "#5c0b3f",
  sheen: 1,
  sheenColor: new THREE.Color("#ff6ac8"),
  sheenRoughness: 0.35,
  roughness: 0.65,
});

export const PLUM_VELVET = new THREE.MeshPhysicalMaterial({
  color: "#2a0a4a",
  sheen: 1,
  sheenColor: new THREE.Color("#c77dff"),
  sheenRoughness: 0.3,
  roughness: 0.7,
  side: THREE.DoubleSide,
});

export const ROSE_VELVET = new THREE.MeshPhysicalMaterial({
  color: "#3a0a2e",
  sheen: 1,
  sheenColor: new THREE.Color("#ff7ad0"),
  sheenRoughness: 0.3,
  roughness: 0.7,
  side: THREE.DoubleSide,
});

export const MIRROR = new THREE.MeshStandardMaterial({
  color: "#2a1a30",
  metalness: 1,
  roughness: 0.12,
});

export const GLASS = new THREE.MeshStandardMaterial({
  color: "#ffe8f5",
  metalness: 0.1,
  roughness: 0.02,
  transparent: true,
  opacity: 0.3,
  envMapIntensity: 2,
});

export const FOLIAGE = new THREE.MeshStandardMaterial({
  color: "#1f6b4a",
  roughness: 0.6,
  metalness: 0,
});

export const TERRACOTTA = new THREE.MeshStandardMaterial({
  color: "#6b2a3a",
  roughness: 0.55,
  metalness: 0.1,
});

export const NEON_PINK = neonMat("#ff2f9a", 2.2);
export const NEON_VIOLET = neonMat("#b14dff", 3);
export const NEON_AMBER = neonMat("#ffb02e", 4);
export const NEON_WARM = neonMat("#ffd6a0", 3);

/** Warm glow for the back-bar behind the bottles. */
export const BOTTLE_LIGHT = hdr("#ff8a30", 1.5);
