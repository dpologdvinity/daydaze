// The four singing shells at Mermaid Cove's waterline, Siren Song's notes:
// a downloaded scallop, conch, clam and spiral (art/cove/build_shells.py,
// credited in docs/assets.md), each tinted its note's color, glowing with a
// pool of light on the sand when its note plays. Reduced motion keeps them
// still but still lights them.
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SHELL_SPOTS } from "../../../game/mermaidCove.ts";
import { useReducedMotion } from "../../motion.ts";
import { SHELL_COLORS, siren } from "./session.ts";

const URL = "/models/cove/shells.glb";
/** The shell for each note, pink to violet, left to right. */
const KINDS = ["scallop", "conch", "clam", "spiral"] as const;
/** A little turn each, so the row looks washed up rather than set out. */
const TURNS = [0.25, -0.35, 0.1, -0.2];
const IDLE_GLOW = 0.35;
const LIT_GLOW = 2.6;

/** A soft white spot fading to nothing at the edge, for the pools of light. */
function haloTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

export function Shells() {
  const calm = useReducedMotion();
  const { nodes } = useGLTF(URL);
  const parts = useMemo(() => {
    const halo = haloTexture();
    return {
      halo,
      shells: KINDS.map((kind, i) => {
        const node = nodes[kind];
        const color = SHELL_COLORS[i] ?? "#ffffff";
        if (!(node instanceof THREE.Mesh)) return null;
        const source = node.material;
        return {
          node,
          // the build makes the texture pale gray, so the tint is the note
          shell: new THREE.MeshStandardMaterial({
            map:
              source instanceof THREE.MeshStandardMaterial ? source.map : null,
            color,
            emissive: color,
            emissiveIntensity: IDLE_GLOW,
            roughness: 0.4,
          }),
          pool: new THREE.MeshBasicMaterial({
            map: halo,
            color,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
        };
      }),
    };
  }, [nodes]);
  useEffect(
    () => () => {
      parts.halo.dispose();
      for (const p of parts.shells) {
        p?.shell.dispose();
        p?.pool.dispose();
      }
    },
    [parts],
  );
  const groups = useRef<(THREE.Group | null)[]>([]);
  // each shell's glow, easing toward 1 while its note plays
  const glow = useRef([0, 0, 0, 0]);
  useFrame(({ clock }, dt) => {
    const { lit } = siren.get();
    const ease = calm ? 1 : 1 - Math.exp(-dt * 14);
    parts.shells.forEach((p, i) => {
      if (!p) return;
      const g =
        (glow.current[i] ?? 0) +
        ((lit === i ? 1 : 0) - (glow.current[i] ?? 0)) * ease;
      glow.current[i] = g;
      p.shell.emissiveIntensity = IDLE_GLOW + (LIT_GLOW - IDLE_GLOW) * g;
      p.pool.opacity = 0.18 + 0.72 * g;
      const group = groups.current[i];
      if (group)
        group.scale.setScalar(
          1 +
            0.18 * g +
            (calm ? 0 : Math.sin(clock.elapsedTime * 2 + i) * 0.02),
        );
    });
  });
  return (
    <>
      {SHELL_SPOTS.map(([x, z], i) => {
        const p = parts.shells[i];
        if (!p) return null;
        return (
          <group
            key={i}
            ref={(g) => {
              groups.current[i] = g;
            }}
            position={[x, 0.02, z]}
            rotation-y={TURNS[i] ?? 0}
          >
            <mesh
              geometry={p.node.geometry}
              position={p.node.position}
              scale={p.node.scale}
              material={p.shell}
            />
            <mesh rotation-x={-Math.PI / 2} position-y={0.01} material={p.pool}>
              <planeGeometry args={[1.9, 1.9]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
