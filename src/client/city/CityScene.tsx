import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import { ALL_CELLS, cellsWithin, VIEW_RADIUS } from "../../game/city/cells.ts";
import { KINDS, planCity } from "../../game/city/plan.ts";
import type { Vec2 } from "../../game/walk.ts";
import type { PickHandler } from "../rooms/shared/Floor.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";
import { createKindMeshes, disposeKindMeshes, writeKind } from "./meshes.ts";

// Enough for the busiest view of the whole city, so meshes never reallocate.
const WHOLE_CITY = planCity(ALL_CELLS, 0, [0, 0]);
const CAPACITY = Math.max(...KINDS.map((k) => WHOLE_CITY.instances[k].length));

const LIGHT_INTENSITY = 6;

/**
 * The downtown slice. Cells within VIEW_RADIUS of the player are written into
 * one InstancedMesh per kind, and only when the set of loaded cells changes.
 */
export function CityScene({
  player,
  onPick,
}: {
  player: Player;
  onPick: PickHandler;
}) {
  const tier = useQuality();
  // the key light is the World's; these are the city's real lights
  const lightCount = tier === "high" ? 6 : 2;
  const meshes = useMemo(() => createKindMeshes(CAPACITY), []);
  useEffect(() => () => disposeKindMeshes(meshes), [meshes]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const loaded = useRef("");

  useFrame(({ gl }) => {
    const at: Vec2 = [player.pos.x, player.pos.z];
    const cells = cellsWithin(at, VIEW_RADIUS);
    const key = cells.map((c) => c.key).join(" ");
    if (key !== loaded.current) {
      loaded.current = key;
      const plan = planCity(cells, lightCount, at);
      for (const kind of KINDS)
        writeKind(meshes[kind], kind, plan.instances[kind]);
      lights.current.forEach((light, i) => {
        if (!light) return;
        const sign = plan.lights[i];
        light.intensity = sign ? LIGHT_INTENSITY : 0;
        if (sign) {
          light.position.set(sign.x, sign.y, sign.z);
          light.color.set(sign.color);
        }
      });
    }
    // read by tests and screenshots; the counts are last frame's
    const dom = gl.domElement.dataset;
    dom.player = `${at[0].toFixed(2)},${at[1].toFixed(2)}`;
    dom.drawCalls = String(gl.info.render.calls);
    dom.triangles = String(gl.info.render.triangles);
  });

  // a drag orbits the camera; only a click walks the player
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick([e.point.x, e.point.z]);
  };

  return (
    <>
      <color attach="background" args={["#0a0618"]} />
      <fog attach="fog" args={["#120a26", 120, 420]} />
      <hemisphereLight args={["#8fa6ff", "#2a1038", 1.2]} />
      {Array.from({ length: lightCount }, (_, i) => (
        <pointLight
          key={i}
          ref={(light) => {
            lights.current[i] = light;
          }}
          distance={34}
          decay={2}
          intensity={0}
        />
      ))}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, 0]}
        onClick={click}
        name="city-ground"
      >
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#0d0a1c" roughness={0.9} />
      </mesh>
      {KINDS.map((kind) => (
        <primitive key={kind} object={meshes[kind]} onClick={click} />
      ))}
    </>
  );
}
