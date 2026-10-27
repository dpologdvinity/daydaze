// Infield for the Speedway oval: manicured infield grass lawn with mowing stripes
// and trackside sponsor billboards from Kenney.

import type * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useCanvasTexture } from "./canvasTextures.ts";
import { SPONSORS, sponsorBannerPaint } from "./sponsorArt.ts";

const BILLBOARD_URL = "/models/speedway/billboard.glb";
useGLTF.preload(BILLBOARD_URL);

function InfieldBillboard({
  sponsor,
  pos,
  rot,
  model,
}: {
  sponsor: (typeof SPONSORS)[number];
  pos: readonly [number, number, number];
  rot: number;
  model: THREE.Group;
}) {
  const tex = useCanvasTexture(
    `infield-bb:${sponsor.name}`,
    256,
    96,
    sponsorBannerPaint(sponsor),
  );
  return (
    <group position={pos as [number, number, number]} rotation-y={rot}>
      <primitive
        object={model.clone(true)}
        scale={[3, 3, 3]}
        position={[0, 0, 0]}
      />
      <mesh position={[0, 3.6, 0.15]}>
        <planeGeometry args={[7.2, 2.8]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Infield({
  origin = [0, -84],
}: {
  origin?: readonly [number, number];
}) {
  const { scene: billboardScene } = useGLTF(BILLBOARD_URL);

  // Mowed grass pattern texture
  const grassTex = useCanvasTexture(
    "infield-grass",
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#1e4d28";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#255c32";
      const stripe = w / 8;
      for (let x = 0; x < w; x += stripe * 2) {
        ctx.fillRect(x, 0, stripe, h);
      }
    },
    true,
  );

  // Billboards positioned facing the grandstand and turns
  const billboardSponsors = [
    { pos: [-30, 0, 0] as const, rot: 0, sponsor: SPONSORS[0] }, // OCTANE
    { pos: [0, 0, 10] as const, rot: 0, sponsor: SPONSORS[1] }, // SUPERGRIP
    { pos: [30, 0, 0] as const, rot: 0, sponsor: SPONSORS[2] }, // VOLT
  ];

  return (
    <group position={[origin[0], 0, origin[1]]}>
      {/* Infield grass lawn: rounded stadium infield inside inner wall */}
      <mesh position={[0, 0.005, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[180, 60]} />
        <meshStandardMaterial map={grassTex} roughness={0.8} />
      </mesh>

      {/* Sponsor billboards in the infield */}
      {billboardSponsors.map((b, i) => (
        <InfieldBillboard
          key={`bb-${i}`}
          sponsor={b.sponsor}
          pos={b.pos}
          rot={b.rot}
          model={billboardScene}
        />
      ))}
    </group>
  );
}
