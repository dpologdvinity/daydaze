// Draws every other player in the room copy (doll or car, name, buzz tag, chat
// bubble, tap for their card) and sends your own position and action to the
// session. Renders nothing offline.

import { activeTier } from "../../game/age.ts";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
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
  buzzTier,
  decodeAction,
  shownBuzz,
  encodeAction,
  type Doing,
} from "../../game/peerAction.ts";
import { stillClipsOf } from "../../game/dance/moves.ts";
import { carById } from "../../game/driving/roster.ts";
import type { OnlineSession } from "../../net/client/OnlineSession.ts";
import { Doll, type WalkState } from "../avatar/Doll.tsx";
import { getBuzz } from "../effects/drunk.ts";
import { CarMesh } from "../rooms/speedway/CarMesh.tsx";
import { driving } from "../world/driving.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import {
  followSpot,
  liftOf,
  mirrored,
  together,
} from "../../game/dance/together.ts";
import { pairUp, stopTogether } from "./together.ts";
import { keepSeat } from "./ride.ts";
import { trackOrigin } from "../../game/speedway/layout.ts";

/** Everyone else sees your race kart in the Speedway's own pink. */
const KART_PAINT = "#ff4fb3";
import { shownChat } from "./chatPrefs.ts";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

const BUBBLE_MS = 6000;
const LAY_HOLD = stillClipsOf("lay")[0]?.id ?? "built";

const BUZZ = { 1: "Tipsy", 2: "Drunk", 3: "Very drunk" } as const;

type Peer = { id: string; name: string | null; look: Look };

/** One other player: their doll where the session says they are, walking
 * when they move, their name over their head and what they last said. */
