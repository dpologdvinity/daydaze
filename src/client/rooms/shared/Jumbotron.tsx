import { useEffect, useMemo, type ReactNode } from "react";
import { canvasTex } from "./materials.ts";

/**
 * A big screen: a dark frame and a glowing face showing a title and up to
 * three lines (a score, a clock), redrawn only when they change.
 */
export function Jumbotron({
  title,
  lines,
  accent,
  width = 4,
  children,
  ...rest
}: {
  title: string;
  lines: readonly string[];
  accent: string;
  width?: number;
  children?: ReactNode;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
}) {
  const tex = useMemo(() => canvasTex(512, 256, () => undefined), []);
  const key = `${title}|${lines.join("|")}`;
  useEffect(() => {
    const canvas = tex.image;
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#06040e";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 244);
    ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.font = "800 40px sans-serif";
    ctx.fillText(title, 256, 56);
    ctx.fillStyle = "#ffffff";
    lines.slice(0, 3).forEach((line, i) => {
      ctx.font = i === 0 ? "800 64px sans-serif" : "700 34px sans-serif";
      ctx.fillText(line, 256, 132 + i * 52);
    });
    tex.needsUpdate = true;
  }, [key, tex, title, lines, accent]);
  const height = width / 2;
  return (
    <group
      position={rest.position ? [...rest.position] : undefined}
      rotation={rest.rotation ? [...rest.rotation] : undefined}
    >
      <mesh position-z={-0.06}>
        <boxGeometry args={[width + 0.25, height + 0.25, 0.1]} />
        <meshStandardMaterial color="#0a0814" roughness={0.5} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {children}
    </group>
  );
}
