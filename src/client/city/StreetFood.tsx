// Downloaded street-food models: one instanced cart mesh, pooled truck motion,
// nearby vendors. Timers own UI/audio; the frame callback only mutates meshes.
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  FOOD_CARTS,
  FOOD_DRAW_RANGE,
  FOOD_NAMES,
  ICE_CREAM_ROUTE,
  visibleFoodVendors,
  canOrderFood,
  type FoodKind,
} from "../../game/city/vendors.ts";
import { DEFAULT_LOOK } from "../../game/look.ts";
import {
  jingleLevel,
  jingleNote,
  playIceCreamNote,
} from "../../audio/iceCream.ts";
import type { Player } from "../world/PlayerController.tsx";
import { isSceneReady } from "../world/ready.ts";
import { TalkingNpc } from "../rooms/shared/TalkingNpc.tsx";
import { partsOf, dimMeshes } from "./CityFurniture.tsx";
import { disposeInstanced } from "./dispose.ts";
import { useDaylight } from "./daylight.ts";
import { boxMapped } from "./worldTexture.ts";
import { foodMotion, foodVendors, walkingForFood } from "./foodVendors.ts";

// A shared neutral map enables boxMapped's weathering over vertex colors.
const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WHITE.needsUpdate = true;

export function StreetFood({ player }: { player: Player }) {
  const assets = useGLTF([
    "/models/vendors/truck.glb",
    "/models/vendors/cart.glb",
  ]);
  const truck = useRef<THREE.Group>(null);
  const colors = useMemo(
    () => FOOD_CARTS.map((cart) => new THREE.Color(cart.color)),
    [],
  );
  const state = foodVendors.use();
  const parts = useMemo(
    () =>
      assets.map((gltf, i) => {
        const meshes = partsOf(
          gltf.scene,
          null,
          i === 0 ? 1 : FOOD_CARTS.length,
        );
        for (const mesh of meshes) {
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.map = WHITE;
            boxMapped(mesh.material, 0.5, { weather: true });
          }
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          if (i === 1)
            for (let j = 0; j < FOOD_CARTS.length; j++)
              mesh.setColorAt(j, new THREE.Color(1, 1, 1));
        }
        return meshes;
      }),
    [assets],
  );
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const day = useDaylight();
  useEffect(() => {
    for (const meshes of parts) dimMeshes(meshes, 1 - 0.55 * day.neon);
  }, [parts, day.neon]);
  useEffect(() => {
    foodMotion.player = player;
    foodMotion.origin = null;
    let lastNote = -1;
    const tick = () => {
      if (!isSceneReady() || foodMotion.origin === null) return;
      const t = performance.now() / 1000 - foodMotion.origin;
      const pose = foodMotion.pose;
      ICE_CREAM_ROUTE.at(t, pose);
      const at: [number, number] = [player.pos.x, player.pos.z];
      let near: FoodKind | null = canOrderFood(
        "ice-cream",
        at,
        pose,
        walkingForFood(),
      )
        ? "ice-cream"
        : null;
      const vendors = visibleFoodVendors(at);
      for (let i = 0; i < FOOD_CARTS.length; i++) {
        const c = FOOD_CARTS[i];
        if (!near && canOrderFood(c.kind, at, pose, walkingForFood()))
          near = c.kind;
      }
      const s = foodVendors.get();
      if (s.near !== near || s.vendors !== vendors || s.stop !== pose.stop)
        foodVendors.set({ near, vendors, stop: pose.stop });
      const noteIndex = Math.floor(t / 0.4);
      if (lastNote !== noteIndex) {
        lastNote = noteIndex;
        const note = jingleNote(t);
        if (note !== null)
          playIceCreamNote(
            note,
            jingleLevel(Math.hypot(pose.x - at[0], pose.z - at[1])),
          );
      }
    };
    const timer = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(timer);
      foodMotion.player = null;
      foodMotion.origin = null;
      foodVendors.set({ near: null, vendors: 0, stop: -1 });
      for (const meshes of parts) disposeInstanced(meshes, true);
    };
  }, [player, parts]);
  useFrame(({ gl }) => {
    if (!isSceneReady()) return;
    const now = performance.now() / 1000;
    if (foodMotion.origin === null) foodMotion.origin = now;
    const pose = foodMotion.pose;
    ICE_CREAM_ROUTE.at(now - foodMotion.origin, pose);
    if (truck.current) {
      truck.current.visible =
        Math.hypot(pose.x - player.pos.x, pose.z - player.pos.z) <
        FOOD_DRAW_RANGE;
      truck.current.position.set(pose.x, 0, pose.z);
      truck.current.rotation.y = pose.yaw;
    }
    let count = 0;
    for (let i = 0; i < FOOD_CARTS.length; i++) {
      const cart = FOOD_CARTS[i];
      if (
        Math.hypot(cart.at[0] - player.pos.x, cart.at[1] - player.pos.z) >
        FOOD_DRAW_RANGE
      )
        continue;
      scratch.position.set(cart.at[0], 0.14, cart.at[1]);
      scratch.rotation.set(0, 0, 0);
      scratch.updateMatrix();
      for (let k = 0; k < parts[1].length; k++) {
        parts[1][k].setMatrixAt(count, scratch.matrix);
        parts[1][k].setColorAt(count, colors[i]);
      }
      count++;
    }
    for (let k = 0; k < parts[1].length; k++) {
      const mesh = parts[1][k];
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // Fixed strings only: no formatting or UI allocations in this callback.
    gl.domElement.dataset.streetFood = "ready";
  });
  useEffect(() => {
    scratch.position.set(0, 0, 0);
    scratch.rotation.set(0, 0, 0);
    scratch.updateMatrix();
    for (const mesh of parts[0]) {
      mesh.setMatrixAt(0, scratch.matrix);
      mesh.count = 1;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [parts, scratch]);
  useEffect(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.dataset.iceCreamStop = String(state.stop);
      canvas.dataset.foodNear = state.near ?? "";
      canvas.dataset.foodVendors = String(state.vendors);
    }
  }, [state.stop, state.near, state.vendors]);
  return (
    <>
      <group ref={truck}>
        {parts[0].map((mesh) => (
          <primitive key={mesh.uuid} object={mesh} />
        ))}
        <Html position={[0, 3.4, 0]} center distanceFactor={16}>
          <span className="food-world-label">SCOOP LOOP</span>
        </Html>
      </group>
      {parts[1].map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {FOOD_CARTS.map((cart, index) =>
        (state.vendors & (1 << index)) !== 0 ? (
          <Suspense key={cart.kind} fallback={null}>
            <TalkingNpc
              key={cart.kind}
              name={FOOD_NAMES[cart.kind]}
              role="street-food-vendor"
              look={{
                ...DEFAULT_LOOK,
                hairStyle: "bob",
                outfit: "jeans",
                outfitColor: "#f2e6c8",
              }}
              mood="idle"
              at={[cart.at[0], 0.14, cart.at[1] - 1]}
              rot={0}
              seed={1400 + index}
              context={{}}
            />
            <Html
              position={[cart.at[0], 3, cart.at[1]]}
              center
              distanceFactor={16}
            >
              <span className="food-world-label">{FOOD_NAMES[cart.kind]}</span>
            </Html>
          </Suspense>
        ) : null,
      )}
    </>
  );
}