function PeerDoll({
  session,
  peer,
  said,
  swimwear,
  player,
}: {
  session: OnlineSession;
  peer: Peer;
  said: string | null;
  /** In a swimwear room they wear the swimsuit their look carries. */
  swimwear: boolean;
  /** This player, whose back a piggyback rider of theirs sits on. */
  player: Player;
}) {
  const group = useRef<THREE.Group>(null);
  const walk = useMemo(() => ({ current: { speed: 0 } as WalkState }), []);
  const last = useRef<{ x: number; z: number } | null>(null);
  const [doing, setDoing] = useState<Doing>({
    mood: "idle",
  });
  // the last action string and what it decodes to: decode only on change
  const heard = useRef<{ action: string; next: Doing }>({
    action: "idle",
    next: { mood: "idle" },
  });
  useFrame((_, dt) => {
    const g = group.current;
    const at = session.sample(peer.id);
    if (!g || !at) return;
    const was = heard.current;
    if (at.action !== was.action)
      heard.current = { action: at.action, next: decodeAction(at.action) };
    const { next } = heard.current;
    // height comes only with each move: ease it, so rides don't step
    // a piggyback rider sits up on the lead's back
    const y =
      (next.seat?.y ?? 0) +
      (next.pair?.role === "follow" ? liftOf(next.pair.emote) : 0);
    g.position.set(
      at.x,
      Math.abs(y - g.position.y) > 3
        ? y
        : g.position.y + (y - g.position.y) * Math.min(1, dt * 10),
      at.z,
    );
    g.rotation.y = at.yaw;
    // riding piggyback on this player: drawn on their back as they are now,
    // not where the rider's (later-arriving) moves say
    const mine = pairUp.get().pair;
    if (
      mine?.id === peer.id &&
      mine.role === "lead" &&
      next.pair?.role === "follow" &&
      together(next.pair.emote).behind
    ) {
      const yaw = player.walk.yaw;
      const gap = together(next.pair.emote).gap;
      g.position.x = player.pos.x - gap * Math.sin(yaw);
      g.position.z = player.pos.z - gap * Math.cos(yaw);
      g.rotation.y = yaw;
    }
    const prev = last.current;
    const moved = prev ? Math.hypot(at.x - prev.x, at.z - prev.z) : 0;
    walk.current.speed = dt > 0 ? Math.min(4, moved / dt) : 0;
    if (prev) {
      prev.x = at.x;
      prev.z = at.z;
    } else last.current = { x: at.x, z: at.z };
    // a new height alone (a ride climbing) needs no re-render
    if (
      next !== was.next &&
      (next.mood !== doing.mood ||
        next.dance !== doing.dance ||
        next.seat?.pose !== doing.seat?.pose ||
        next.car?.id !== doing.car?.id ||
        next.car?.color !== doing.car?.color ||
        next.car?.mods?.rims !== doing.car?.mods?.rims ||
        next.car?.mods?.glow !== doing.car?.mods?.glow ||
        next.car?.mods?.tint !== doing.car?.mods?.tint ||
        next.car?.mods?.wrap !== doing.car?.mods?.wrap ||
        next.buzz !== doing.buzz ||
        next.pair?.emote !== doing.pair?.emote ||
        next.pair?.role !== doing.pair?.role ||
        next.ride !== doing.ride)
    )
      setDoing(next);
  });
  const car = doing.car ? carById(doing.car.id) : null;
  const buzz = shownBuzz(doing.buzz, activeTier());
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
          key={`${car.id}${doing.car?.color}${doing.car?.mods?.wrap}`}
          spec={car}
          color={doing.car?.color ?? "#ffffff"}
          mods={doing.car?.mods}
          // CarMesh starts hidden for the speedway's own placement
          ref={(g: THREE.Group | null) => {
            if (g) g.visible = true;
          }}
        />
      ) : doing.ride ? null : (
        <Doll
          look={peer.look}
          swim={swimwear ? decodeSwim(peer.look.swim) : null}
          mood={doing.mood}
          hold={doing.seat?.pose === "lie" ? LAY_HOLD : undefined}
          dance={doing.dance}
          couple={
            doing.pair && mirrored(doing.pair.emote)
              ? doing.pair.role
              : undefined
          }
          walk={walk}
          seed={peer.id.length * 7}
        />
      )}
      <Html position={[0, car ? 2.3 : 2.05, 0]} center zIndexRange={[20, 10]}>
        <div
          className="peer-tag"
          data-doing={
            car
              ? `car:${car.id}`
              : doing.ride
                ? "ride"
                : doing.pair
                  ? `pair:${doing.pair.emote}`
                  : (doing.seat?.pose ?? doing.mood)
          }
        >
          {said && <p className="bubble npc-bubble">{said}</p>}
          {/* a 13+ client never shows a buzz tag, whatever a peer sends */}
          {buzz && (
            <span className="peer-buzz" role="img" aria-label={BUZZ[buzz]}>
              {"🍸".repeat(buzz)}
            </span>
          )}
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
        setSaid((s) => ({
          ...s,
          [id]: { text: shownChat(text), at: Date.now() },
        }));
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
  // where an emote with someone began: walking off from it ends the emote
  const anchor = useRef({ x: 0, z: 0, set: false });
  const canvas = useThree((st) => st.gl.domElement);
  useFrame(() => {
    // a passenger sits where the driver's car is (ride.ts)
    keepSeat(player);
    const s = sent.current;
    const { pair } = pairUp.get();
    if (!pair) anchor.current.set = false;
    else if (!pair.placed) {
      // the follow steps into place by the lead, facing them
      const lead = session?.sample(pair.id);
      if (lead) {
        const spot = followSpot(pair.e, [lead.x, lead.z], lead.yaw);
        placePlayer(player, spot.at[0], spot.at[1]);
        player.walk.target = null;
        player.yaw = player.walk.yaw = player.before.yaw = spot.yaw;
        pairUp.set({ pair: { ...pair, placed: true } });
      }
    } else if (together(pair.e).behind) {
      // a piggyback moves as one: the rider stays on the lead's back
      // wherever they walk (the rider's own walking is off), and walking
      // away never ends it; Stop does
      const lead = pair.role === "follow" && session?.sample(pair.id);
      if (lead) {
        // shortcut: followSpot and placePlayer allocate a little each frame
        // while riding; reuse buffers if a profile ever shows it
        const spot = followSpot(pair.e, [lead.x, lead.z], lead.yaw);
        placePlayer(player, spot.at[0], spot.at[1]);
        player.yaw = player.walk.yaw = player.before.yaw = spot.yaw;
      }
    } else if (!anchor.current.set)
      anchor.current = { x: player.pos.x, z: player.pos.z, set: true };
    else if (
      Math.hypot(
        player.pos.x - anchor.current.x,
        player.pos.z - anchor.current.z,
      ) > 0.4
    )
      stopTogether();
    // seated or riding, they're drawn on the seat, not where they walked
    // up; driving, as their car
    const city = driving.session?.kind === "city" ? driving.session : null;
    // racing at the Speedway: the kart, where its track sits in the room
    const racing = driving.session?.kind === "race" ? driving.session : null;
    const kart = racing?.race.cars[0];
    const track = racing && trackOrigin(racing.track.id);
    const seat = player.seat;
    const at = seat?.position ?? player.pos;
    const x = city
      ? city.car.position[0]
      : kart && track
        ? track[0] + kart.state.position[0]
        : at.x;
    const z = city
      ? city.car.position[1]
      : kart && track
        ? track[1] + kart.state.position[1]
        : at.z;
    const yaw = city?.car.yaw ?? kart?.state.yaw ?? seat?.yaw ?? player.yaw;
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
      city
        ? { id: city.spec.id, color: city.color, mods: city.mods }
        : kart && track
          ? { id: kart.spec.id, color: KART_PAINT }
          : undefined,
      buzzTier(getBuzz()),
      pair?.placed ? { emote: pair.e, role: pair.role } : undefined,
      driving.passenger !== null,
    );
    if (
      !session ||
      (Math.abs(x - s.x) < 0.01 &&
        Math.abs(z - s.z) < 0.01 &&
        Math.abs(yaw - s.yaw) < 0.01 &&
        action === s.action)
    )
      return;
    if (session.sendMove(x, z, yaw, action)) {
      sent.current = { x, z, yaw, action };
      // where this player is, for the browser tests (a passenger moves
      // without walking)
      canvas.dataset.spot = `${x.toFixed(1)},${z.toFixed(1)}`;
    }
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
          player={player}
        />
      ))}
    </Suspense>
  );
}
