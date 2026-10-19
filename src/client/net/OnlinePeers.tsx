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
import type { DanceMoveId } from "../../game/dance/moves.ts";
import { decodeSwim, type Look, type Mood } from "../../game/look.ts";
import { ROOMS, type RoomId } from "../../game/rooms.ts";
import {
  decodeAction,
  encodeAction,
  type Doing,
} from "../../game/peerAction.ts";
import { stillClipsOf } from "../../game/dance/moves.ts";
import { carById } from "../../game/driving/roster.ts";
import type { OnlineSession } from "../../net/client/OnlineSession.ts";
import { Doll, type WalkState } from "../avatar/Doll.tsx";
import { CarMesh } from "../rooms/speedway/CarMesh.tsx";
import { driving } from "../world/driving.ts";
import type { Player } from "../world/PlayerController.tsx";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

const BUBBLE_MS = 6000;
const LAY_HOLD = stillClipsOf("lay")[0]?.id ?? "built";

type Peer = { id: string; name: string | null; look: Look };

/** One other player: their doll where the session says they are, walking
 * when they move, their name over their head and what they last said. */
function PeerDoll({
  session,
  peer,
  said,
  swimwear,
}: {
  session: OnlineSession;
  peer: Peer;
  said: string | null;
  /** In a swimwear room they wear the swimsuit their look carries. */
  swimwear: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const walk = useMemo(() => ({ current: { speed: 0 } as WalkState }), []);
  const last = useRef<{ x: number; z: number } | null>(null);
  const [doing, setDoing] = useState<Doing>({
    mood: "idle",
  });
  useFrame((_, dt) => {
    const g = group.current;
    const at = session.sample(peer.id);
    if (!g || !at) return;
    const next = decodeAction(at.action);
    // height comes only with each move: ease it, so rides don't step
    const y = next.seat?.y ?? 0;
    g.position.set(
      at.x,
      Math.abs(y - g.position.y) > 3
        ? y
        : g.position.y + (y - g.position.y) * Math.min(1, dt * 10),
      at.z,
    );
    g.rotation.y = at.yaw;
    const prev = last.current;
    const moved = prev ? Math.hypot(at.x - prev.x, at.z - prev.z) : 0;
    walk.current.speed = dt > 0 ? Math.min(4, moved / dt) : 0;
    last.current = { x: at.x, z: at.z };
    if (
      next.mood !== doing.mood ||
      next.dance !== doing.dance ||
      next.seat?.pose !== doing.seat?.pose ||
      next.car?.id !== doing.car?.id ||
      next.car?.color !== doing.car?.color
    )
      setDoing(next);
  });
  const car = doing.car ? carById(doing.car.id) : null;
  return (
    <group
      ref={group}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        peerCard.set({ open: { id: peer.id, name: peer.name ?? "Guest" } });
      }}
    >
      {car ? (
        <CarMesh
          key={`${car.id}${doing.car?.color}`}
          spec={car}
          color={doing.car?.color ?? "#ffffff"}
          // CarMesh starts hidden for the speedway's own placement
          ref={(g: THREE.Group | null) => {
            if (g) g.visible = true;
          }}
        />
      ) : (
        <Doll
          look={peer.look}
          swim={swimwear ? decodeSwim(peer.look.swim) : null}
          mood={doing.mood}
          hold={doing.seat?.pose === "lie" ? LAY_HOLD : undefined}
          dance={doing.dance}
          walk={walk}
          seed={peer.id.length * 7}
        />
      )}
      <Html position={[0, car ? 2.3 : 2.05, 0]} center zIndexRange={[20, 10]}>
        <div
          className="peer-tag"
          data-doing={car ? `car:${car.id}` : (doing.seat?.pose ?? doing.mood)}
        >
          {said && <p className="bubble npc-bubble">{said}</p>}
          <button
            type="button"
            className="nametag"
            aria-label={`${peer.name ?? "Guest"}: open their card`}
            onClick={() =>
              peerCard.set({
                open: { id: peer.id, name: peer.name ?? "Guest" },
              })
            }
          >
            {peer.name ?? "Guest"}
          </button>
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
  room,
  player,
  mood,
  dance,
}: {
  room: RoomId;
  player: Player;
  mood: Mood;
  dance: DanceMoveId;
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
      session.on("chat", ({ id, text }) => {
        // a muted player's chat never shows
        if (peerCard.get().mutes.includes(id)) return;
        setSaid((s) => ({ ...s, [id]: { text, at: Date.now() } }));
      }),
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
  const sent = useRef({ x: NaN, z: NaN, yaw: NaN, action: "" });
  useFrame(() => {
    const s = sent.current;
    // seated or riding, they're drawn on the seat, not where they walked
    // up; driving, as their car
    const city = driving.session?.kind === "city" ? driving.session : null;
    const seat = player.seat;
    const at = seat?.position ?? player.pos;
    const x = city ? city.car.position[0] : at.x;
    const z = city ? city.car.position[1] : at.z;
    const yaw = city?.car.yaw ?? seat?.yaw ?? player.yaw;
    const action = encodeAction(
      mood,
      dance,
      seat
        ? {
            pose: seat.lie
              ? "lie"
              : player.sitting || seat.sit
                ? "sit"
                : "stand",
            y: seat.position.y,
          }
        : undefined,
      city ? { id: city.spec.id, color: city.color } : undefined,
    );
    if (
      !session ||
      (Math.abs(x - s.x) < 0.01 &&
        Math.abs(z - s.z) < 0.01 &&
        Math.abs(yaw - s.yaw) < 0.01 &&
        action === s.action)
    )
      return;
    if (session.sendMove(x, z, yaw, action))
      sent.current = { x, z, yaw, action };
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
          swimwear={ROOMS[room].swimwear === true}
        />
      ))}
    </Suspense>
  );
}
