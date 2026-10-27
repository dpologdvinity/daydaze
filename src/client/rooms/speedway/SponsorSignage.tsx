// SAFER-barrier sponsor signage along the outer speedway walls.
// Banners feature made-up brands in the Daydaze universe.

import { useCanvasTexture } from "./canvasTextures.ts";
import { SPONSORS, sponsorBannerPaint } from "./sponsorArt.ts";

/** Signage mounted on the outer wall across the back stretch facing the stands. */
const WALL_SIGNS = [
  { x: -50, z: 47.2, yaw: Math.PI, sponsor: SPONSORS[0] }, // OCTANE
  { x: -30, z: 47.2, yaw: Math.PI, sponsor: SPONSORS[1] }, // SUPERGRIP
  { x: -10, z: 47.2, yaw: Math.PI, sponsor: SPONSORS[2] }, // VOLT
  { x: 10, z: 47.2, yaw: Math.PI, sponsor: SPONSORS[3] }, // MANGO SPARK
  { x: 30, z: 47.2, yaw: Math.PI, sponsor: SPONSORS[4] }, // THUNDER
  { x: 50, z: 47.2, yaw: Math.PI, sponsor: SPONSORS[5] }, // DAYDAZE
];

function WallSign({ x, z, yaw, sponsor }: (typeof WALL_SIGNS)[number]) {
  const texture = useCanvasTexture(
    `safer-sign:${sponsor.name}`,
    256,
    64,
    sponsorBannerPaint(sponsor),
  );
  return (
    <mesh position={[x, 0.75, z]} rotation-y={yaw}>
      <planeGeometry args={[12, 1.2]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export function SponsorSignage({
  origin = [0, -84],
}: {
  origin?: readonly [number, number];
}) {
  return (
    <group position={[origin[0], 0, origin[1]]}>
      {WALL_SIGNS.map((s, i) => (
        <WallSign key={`safer-sign-${i}`} {...s} />
      ))}
    </group>
  );
}
