// The cook-off kitchen at Kamayan Hall: two gas ranges on the back wall, a
// wok on each over a glowing burner, a board and knife beside it. During a
// cook-off the player stands at her stove (myStove: online rivals take the
// other one); each ingredient she adds lands in the wok as low-poly pieces
// with a sizzle (or a chop on the board first), she stirs between, steam
// rises, and a served plate sits on the pass for a moment; the result rings a
// gong. Offline, Tita Baby cooks at the next stove. The order session
// (food/cookOffSession.ts) keeps the shift; the panel has the tickets.

import { claimSeat, releaseSeat } from "../shared/game3d/seatClaim.ts";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { playChop, playGong, playSizzle } from "../../../audio/worldSounds.ts";
import { COOKOFF, myStove } from "../../../game/cookOff.ts";
import type { GameClipId } from "../../../game/dance/moves.ts";
import { STOVES } from "../../../game/kamayanHall.ts";
import type { Look } from "../../../game/look.ts";
import type { Vec3 } from "../../../game/motion/ball.ts";
import { shiftOver, ticket } from "../../../game/orders.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { useReducedMotion } from "../../motion.ts";
import { cookOff } from "../../net/cookOff.ts";
import { onlineSession } from "../../net/online.ts";
import type { Player } from "../../world/PlayerController.tsx";
import { cookOffSession } from "../food/cookOffSession.ts";
import { useGameClip } from "../shared/game3d/gameClip.ts";
import { useGameShot } from "../shared/game3d/useGameShot.ts";

/** How each ingredient looks in the wok: a color and a piece's size. */
const LOOKS: Record<string, { color: string; size: Vec3; pieces: number }> = {
  rice: { color: "#f4f1e6", size: [0.03, 0.03, 0.03], pieces: 10 },
  pork: { color: "#c9806b", size: [0.06, 0.05, 0.06], pieces: 5 },
  chicken: { color: "#e6c08a", size: [0.06, 0.05, 0.06], pieces: 5 },
  shrimp: { color: "#ff8c69", size: [0.07, 0.035, 0.04], pieces: 4 },
  soy: { color: "#3a1f12", size: [0.16, 0.008, 0.16], pieces: 1 },
  vinegar: { color: "#e8d9a8", size: [0.14, 0.008, 0.14], pieces: 1 },
  garlic: { color: "#f7f0dc", size: [0.025, 0.025, 0.025], pieces: 6 },
  tamarind: { color: "#b9a06a", size: [0.17, 0.01, 0.17], pieces: 1 },
  kangkong: { color: "#4caf50", size: [0.09, 0.01, 0.045], pieces: 6 },
  noodles: { color: "#f2d27a", size: [0.12, 0.012, 0.012], pieces: 8 },
  wrapper: { color: "#f3e3c0", size: [0.11, 0.035, 0.035], pieces: 3 },
  peanut: { color: "#c98a3d", size: [0.15, 0.01, 0.15], pieces: 1 },
  egg: { color: "#ffe680", size: [0.07, 0.025, 0.07], pieces: 1 },
  calamansi: { color: "#9ccc3c", size: [0.03, 0.03, 0.03], pieces: 4 },
};
/** Ingredients cut on the board before they go in. */
const CHOPPED = new Set([
  "pork",
  "chicken",
  "garlic",
  "kangkong",
  "calamansi",
  "shrimp",
]);
/** The most pieces a wok holds (a full ticket of five ingredients). */
const MAX_PIECES = 48;
/** The stove's cooktop height and the wok's center above it. */
const TOP = 0.9;
const STEAM = 10;

const TITA: Look = {
  skin: "#c48d68",
  hairStyle: "bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "mini",
  outfitColor: "#ffb02e",
  shadow: "#ff2f9a",
};

/** A small seeded jitter, so each piece has its own spot in the wok. */
const jitter = (i: number, k: number) => {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h) - 0.5;
};

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();

const FLAME = new THREE.Color("#4f8bff").multiplyScalar(2.2);

