import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import * as THREE from "three";
import type { Look, Mood } from "../../game/look.ts";
import { MOODS } from "../../game/look.ts";
import type { OnlineSession } from "../../net/client/OnlineSession.ts";
import { Doll, type WalkState } from "../avatar/Doll.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { onlineSession } from "./online.ts";

const BUBBLE_MS = 6000;
const isMood = (a: string): a is Mood => MOODS.some((m) => m.id === a);

type Peer = { id: string; name: string | null; look: Look };

/** One other player: their doll where the session says they are, walking
 * when they move, their name over their head and what they last said. */
function PeerDoll({
  session,
  peer,
  said,
}: {
  session: OnlineSession;
  peer: Peer;
  said: string | null;
}) {
  const group = useRef<THREE.Group>(null);
  const walk = useMemo(() => ({ current: { speed: 0 } as WalkState }), []);
  const last = useRef<{ x: number; z: number } | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  useFrame((_, dt) => {
    const g = group.current;
    const at = session.sample(peer.id);
    if (!g || !at) return;
    g.position.set(at.x, 0, at.z);
    g.rotation.y = at.yaw;
    const prev = last.current;
    const moved = prev ? Math.hypot(at.x - prev.x, at.z - prev.z) : 0;
    walk.current.speed = dt > 0 ? Math.min(4, moved / dt) : 0;
    last.current = { x: at.x, z: at.z };
    const m = isMood(at.action) ? at.action : "idle";
    if (m !== mood) setMood(m);
  });
  return (
    <group ref={group}>
      <Doll
        look={peer.look}
        mood={mood}
        walk={walk}
        seed={peer.id.length * 7}
      />
      <Html position={[0, 2.05, 0]} center zIndexRange={[20, 10]}>
        <div className="peer-tag">
          {said && <p className="bubble npc-bubble">{said}</p>}
          <p className="nametag">{peer.name ?? "Guest"}</p>
        </div>
      </Html>
    </group>
  );
}

/**
 * Everyone else in this room copy, and our own moves out to them. Renders
 * nothing when playing offline.
 */
export function OnlinePeers({
  player,
  mood,
}: {
  player: Player;
  mood: Mood;
}): JSX.Element | null {
  const session = onlineSession();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [said, setSaid] = useState<
    Record<string, { text: string; at: number }>
  >({});
  useEffect(() => {
    if (!session) return;
    const refresh = () =>
      setPeers(
        [...session.remotePlayers.values()].flatMap((p) =>
          p.look ? [{ id: p.id, name: p.name, look: p.look }] : [],
        ),
      );
    const offs = [
      session.on("profile", refresh),
      session.on("leave", refresh),
      session.on("snapshot", refresh),
      session.on("chat", ({ id, text }) =>
        setSaid((s) => ({ ...s, [id]: { text, at: Date.now() } })),
      ),
    ];
    refresh();
    return () => offs.forEach((off) => off());
  }, [session]);
  // bubbles fade on their own
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setSaid((s) => {
        const keep = Object.entries(s).filter(
          ([, v]) => now - v.at < BUBBLE_MS,
        );
        return keep.length === Object.keys(s).length
          ? s
          : Object.fromEntries(keep);
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  // only a changed pose goes out; the session throttles what does
  const sent = useRef({ x: NaN, z: NaN, yaw: NaN, mood: "" });
  useFrame(() => {
    const s = sent.current;
    const { x, z } = player.pos;
    if (
      !session ||
      (Math.abs(x - s.x) < 0.01 &&
        Math.abs(z - s.z) < 0.01 &&
        Math.abs(player.yaw - s.yaw) < 0.01 &&
        mood === s.mood)
    )
      return;
    if (session.sendMove(x, z, player.yaw, mood))
      sent.current = { x, z, yaw: player.yaw, mood };
  });
  if (!session) return null;
  return (
    <Suspense fallback={null}>
      {peers.map((p) => (
        <PeerDoll
          key={p.id}
          session={session}
          peer={p}
          said={said[p.id]?.text ?? null}
        />
      ))}
    </Suspense>
  );
}
