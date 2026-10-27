import { Stars, useGLTF } from "@react-three/drei";
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
import { Creature } from "../creatures/Creature.tsx";
import { SwimmingCreature } from "../creatures/Swimmer.tsx";
import type { FishKind } from "../../game/creatures.ts";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";
import { placePlayer } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { JetSkiRace } from "./marina/JetSkiRace.tsx";
import { MarinaNpcs } from "./marina/Npcs.tsx";
import { FLIGHT, fishing, leave, tick } from "./marina/session.ts";
import { type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles, type ShelfRow } from "./shared/Bottles.tsx";
import { GLOSS, painted, plant, stringLights } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

// weathered oak decking on tarred pilings, a navy-painted bar, teak benches
const DECKING = surface("oak_wood_planks", {
  scale: 0.8,
  color: "#d8b090",
  roughness: 0.85,
});
const PILING = surface("palm_bark", { scale: 1.5, color: "#8a6a50" });
const NAVY = surface("wood_plank_wall", { scale: 1, color: "#4a5a9a" });
const TEAK = surface("wood_veneer", { scale: 1.5, color: "#c8a27a" });
// the yacht club's bottles along the back of its bar, labels to the dock
// (the group turns them round to face -z)
const ROWS: readonly ShelfRow[] = [
  {
    x0: -(BAR.x1 - 0.2),
    x1: -(BAR.x0 + 0.2),
    y: 1.16,
    z: -(BAR.z1 - 0.12),
    count: 12,
  },
];

/** Life rings, rope coils, crates, lanterns, planters and bulbs along the
 * landing's edge. */
function buildDressing() {
  const b = new Batch();
  const ring = new THREE.TorusGeometry(0.28, 0.07, 8, 16);
  for (const [x, z] of [
    [DOCK.x0 - 0.05, -2],
    [DOCK.x1 + 0.05, -8],
    [CROSS.x1, CROSS.z1 + 0.05],
  ] as const) {
    b.add(painted(ring, "#f4f4f0"), GLOSS, {
      position: [x, 0.5, z],
      rotation: [0, Math.PI / 2, 0],
    });
    for (let q = 0; q < 4; q++)
      b.add(
        painted(
          new THREE.TorusGeometry(0.28, 0.072, 8, 3, Math.PI / 4),
          "#d8323a",
        ),
        GLOSS,
        {
          position: [x, 0.5, z],
          rotation: [q * (Math.PI / 2), Math.PI / 2, 0],
        },
      );
  }
  const coil = new THREE.TorusGeometry(0.2, 0.05, 6, 14);
  for (const [x, z] of [
    [1.1, -4],
    [-1.1, -10],
    [6.5, -6.2],
  ] as const)
    for (let k = 0; k < 3; k++)
      b.add(painted(coil, "#d8c8a0"), GLOSS, {
        position: [x, 0.03 + k * 0.08, z],
        rotation: [Math.PI / 2, 0, 0],
        scale: 1 - k * 0.18,
      });
  for (const [x, z] of [
    [-8.4, 8.4],
    [8.4, 8.4],
    [-2.4, 3.4],
    [2.4, 3.4],
  ] as const)
    plant(b, { x, z }, 1.3);
  stringLights(
    b,
    [LANDING.x0, 1.8, LANDING.z0],
    [DOCK.x0, 1.8, LANDING.z0],
    10,
    "#ffe3b0",
    0.25,
  );
  stringLights(
    b,
    [DOCK.x1, 1.8, LANDING.z0],
    [LANDING.x1, 1.8, LANDING.z0],
    10,
    "#ffe3b0",
    0.25,
  );
  return b.build();
}
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const TEAL = "#3fe0d0";
const WATER_Y = -0.5;

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
      <primitive object={PILING} attach="material" />
    </instancedMesh>
  );
}

/** Downloaded boats, fitted to their berths and rocked gently on the swell. */
function Yacht({
  at,
  length,
  seed,
}: (typeof YACHTS)[number] & { seed: number }) {
  const calm = useReducedMotion();
  const boat = useRef<THREE.Group>(null);
  const gltf = useGLTF(
    seed > 4 ? "/models/marina/sailboat.glb" : "/models/marina/yacht.glb",
  );
  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -bounds.min.y, -center.z);
    return {
      root,
      scale: length / Math.max(size.x, size.z),
      turn: size.x > size.z ? Math.PI / 2 : 0,
    };
  }, [gltf, length]);
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
      <group rotation-y={model.turn} scale={model.scale}>
        <primitive object={model.root} />
      </group>
    </group>
  );
}