/** A gas range with its burner, wok, board and knife. Always there. */
function Range({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={TOP / 2}>
        <boxGeometry args={[1.2, TOP, 0.8]} />
        <meshStandardMaterial
          color="#c9ccd4"
          metalness={0.7}
          roughness={0.35}
        />
      </mesh>
      {/* the burner's flame ring, glowing under the wok */}
      <mesh position={[0, TOP + 0.02, 0.05]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.13, 0.025, 6, 20]} />
        <meshBasicMaterial color={FLAME} toneMapped={false} />
      </mesh>
      {/* the wok: a dark steel bowl with two handles */}
      <mesh position={[0, TOP + 0.12, 0.05]} rotation-x={Math.PI}>
        <sphereGeometry
          args={[0.26, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.6]}
        />
        <meshStandardMaterial
          color="#2b2b30"
          metalness={0.8}
          roughness={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0.36, TOP + 0.2, 0.05]} rotation-z={-0.2}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
        <meshStandardMaterial color="#5a3a24" roughness={0.7} />
      </mesh>
      {/* the board and knife to the left */}
      <mesh position={[-0.42, TOP + 0.015, 0.12]}>
        <boxGeometry args={[0.32, 0.03, 0.22]} />
        <meshStandardMaterial color="#c79a5a" roughness={0.8} />
      </mesh>
      <mesh position={[-0.42, TOP + 0.04, 0.12]} rotation-y={0.4}>
        <boxGeometry args={[0.18, 0.006, 0.04]} />
        <meshStandardMaterial color="#e8eaf0" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/**
 * The pieces in one wok: `count()` says how many ingredients are in, `items()`
 * which ones; tossed while `stirring()`.
 */
