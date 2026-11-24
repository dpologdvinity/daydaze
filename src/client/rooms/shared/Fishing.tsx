// Reusable fishing presentation for all spots (marina, boardwalk, farm, forest, open-water).
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playClick } from "../../../audio/worldSounds.ts";
import { FISHING_SPOTS, type FishingSpotId } from "../../../game/fishing.ts";
import type { FishKind } from "../../../game/creatures.ts";
import { Creature } from "../../creatures/Creature.tsx";
import { useReducedMotion } from "../../motion.ts";
import { placePlayer, type Player } from "../../world/PlayerController.tsx";
import { cameraHold } from "../../world/cameraHold.ts";
import { FLIGHT, fishing, leave, tick } from "../marina/session.ts";
import { useGameClip } from "./game3d/gameClip.ts";
import { hdr } from "./materials.ts";

const CATCH_MODELS: Record<string, FishKind> = {
  Sardine: "fish1",
  Mackerel: "fish2",
  "Sea bass": "fish3",
  "Red snapper": "cute-goldfish",
  Yellowtail: "cute-yellowtang",
  "Sunset marlin": "fish3",
  Minnow: "cute-tetra",
  Bluegill: "cute-cardinalfish",
  "Pond perch": "fish1",
  "Mud carp": "cute-koi",
  "Golden koi": "cute-goldfish",
  "Brook trout": "fish2",
  "Rainbow trout": "fish1",
  "Smallmouth bass": "fish3",
  "Silver salmon": "fish2",
  Pike: "fish3",
  Kingfish: "fish2",
  "Giant trevally": "fish1",
  "Bluefin tuna": "fish3",
};

/** The fishing rod in its holder at the spot, the line and the
 * bobber, and the camera over your shoulder while you fish. */
export function Fishing({
  player,
  spot,
}: {
  player: Player;
  spot: FishingSpotId;
}) {
  const spotDef = FISHING_SPOTS[spot];
  const FISH_SPOT = spotDef.position;
  const dir = spotDef.dir;
  const WATER_Y = spotDef.waterY;
  const calm = useReducedMotion();
  const state = fishing.use();
  const clip =
    state.phase === "off" || state.phase === "over" || state.spot !== spot
      ? null
      : state.phase === "flying" || state.phase === "result"
        ? "fishing-cast"
        : "fishing-idle";
  useGameClip("fishing", clip);
  const camera = useThree((st) => st.camera);
  const bobber = useRef<THREE.Mesh>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const tip = useMemo(
    () => new THREE.Vector3(FISH_SPOT[0] + 0.7, 2.4, FISH_SPOT[1] + dir * 1.9),
    [FISH_SPOT, dir],
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
  const seat = useRef<Player["seat"]>(null);
  useEffect(
    () => () => {
      leave();
      if (player.seat === seat.current) player.seat = null;
      if (cameraHold.by === "fishing") cameraHold.by = null;
    },
    [player],
  );
  useFrame(({ clock }, dt) => {
    const now = performance.now();
    tick(now);
    const s = fishing.get();
    if (s.phase !== "off" && s.spot === spot) cameraHold.by = "fishing";
    else if (cameraHold.by === "fishing") cameraHold.by = null;
    const b = bobber.current;
    if (!b) return;
    if (s.phase === "off" || s.spot !== spot) {
      if (seat.current && player.seat === seat.current) {
        player.seat = null;
        seat.current = null;
        placePlayer(player, FISH_SPOT[0], FISH_SPOT[1]);
      }
      b.visible = false;
      line.visible = false;
      return;
    }
    // stand her at the fishing spot, facing the water
    // eslint-disable-next-line no-restricted-syntax -- one-time lazy init of the player's seat, not per frame
    if (!seat.current) seat.current = { position: new THREE.Vector3(), yaw: 0 };
    player.seat = seat.current;
    player.seat.position.set(FISH_SPOT[0], 0.02, FISH_SPOT[1]);
    player.seat.yaw = spotDef.yaw;
    player.seat.sit = false;
    const out = FISH_SPOT[1] + dir * s.distance;
    const landingX = FISH_SPOT[0] + 0.7;
    const t = clock.elapsedTime;
    const cast = s.phase !== "power" && s.phase !== "over";
    b.visible = cast;
    line.visible = cast;
    if (s.phase === "flying") {
      const f = Math.min(1, (now - s.since) / (FLIGHT * 1000));
      b.position.set(
        tip.x + (landingX - tip.x) * f,
        tip.y + Math.sin(f * Math.PI) * 3 + (WATER_Y - tip.y) * f,
        tip.z + (out - tip.z) * f,
      );
    } else {
      const under = s.phase === "bite" && !calm;
      if (under && splashed.current !== s.biteAt) {
        splashed.current = s.biteAt;
        playClick();
      }
      b.position.set(
        landingX,
        WATER_Y +
          (under ? -0.08 + Math.sin(t * 30) * 0.05 : Math.sin(t * 2) * 0.03),
        out,
      );
    }
    const pos = line.geometry.attributes.position;
    pos.setXYZ(1, b.position.x, b.position.y, b.position.z);
    pos.needsUpdate = true;
    eye.set(FISH_SPOT[0] + 1.6, 3.2, FISH_SPOT[1] - dir * 4.2);
    look.set(
      FISH_SPOT[0],
      WATER_Y,
      FISH_SPOT[1] + dir * (8 + s.distance * 0.3),
    );
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.lookAt(look);
  });
  return (
    <>
      {/* its own boundary: a species not caught yet loads its model, and
          that must not suspend (blank) the whole room meanwhile */}
      {state.phase === "result" && state.last?.outcome === "landed" && (
        <Suspense fallback={null}>
          <Creature
            kind={CATCH_MODELS[state.last.species] ?? "fish1"}
            scale={2}
            drive={(_dt, p) => {
              p.x = FISH_SPOT[0] + 0.8;
              p.y = 1.3;
              p.z = FISH_SPOT[1] + dir * 2;
              p.yaw = Math.PI / 2;
              p.clip = "swim";
            }}
          />
        </Suspense>
      )}
      <mesh
        position={[
          (FISH_SPOT[0] + 0.55 + tip.x) / 2,
          1.6,
          (FISH_SPOT[1] + dir * 0.3 + tip.z) / 2,
        ]}
        rotation-x={dir * 0.7}
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
