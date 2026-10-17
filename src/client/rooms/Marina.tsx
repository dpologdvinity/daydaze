import { Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playClick } from "../../audio/worldSounds.ts";
import {
  BAR,
  BENCH_SEATS,
  CROSS,
  DOCK,
  FISH_SPOT,
  LANDING,
  YACHTS,
} from "../../game/marina.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";
import { placePlayer } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { MarinaNpcs } from "./marina/Npcs.tsx";
import { FLIGHT, fishing, leave, tick } from "./marina/session.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const TEAL = "#3fe0d0";
const WATER_Y = -0.5;
const PLANK = "#8a6a4a";

/** The docks' decks, as boxes standing out of the water. */
const DECKS = [LANDING, DOCK, CROSS].map((r) => ({
  x: (r.x0 + r.x1) / 2,
  z: (r.z0 + r.z1) / 2,
  w: r.x1 - r.x0,
  d: r.z1 - r.z0,
}));

/** Pilings along the docks' edges, one instanced draw. */
function Pilings() {
  const spots = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = DOCK.z0; z <= LANDING.z0; z += 3)
      out.push([DOCK.x0, z], [DOCK.x1, z]);
    for (let x = CROSS.x0; x <= CROSS.x1; x += 4)
      out.push([x, CROSS.z0], [x, CROSS.z1]);
    for (let x = LANDING.x0; x <= LANDING.x1; x += 3) out.push([x, LANDING.z0]);
    return out;
  }, []);
  return (
    <instancedMesh
      ref={(m) => {
        if (!m) return;
        const mat = new THREE.Matrix4();
        spots.forEach(([x, z], i) =>
          m.setMatrixAt(i, mat.makeTranslation(x, -0.55, z)),
        );
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }}
      args={[undefined, undefined, spots.length]}
    >
      <cylinderGeometry args={[0.14, 0.16, 1.4, 8]} />
      <meshStandardMaterial color="#4a3424" roughness={0.9} />
    </instancedMesh>
  );
}

/** A moored yacht: white hull, a cabin with lit windows, its name in neon
 * and string lights from the bow to the mast, rocking on the swell. */
function Yacht({
  at,
  length,
  beam,
  name,
  color,
  seed,
}: (typeof YACHTS)[number] & { seed: number }) {
  const calm = useReducedMotion();
  const boat = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = boat.current;
    if (!g || calm) return;
    const t = clock.elapsedTime + seed;
    g.rotation.z = Math.sin(t * 0.7) * 0.025;
    g.rotation.x = Math.sin(t * 0.5) * 0.012;
    g.position.y = WATER_Y + Math.sin(t * 0.9) * 0.05;
  });
  return (
    <group ref={boat} position={[at[0], WATER_Y, at[1]]}>
      {/* the hull: a stretched half-sphere, keel down, rim at the deck */}
      <mesh position-y={0.9} scale={[beam / 2, 0.9, length / 2]}>
        <sphereGeometry
          args={[1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        <meshStandardMaterial color="#f4f4f8" roughness={0.3} />
      </mesh>
      <mesh position-y={0.92} scale={[beam / 2, 1, length / 2]}>
        <cylinderGeometry args={[1, 1, 0.05, 18]} />
        <meshStandardMaterial color="#c8a27a" />
      </mesh>
      {/* a neon stripe round the rim */}
      <mesh position-y={0.82} scale={[beam / 2 + 0.01, 1, length / 2 + 0.01]}>
        <cylinderGeometry args={[1, 1, 0.1, 18, 1, true]} />
        <meshBasicMaterial
          color={hdr(color, 1.6)}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 1.5, length * 0.08]}>
        <boxGeometry args={[beam * 0.55, 1.1, length * 0.34]} />
        <meshStandardMaterial color="#e8e8f0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.6, length * 0.08]}>
        <boxGeometry args={[beam * 0.57, 0.32, length * 0.28]} />
        <meshBasicMaterial color={hdr("#ffe3b0", 1.4)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.4, -length * 0.08]}>
        <cylinderGeometry args={[0.05, 0.06, 4, 6]} />
        <meshStandardMaterial color="#d8d8e0" metalness={0.6} />
      </mesh>
      <NeonText
        text={name}
        color={color}
        font={MARQUEE}
        width={length * 0.4}
        k={2.6}
        position={[0, 2.35, length * 0.25 + 0.02]}
      />
    </group>
  );
}

