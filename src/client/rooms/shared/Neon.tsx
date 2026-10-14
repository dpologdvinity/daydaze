import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { canvasTex, hdr, neonMat } from "./materials.ts";

export const SCRIPT =
  "italic 700 200px 'Z003', 'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive";
export const DECO =
  "700 170px 'Didot', 'Bodoni 72', 'TeX Gyre Bonum', 'URW Bookman', Georgia, serif";
export const MARQUEE =
  "800 150px 'Futura', 'Century Gothic', 'URW Gothic', 'TeX Gyre Adventor', sans-serif";

/** A glowing tube through `points`. */
export function Neon({
  points,
  color,
  k = 4,
  radius = 0.022,
  closed = false,
}: {
  points: THREE.Vector3[];
  color: string;
  k?: number;
  radius?: number;
  closed?: boolean;
}) {
  const geo = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points, closed, "centripetal"),
        points.length * 12,
        radius,
        8,
        closed,
      ),
    [points, closed, radius],
  );
  const mat = useMemo(() => neonMat(color, k), [color, k]);
  return <mesh geometry={geo} material={mat} />;
}

/** Neon lettering: a stroked canvas texture drawn additively. */
export function NeonText({
  text,
  color,
  font,
  width,
  k = 3.2,
  flicker = false,
  ...rest
}: {
  text: string;
  color: string;
  font: string;
  width: number;
  k?: number;
  /** Occasional tube stutter. Off under reduced motion. */
  flicker?: boolean;
} & Omit<ThreeElements["mesh"], "children">) {
  const tex = useMemo(
    () =>
      canvasTex(1024, 320, (ctx) => {
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 16;
        ctx.strokeText(text, 512, 170, 980);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 7;
        ctx.strokeText(text, 512, 170, 980);
      }),
    [text, font],
  );
  const base = useMemo(() => hdr(color, k), [color, k]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (!flicker || !mat.current) return;
    const t = clock.elapsedTime;
    // two quick dips every few seconds, like a tired transformer
    const phase = (t + text.length * 0.7) % 4.3;
    const dip = !calm && (phase < 0.06 || (phase > 0.14 && phase < 0.2));
    mat.current.color.copy(base).multiplyScalar(dip ? 0.25 : 1);
  });
  return (
    <mesh {...rest}>
      <planeGeometry args={[width, (width * 320) / 1024]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        color={base}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** A round neon sign with an optional script caption below it. */
export function RingNeon({
  caption,
  ...props
}: { caption?: string } & Omit<ThreeElements["group"], "children">) {
  const ring = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0));
    }
    return pts;
  }, []);
  return (
    <group {...props}>
      <Neon points={ring} color="#ff9a1f" k={4.5} radius={0.028} closed />
      {caption && (
        <NeonText
          text={caption}
          color="#ff4fb3"
          font={SCRIPT}
          width={2.4}
          position={[0, -0.95, 0]}
        />
      )}
    </group>
  );
}