function WokPieces({
  x,
  z,
  items,
  limit = () => Infinity,
  stirring,
}: {
  x: number;
  z: number;
  items: () => readonly string[];
  /** How many of `items` are in the wok now (all by default). */
  limit?: () => number;
  stirring: () => boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    const im = mesh.current;
    if (!im) return;
    const list = items();
    const upTo = Math.min(list.length, limit());
    let n = 0;
    const t = clock.elapsedTime;
    const toss = stirring() && !calm ? 1 : 0;
    for (let k = 0; k < upTo && n < MAX_PIECES; k++) {
      const look = LOOKS[list[k] ?? ""];
      if (!look) continue;
      for (let i = 0; i < look.pieces && n < MAX_PIECES; i++, n++) {
        const r = 0.15 * Math.sqrt(Math.abs(jitter(n, 1)) * 2);
        const a = jitter(n, 2) * Math.PI * 2 + toss * t * 2.4;
        const hop = toss * Math.max(0, Math.sin(t * 7 + n)) * 0.05;
        v.set(
          x + Math.cos(a) * r,
          TOP + 0.06 + k * 0.006 + hop,
          z + 0.05 + Math.sin(a) * r,
        );
        e.set(jitter(n, 3) * 2, a, jitter(n, 4) * 2);
        q.setFromEuler(e);
        s.set(look.size[0], look.size[1], look.size[2]);
        m.compose(v, q, s);
        im.setMatrixAt(n, m);
        im.setColorAt(n, c.set(look.color));
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, MAX_PIECES]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

/** Steam curling up off a wok while it cooks. */
function Steam({ x, z, on }: { x: number; z: number; on: () => boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    const im = mesh.current;
    if (!im) return;
    im.visible = on();
    if (!im.visible) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < STEAM; i++) {
      const u = calm ? i / STEAM : (t * 0.35 + i / STEAM) % 1;
      v.set(
        x + Math.sin(u * 6 + i) * 0.08 * u,
        TOP + 0.2 + u * 0.9,
        z + 0.05 + Math.cos(u * 5 + i * 2) * 0.06 * u,
      );
      const r = 0.05 + u * 0.12;
      s.set(r, r, r);
      m.compose(v, q.identity(), s);
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, STEAM]}
      frustumCulled={false}
      visible={false}
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.16}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/** The cook-off kitchen and everything cooking in it. */
export function Kitchen({ player }: { player: Player }) {
  const s = cookOffSession.store.use();
  const match = cookOff.use().match;
  const me = onlineSession()?.identity()?.id ?? null;
  const mine = STOVES[myStove(me, match?.id ?? null)] ?? STOVES[0];
  const other = STOVES[mine === STOVES[0] ? 1 : 0];
  const over = s.on && shiftOver(s.shift);

  // the clip: a chop for cut ingredients, then stirring while she cooks
  const [clip, setClip] = useState<GameClipId | null>(null);
  const added = useRef(0);
  useEffect(() => {
    if (!s.on) {
      added.current = 0;
      setClip(null);
      return;
    }
    const cup = s.shift.cup;
    if (cup.length > added.current) {
      const last = cup[cup.length - 1] ?? "";
      if (CHOPPED.has(last)) {
        playChop();
        setClip("chop");
        const id = window.setTimeout(() => {
          playSizzle();
          setClip("stir");
        }, 700);
        added.current = cup.length;
        return () => window.clearTimeout(id);
      }
      playSizzle();
    }
    added.current = cup.length;
    setClip(over ? null : "stir");
  }, [s.on, s.shift.cup, over]);
  useGameClip("cook-off", s.on ? clip : null);

  // a served plate rests on the pass for a moment; the last one rings a gong
  const [plate, setPlate] = useState<readonly string[] | null>(null);
  useEffect(() => {
    if (!s.last) return;
    const shift = cookOffSession.store.get().shift;
    setPlate(ticket(COOKOFF, shift.seed, shift.served - 1).recipe);
    if (shiftOver(shift)) playGong();
    const id = window.setTimeout(() => setPlate(null), 1800);
    return () => window.clearTimeout(id);
  }, [s.last]);

  // the player at her stove, facing it
  const took = useRef<GameSeat | null>(null);
  useEffect(
    () => () => {
      if (took.current) releaseSeat(player, took.current);
    },
    [player],
  );
  useFrame(() => {
    const on = cookOffSession.store.get().on;
    if (!on || !mine) {
      if (took.current) {
        releaseSeat(player, took.current);
        took.current = null;
      }
      return;
    }
    if (!took.current) {
      const seat: GameSeat = {
        position: new THREE.Vector3(mine.cook[0], 0, mine.cook[1]),
        yaw: Math.PI,
      };
      if (!claimSeat(player, seat)) return;
      took.current = seat;
    }
  });

  // from the kitchen's west end, past the player's shoulder to Tita Baby's
  // stove: the boodle table stays out of frame
  const eye = useMemo<Vec3>(() => [-0.9, 2.3, -3.7], []);
  const target = useMemo<Vec3>(() => [2.9, 0.95, -5.3], []);
  useGameShot("cook-off", s.on, eye, target);
  const canvas = useThree((st) => st.gl.domElement);
  useEffect(() => {
    canvas.dataset.cookPieces = String(s.on ? s.shift.cup.length : 0);
    canvas.dataset.cookServed = String(s.on ? s.shift.served : 0);
  }, [canvas, s.on, s.shift]);

  // Tita Baby's wok fills and empties on her own rhythm
  const titaCook = !match && s.on && other;
  const titaItems = useMemo(
    () => ["pork", "soy", "vinegar", "garlic", "rice"],
    [],
  );
  const titaShown = useRef(0);
  const [titaClip, setTitaClip] = useState<GameClipId>("stir");
  useFrame(({ clock }) => {
    const phase = (clock.elapsedTime * 0.45) % 6;
    titaShown.current = Math.min(5, Math.floor(phase));
    const want: GameClipId = phase % 1 < 0.35 ? "chop" : "stir";
    if (titaCook && want !== titaClip) setTitaClip(want);
  });

  return (
    <>
      {STOVES.map((st) => (
        <Range key={st.x} x={st.x} z={st.z} />
      ))}
      {mine && (
        <>
          <WokPieces
            x={mine.x}
            z={mine.z}
            items={() =>
              cookOffSession.store.get().on
                ? cookOffSession.store.get().shift.cup
                : []
            }
            stirring={() => clip === "stir"}
          />
          <Steam
            x={mine.x}
            z={mine.z}
            on={() => cookOffSession.store.get().on}
          />
        </>
      )}
      {plate && mine && (
        <Plate x={mine.x + 0.85} z={mine.z + 0.1} items={plate} />
      )}
      {titaCook && other && (
        <>
          <group
            position={[other.cook[0], 0, other.cook[1]]}
            rotation-y={Math.PI}
          >
            <Doll look={TITA} mood="dance" dance={titaClip} seed={610} />
          </group>
          <WokPieces
            x={other.x}
            z={other.z}
            items={() => titaItems}
            limit={() => titaShown.current}
            stirring={() => true}
          />
          <Steam x={other.x} z={other.z} on={() => true} />
        </>
      )}
    </>
  );
}

/** A served plate on the pass: a white plate with the dish heaped on it. */
function Plate({
  x,
  z,
  items,
}: {
  x: number;
  z: number;
  items: readonly string[];
}) {
  return (
    <group position={[x, TOP + 0.02, z]}>
      <mesh>
        <cylinderGeometry args={[0.16, 0.12, 0.025, 20]} />
        <meshStandardMaterial color="#fbfaf6" roughness={0.3} />
      </mesh>
      {items.map((id, i) => {
        const look = LOOKS[id];
        if (!look) return null;
        const a = (i / items.length) * Math.PI * 2;
        return (
          <mesh
            key={id}
            position={[Math.cos(a) * 0.06, 0.035, Math.sin(a) * 0.06]}
            scale={[0.06, 0.03, 0.06]}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={look.color} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

/** The seat a game puts the player on. */
type GameSeat = NonNullable<Player["seat"]>;