/** The fishing rod in its holder at the end of the dock, the line and the
 * bobber, and the camera over your shoulder while you fish. */
function Fishing({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const bobber = useRef<THREE.Mesh>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const tip = useMemo(
    () => new THREE.Vector3(FISH_SPOT[0] + 0.7, 2.4, FISH_SPOT[1] - 1.9),
    [],
  );
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([tip, tip]);
    return new THREE.Line(
      g,
      new THREE.LineBasicMaterial({
        color: "#e8f4ff",
        transparent: true,
        opacity: 0.7,
      }),
    );
  }, [tip]);
  const splashed = useRef(0);
  useEffect(
    () => () => {
      leave();
      player.seat = null;
      if (cameraHold.by === "marina") cameraHold.by = null;
    },
    [player],
  );
  useFrame(({ clock }, dt) => {
    const now = performance.now();
    tick(now);
    const s = fishing.get();
    cameraHold.by = s.phase !== "off" ? "marina" : null;
    const b = bobber.current;
    if (!b) return;
    if (s.phase === "off") {
      if (player.seat) {
        player.seat = null;
        placePlayer(player, FISH_SPOT[0], FISH_SPOT[1]);
      }
      b.visible = false;
      line.visible = false;
      return;
    }
    // stand her at the end of the dock, facing out to sea
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(FISH_SPOT[0], 0.02, FISH_SPOT[1]);
    player.seat.yaw = Math.PI;
    player.seat.sit = false;
    const out = FISH_SPOT[1] - s.distance;
    const landing = [FISH_SPOT[0] + 0.7, out] as const;
    const t = clock.elapsedTime;
    const cast = s.phase !== "power" && s.phase !== "over";
    b.visible = cast;
    line.visible = cast;
    if (s.phase === "flying") {
      const f = Math.min(1, (now - s.since) / (FLIGHT * 1000));
      b.position.set(
        tip.x + (landing[0] - tip.x) * f,
        tip.y + Math.sin(f * Math.PI) * 3 + (WATER_Y - tip.y) * f,
        tip.z + (landing[1] - tip.z) * f,
      );
    } else {
      const under = s.phase === "bite" && !calm;
      if (under && splashed.current !== s.biteAt) {
        splashed.current = s.biteAt;
        playClick();
      }
      b.position.set(
        landing[0],
        WATER_Y +
          (under ? -0.08 + Math.sin(t * 30) * 0.05 : Math.sin(t * 2) * 0.03),
        landing[1],
      );
    }
    const pos = line.geometry.attributes.position;
    pos.setXYZ(1, b.position.x, b.position.y, b.position.z);
    pos.needsUpdate = true;
    eye.set(FISH_SPOT[0] + 1.6, 3.2, FISH_SPOT[1] + 4.2);
    look.set(landing[0] * 0.5, WATER_Y, FISH_SPOT[1] - 8 - s.distance * 0.3);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.lookAt(look);
  });
  return (
    <>
      <mesh
        position={[
          (FISH_SPOT[0] + 0.55 + tip.x) / 2,
          1.6,
          (FISH_SPOT[1] - 0.3 + tip.z) / 2,
        ]}
        rotation-x={-0.7}
      >
        <cylinderGeometry args={[0.012, 0.025, 2.2, 6]} />
        <meshStandardMaterial color="#1c1c2a" />
      </mesh>
      <primitive object={line} />
      <mesh ref={bobber} visible={false}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshBasicMaterial color={hdr("#ff2f4f", 1.6)} toneMapped={false} />
      </mesh>
    </>
  );
}

