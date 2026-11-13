// Starts fetching a part's models when the player comes within `range` meters
// of it, well before it draws (its own near check is 70 to 80 m). Parts used
// to preload at startup, so the first picture waited on every model in the
// city; now only what is close is fetched, and the rest streams in as she
// walks toward it (the file is in the cache by the time the part mounts).
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Player } from "../world/PlayerController.tsx";

/** Check this often (seconds): a distance test per frame is wasteful. */
const EVERY = 0.5;

export function usePreloadNear(
  player: Player,
  at: readonly [number, number],
  range: number,
  urls: string | string[],
): void {
  const done = useRef(false);
  const since = useRef(0);
  useFrame((_, dt) => {
    if (done.current) return;
    since.current += dt;
    if (since.current < EVERY) return;
    since.current = 0;
    if (Math.hypot(player.pos.x - at[0], player.pos.z - at[1]) > range) return;
    done.current = true;
    useGLTF.preload(urls);
  });
}
