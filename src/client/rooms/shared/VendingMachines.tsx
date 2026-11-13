// The vending machines standing in a venue (game/vending.ts ROOM_MACHINES):
// the shared 262-triangle model, one clone per machine, its lit front a soft
// glow. The avenue's machines are instanced furniture instead (CityFurniture).

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  ROOM_MACHINES,
  machineColor,
  type VendingRoom,
} from "../../../game/vending.ts";
import { paintVending } from "../../vending/vendingLook.ts";

const URL = "/models/street/vending.glb";

export function VendingMachines({ room }: { room: VendingRoom }): JSX.Element {
  const { scene } = useGLTF(URL);
  const machines = useMemo(
    () =>
      ROOM_MACHINES[room].map((m) => {
        const copy = scene.clone(true);
        copy.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const mat = Array.isArray(o.material) ? o.material[0] : o.material;
          if (!(mat instanceof THREE.MeshStandardMaterial)) return;
          const own = mat.clone();
          paintVending(own, new THREE.Color(machineColor(m)));
          // the stock window is lit from within (the glTF's emission map)
          if (own.name === "Vending_Machine") own.emissiveIntensity = 0.5;
          o.material = own;
        });
        return { m, copy };
      }),
    [room, scene],
  );
  useEffect(
    () => () =>
      machines.forEach(({ copy }) =>
        copy.traverse((o) => {
          if (o instanceof THREE.Mesh) o.material.dispose();
        }),
      ),
    [machines],
  );
  return (
    <>
      {machines.map(({ m, copy }, i) => (
        <primitive
          key={i}
          object={copy}
          position={[m.x, 0, m.z]}
          rotation={[0, m.yaw, 0]}
        />
      ))}
    </>
  );
}

useGLTF.preload(URL);