/**
 * Starboard Marina on Shore Boulevard: a T of floating docks under the
 * stars, yachts moored either side with their names in neon, the yacht
 * club's bar on the landing, benches facing the boats and a fishing spot at
 * the end of the long dock. Five casts, and the further out, the bigger
 * the fish.
 */
export function Marina({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#060a1c"]} />
      <fog attach="fog" args={["#0a1430", 30, 120]} />
      <Stars
        radius={90}
        depth={20}
        count={900}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />
      <hemisphereLight args={["#9fb8ff", "#0b2a4a", 0.9]} />
      <pointLight
        position={[0, 4, 5]}
        color="#ffe3b0"
        intensity={6}
        distance={16}
      />
      {/* the water: the room's floor, under the decks; tapping it walks
          you to the nearest point of the dock */}
      <group position-y={WATER_Y}>
        <Floor
          width={120}
          depth={120}
          center={[0, -20]}
          color="#0b2a4a"
          low={{ metalness: 0.5, roughness: 0.25 }}
          onPick={onPick}
        />
      </group>
      {DECKS.map((d, i) => (
        <mesh
          key={i}
          position={[d.x, -0.3, d.z]}
          onClick={(e) => onPick([e.point.x, e.point.z])}
        >
          <boxGeometry args={[d.w, 0.6, d.d]} />
          <meshStandardMaterial color={PLANK} roughness={0.85} />
        </mesh>
      ))}
      <Pilings />
      <PortalPads room={ROOMS.marina} color={TEAL} />
      {YACHTS.map((y, i) => (
        <Yacht key={y.name} {...y} seed={i * 2.3} />
      ))}
      {/* the moon low over the sea, and its path on the water */}
      <mesh position={[-20, 14, -90]}>
        <circleGeometry args={[4, 32]} />
        <meshBasicMaterial
          color={hdr("#fff4dc", 1.4)}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-14, WATER_Y + 0.01, -50]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3, 70]} />
        <meshBasicMaterial
          color="#fff4dc"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      {/* the yacht club's bar on the landing */}
      <mesh position={[(BAR.x0 + BAR.x1) / 2, 0.55, (BAR.z0 + BAR.z1) / 2]}>
        <boxGeometry args={[BAR.x1 - BAR.x0, 1.1, BAR.z1 - BAR.z0]} />
        <meshStandardMaterial color="#1c2a4a" />
      </mesh>
      <mesh position={[(BAR.x0 + BAR.x1) / 2, 1.13, (BAR.z0 + BAR.z1) / 2]}>
        <boxGeometry
          args={[BAR.x1 - BAR.x0 + 0.2, 0.06, BAR.z1 - BAR.z0 + 0.2]}
        />
        <meshBasicMaterial color={hdr(TEAL, 1.4)} toneMapped={false} />
      </mesh>
      <NeonText
        text="YACHT CLUB"
        color={TEAL}
        font={MARQUEE}
        width={3}
        k={2.8}
        position={[(BAR.x0 + BAR.x1) / 2, 2.2, BAR.z0 - 1.2]}
      />
      {/* benches on the landing, facing the boats */}
      {[-7, -4].map((x) => (
        <mesh key={x} position={[x, 0.42, BENCH_SEATS[0][1] + 0.05]}>
          <boxGeometry args={[1.8, 0.08, 0.45]} />
          <meshStandardMaterial color="#c8a27a" />
        </mesh>
      ))}
      <NeonText
        text="STARBOARD MARINA"
        color={TEAL}
        font={MARQUEE}
        width={5}
        k={3.2}
        position={[0, 3.2, LANDING.z1 - 0.1]}
        rotation-y={Math.PI}
      />
      <MarinaNpcs />
      <Fishing player={player} />
    </>
  );
}
