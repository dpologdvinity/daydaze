// The sidewalks' standing conversations (game/city/chatGroups.ts): the few
// groups nearest the player, as dolls, re-picked every moment like the
// walkers. A group appears already mid-talk; its turns are a function of the
// clock, so it carries on where it was when it comes back into range.

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import {
  CHAT_GROUPS,
  chatGroupOut,
  nearestChatGroups,
} from "../../game/city/chatGroups.ts";
import { CHAT_DOLLS, CHAT_RADIUS } from "../../game/city/tuning.ts";
import { useQuality } from "../world/quality.ts";
import type { Player } from "../world/PlayerController.tsx";
import { ChatGroup } from "../rooms/shared/ChatGroup.tsx";
import { cityHour } from "./daylight.ts";

/** Seconds between re-picking which groups are nearest. */
const REPICK = 1;

export function ChatGroups({ player }: { player: Player }) {
  const tier = useQuality();
  const [shown, setShown] = useState<readonly number[]>([]);
  const last = useRef(-Infinity);
  useFrame(({ clock, gl }) => {
    const t = clock.elapsedTime;
    if (t - last.current < REPICK) return;
    last.current = t;
    const hour = cityHour();
    const next = nearestChatGroups(
      [player.pos.x, player.pos.z],
      CHAT_RADIUS[tier],
      CHAT_DOLLS[tier],
      (g) => chatGroupOut(g, hour),
    );
    // re-render only when the set changes, not when the order does
    if (next.length !== shown.length || next.some((i) => !shown.includes(i)))
      setShown(next);
    // read by tests: how many groups are standing about near her
    gl.domElement.dataset.chatGroups = String(next.length);
  });
  return (
    <>
      {shown.map((i) => {
        const g = CHAT_GROUPS[i];
        return g ? (
          <ChatGroup
            key={i}
            at={g.at}
            seed={g.seed}
            looks={g.looks}
            turn={g.turn}
          />
        ) : null;
      })}
    </>
  );
}
