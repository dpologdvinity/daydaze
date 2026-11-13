// A rare trip on the sidewalk: every few hundred meters she walks along the
// city's sidewalks, her foot catches (game/reactions.ts decides when and
// which: a stumble when jogging, a trip, now and then a fall and get-up).
// Never while driving, skating, swimming, seated, in a game, mid-reaction or
// with a dialog open; cosmetic only, she is held a moment and carries on.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { onSidewalk } from "../../game/city/sidewalk.ts";
import { newTrips, stepTrips } from "../../game/reactions.ts";
import { afloat } from "../avatar/human/afloat.ts";
import { gameClip } from "../rooms/shared/game3d/gameClip.ts";
import { driving } from "../world/driving.ts";
import type { Player } from "../world/PlayerController.tsx";
import { react, reactingNow } from "../world/reaction.ts";
import { skates } from "../world/skates.ts";

/** Faster than this (m/s) is a jog, and a trip then is a stumble. */
const JOG_SPEED = 2.4;
/** A jump in position bigger than this speed is a portal or a respawn, not a walk. */
const TELEPORT_SPEED = 12;

function tripAfter(): number | null {
  const m = Number(new URLSearchParams(location.search).get("trip"));
  return Number.isFinite(m) && m > 0 ? m : null;
}

export function SidewalkTrips({ player }: { player: Player }) {
  // a different walk each visit
  const trips = useRef({
    ...newTrips(1 + Math.floor(Math.random() * 1e9)),
    // ?trip=<meters> brings the first trip forward, for tests and screenshots
    ...(tripAfter() !== null ? { nextAt: tripAfter() ?? 0 } : {}),
  });
  const last = useRef<[number, number] | null>(null);
  useFrame((state, dt) => {
    const x = player.pos.x;
    const z = player.pos.z;
    const prev = last.current;
    last.current = [x, z];
    if (!prev || !(dt > 0)) return;
    const meters = Math.hypot(x - prev[0], z - prev[1]);
    const speed = meters / dt;
    if (speed > TELEPORT_SPEED) return;
    const free =
      !driving.session &&
      driving.passenger === null &&
      !player.seat &&
      !player.sitting &&
      !player.ride &&
      !afloat.on &&
      !skates.get().on &&
      gameClip.get().move === null &&
      reactingNow() === null;
    const r = stepTrips(trips.current, {
      meters,
      onSidewalk: onSidewalk(x, z),
      free,
      jogging: speed > JOG_SPEED,
    });
    trips.current = r.state;
    // a dialog open (a shop, a menu) is no time to trip
    if (
      r.trip &&
      !state.gl.domElement.ownerDocument.querySelector('[role="dialog"]')
    )
      react(r.trip);
  });
  return null;
}
