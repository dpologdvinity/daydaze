import { useMemo } from "react";
import * as THREE from "three";
import { MARQUEE, Neon, NeonText } from "./Neon.tsx";

const RADIUS = 1.5;
const SPRING = 3.2;

// A round arch from the ground on the left, over the top, down to the ground on the right.
function archPoints(scale: number): THREE.Vector3[] {
  const r = RADIUS * scale;
  const points = [new THREE.Vector3(-r, 0, 0)];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    points.push(
      new THREE.Vector3(Math.cos(a) * r, SPRING + Math.sin(a) * r, 0),
    );
  }
  points.push(new THREE.Vector3(r, 0, 0));
  return points;
}

/** A lit carnival arch with a neon sign over it. The arch faces +z. */
export function Arch({
  sign,
  position,
  width = 3.8,
  color = "#ffb02e",
  accent = "#ff2f9a",
}: {
  sign: string;
  position: [number, number, number];
  width?: number;
  color?: string;
  accent?: string;
}) {
  const outer = useMemo(() => archPoints(1), []);
  const inner = useMemo(() => archPoints(0.78), []);
  return (
    <group position={position}>
      <Neon points={outer} color={color} k={4} radius={0.035} />
      <Neon points={inner} color={accent} k={3.5} radius={0.025} />
      <NeonText
        text={sign}
        color={accent}
        font={MARQUEE}
        width={width}
        position={[0, SPRING + RADIUS + 0.75, 0]}
        flicker
      />
    </group>
  );
}