/** Cargo on the landing, sized from the downloaded models. */
function Cargo({
  kind,
  at,
  size,
}: {
  kind: "crate" | "barrel";
  at: [number, number];
  size: number;
}) {
  const gltf = useGLTF(`/models/marina/${kind}.glb`);
  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const extent = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -bounds.min.y, -center.z);
    return { root, scale: size / Math.max(extent.x, extent.y, extent.z) };
  }, [gltf, size]);
  return (
    <group position={[at[0], 0, at[1]]} scale={model.scale}>
      <primitive object={model.root} />
    </group>
  );
}

const CATCH_MODELS: Record<string, FishKind> = {
  Sardine: "fish1",
  Mackerel: "fish2",
  "Sea bass": "fish3",
  "Red snapper": "cute-goldfish",
  Yellowtail: "cute-yellowtang",
  "Sunset marlin": "fish3",
};

function MarinaFish() {
  return (
    <>
      {(["fish1", "fish2", "cute-yellowtang"] as const).map((kind, i) => (
        <SwimmingCreature
          key={kind}
          kind={kind}
          scale={2.5}
          path={(t, p) => {
            const angle = t * 0.25 + i * 2;
            p.x = Math.cos(angle) * 3.5;
            p.y = WATER_Y - 0.12;
            p.z = -3 + Math.sin(angle) * 2.5;
            p.yaw = -angle;
          }}
        />
      ))}
    </>
  );
}

/** The fishing rod in its holder at the end of the dock, the line and the
 * bobber, and the camera over your shoulder while you fish. */
function Fishing({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const state = fishing.use();
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
      {state.phase === "result" && state.last?.outcome === "landed" && (
        <Creature
          kind={CATCH_MODELS[state.last.species] ?? "fish1"}
          scale={2}
          drive={(_dt, p) => {
            p.x = FISH_SPOT[0] + 0.8;
            p.y = 1.3;
            p.z = FISH_SPOT[1] - 2;
            p.yaw = Math.PI / 2;
            p.clip = "swim";
          }}
        />
      )}
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
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#060a1c"]} />
      <primitive object={dressing} />
      <group rotation-y={Math.PI}>
        <Bottles rows={ROWS} seed={37} />
      </group>
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
      <JetSkiRace />
      <pointLight
        position={[0, 4, 5]}
        color="#ffe3b0"
        intensity={6}
        distance={16}
      />
      {/* the water: the room's floor, under the decks; tapping it walks
          you to the nearest point of the dock */}
      <group position-y={WATER_Y}>
        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, 0, -20]}
          onClick={(e) => {
            if (e.delta <= 6) {
              e.stopPropagation();
              onPick([e.point.x, e.point.z]);
            }
          }}
        >
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial
            color="#0b2a4a"
            metalness={0.5}
            roughness={0.25}
            transparent
            opacity={0.68}
            depthWrite={false}
          />
        </mesh>
      </group>
      {DECKS.map((d, i) => (
        <mesh
          key={i}
          position={[d.x, -0.3, d.z]}
          onClick={(e) => onPick([e.point.x, e.point.z])}
          material={DECKING}
        >
          <boxGeometry args={[d.w, 0.6, d.d]} />
        </mesh>
      ))}
      <Cargo kind="crate" at={[-8.2, 4]} size={0.7} />
      <Cargo kind="crate" at={[-7.5, 4.2]} size={0.5} />
      <Cargo kind="barrel" at={[-8.4, 5]} size={0.7} />
      <MarinaFish />
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
      <mesh
        position={[(BAR.x0 + BAR.x1) / 2, 0.55, (BAR.z0 + BAR.z1) / 2]}
        material={NAVY}
      >
        <boxGeometry args={[BAR.x1 - BAR.x0, 1.1, BAR.z1 - BAR.z0]} />
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
        <mesh
          key={x}
          position={[x, 0.42, BENCH_SEATS[0][1] + 0.05]}
          material={TEAK}
        >
          <boxGeometry args={[1.8, 0.08, 0.45]} />
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
