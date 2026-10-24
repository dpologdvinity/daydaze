// Four floodlight towers at the corners of the Neon Oval, set a margin outside
// the track's bounds. Lamp heads are emissive boxes, not real lights, to stay
// inside the low tier's light budget.

import { useMemo } from "react";
import { TRACKS } from "../../../game/speedway/track.ts";
import { TRACK_ORIGINS } from "../../../game/speedway/layout.ts";
import { Boxes } from "./Boxes.tsx";
import { NEON } from "./neon.ts";
import type { Box } from "./strips.ts";

const TOWER_HEIGHT = 15;
const LEG = 0.22;
const SPAN = 0.9;
// how far past the oval's outer edge the towers stand, in meters
const MARGIN = 14;

/**
 * Four floodlight towers at the corners of the oval. The lamp heads are unlit
 * emissive boxes, so they glow without adding a real light.
 */
export function Floodlights() {
  const parts = useMemo(() => {
    const [ox, oz] = TRACK_ORIGINS["neon-oval"];
    const pts = TRACKS[0].centerline;
    const xs = pts.map((p) => p[0] + ox);
    const zs = pts.map((p) => p[1] + oz);
    const x0 = Math.min(...xs) - MARGIN;
    const x1 = Math.max(...xs) + MARGIN;
    const z0 = Math.min(...zs) - MARGIN;
    const z1 = Math.max(...zs) + MARGIN;
    const legs: Box[] = [];
    const bars: Box[] = [];
    const heads: Box[] = [];
    for (const x of [x0, x1]) {
      for (const z of [z0, z1]) {
        for (const dx of [-SPAN, SPAN]) {
          for (const dz of [-SPAN, SPAN]) {
            legs.push({
              x: x + dx,
              y: 0,
              z: z + dz,
              yaw: 0,
              length: LEG,
              height: TOWER_HEIGHT,
              depth: LEG,
            });
          }
        }
        for (const y of [4, 8.5, 13]) {
          // cross bars on the two faces that look into the track
          bars.push(
            {
              x,
              y,
              z: z - SPAN,
              yaw: 0,
              length: SPAN * 2,
              height: 0.15,
              depth: 0.15,
            },
            {
              x,
              y,
              z: z + SPAN,
              yaw: 0,
              length: SPAN * 2,
              height: 0.15,
              depth: 0.15,
            },
          );
        }
        heads.push({
          x,
          y: TOWER_HEIGHT,
          z,
          yaw: 0,
          length: 2.6,
          height: 0.6,
          depth: 1.2,
          color: NEON.white,
        });
      }
    }
    return { legs, bars, heads };
  }, []);
  return (
    <>
      <Boxes boxes={parts.legs} color="#2a2448" />
      <Boxes boxes={parts.bars} color="#2a2448" />
      <Boxes boxes={parts.heads} glow />
    </>
  );
}
