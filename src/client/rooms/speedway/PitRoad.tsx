// Pit road along the infield edge of the oval's front straight, in the track's
// own frame (the room places this group at the track's origin, like the road):
// a painted lane on the tarmac with six numbered pit boxes, the pit crew
// working beside each car's spot, and a garage for each box behind the inner
// wall. The lane and the service box (`track.pitBox`) share PIT_LANE_Z and
// PIT_BOX_X from game/speedway/track.ts, so what you see is where you are
// serviced.

import { useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PIT_BOX_X, PIT_LANE_Z } from "../../../game/speedway/track.ts";
import { useCanvasTexture } from "./canvasTextures.ts";
import { CREW_MODEL, PERSON_SCALE, usePerson } from "./peopleModel.ts";

const GARAGE_URL = "/models/speedway/pits-garage.glb";
useGLTF.preload(GARAGE_URL);

/** The lane's width, meters: between the racing line and the inner wall. */
const LANE_WIDTH = 3.8;
const LANE_X = 34;
/** Where the garages stand: past the 3 m wall, on the infield. */
const GARAGE_Z = PIT_LANE_Z + 10.5;
/** Crew stand in the lane's wall side, facing the car. */
const CREW_Z = PIT_LANE_Z + 1.9;

/** Painted lane: asphalt, a white pit-road line, and the six boxes with their
 * numbers, all on one canvas so the whole lane is one draw. */
function paintLane(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const px = w / (LANE_X * 2);
  ctx.fillStyle = "#2a2740";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f4f1ff";
  ctx.fillRect(0, 0, w, 5);
  ctx.fillRect(0, h - 5, w, 5);
  PIT_BOX_X.forEach((bx, i) => {
    const cx = (bx + LANE_X) * px;
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 6;
    ctx.strokeRect(cx - 3.1 * px, 12, 6.2 * px, h - 24);
    ctx.fillStyle = "#ffd23f";
    ctx.font = `bold ${h * 0.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), cx - 4.2 * px, h / 2);
  });
}

export function PitRoad({
  origin = [0, -84],
}: {
  origin?: readonly [number, number];
}) {
  const { scene: garageScene } = useGLTF(GARAGE_URL);
  const person = usePerson(CREW_MODEL);
  const crewRef = useRef<THREE.InstancedMesh>(null);
  const lane = useCanvasTexture("pit-lane", 2048, 128, paintLane);

  // tire changers at the wheels and a fueler at the car's middle, per box
  const total = PIT_BOX_X.length * 3;
  useEffect(() => {
    const mesh = crewRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let idx = 0;
    PIT_BOX_X.forEach((bx) => {
      for (const dx of [-1.9, 1.9, 0]) {
        dummy.position.set(bx + dx, 0, CREW_Z);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.scale.setScalar(PERSON_SCALE * 0.62);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    });
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
  }, [total, person]);

  return (
    <group position={[origin[0], 0, origin[1]]}>
      {/* the lane, just over the road's own paint */}
      <mesh position={[0, 0.03, PIT_LANE_Z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[LANE_X * 2, LANE_WIDTH]} />
        <meshStandardMaterial map={lane} roughness={0.9} />
      </mesh>
      {PIT_BOX_X.map((bx) => (
        <primitive
          key={bx}
          object={garageScene.clone(true)}
          position={[bx, 0, GARAGE_Z]}
          rotation={[0, Math.PI, 0]}
          scale={[2.2, 2.2, 2.2]}
        />
      ))}
      {person && (
        <instancedMesh
          ref={crewRef}
          args={[person.geometry, person.material, total]}
          frustumCulled={false}
        />
      )}
    </group>
  );
}
