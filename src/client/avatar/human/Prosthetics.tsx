import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { LIMB_SPOTS, type Limbs, type LimbSpot } from "../../../game/look.ts";

// The lower leg of the "leg prosthesis" by victorghys (Sketchfab, CC-BY),
// cut and fitted by art/doll/blender/prosthesis.py: 1 m long, hanging down
// from y = 0, the toe toward +z.
const URL = "/models/doll/prosthesis.glb";

/** The doll's shin bone for each leg (Mixamo naming). */
const LEG: Record<LimbSpot, { shin: string; side: 1 | -1 }> = {
  legL: { shin: "mixamorigLeftLeg", side: 1 },
  legR: { shin: "mixamorigRightLeg", side: -1 },
};

/** Shrinking a bone this much hides what is skinned to it (the real shin,
 * ankle, foot and shoe); the prosthesis is scaled up by the same factor so it
 * comes out at its own size. */
const HIDE = 0.001;

const rest = new THREE.Matrix4();
const at = new THREE.Vector3();

/**
 * A prosthetic lower leg in place of each limb marked "prosthetic": hung from
 * the shin bone at the knee (so it bends with every pose and clip), scaled to
 * the doll's own knee height. The natural shin and foot below the knee are
 * shrunk away with the bone, so the thigh stays and the rest is the prosthesis.
 */
export function Prosthetics({
  limbs,
  bones,
  restInverse,
}: {
  limbs: Limbs;
  bones: Map<string, THREE.Bone>;
  restInverse: Map<string, THREE.Matrix4>;
}) {
  const { scene } = useGLTF(URL);
  const worn = useMemo(() => {
    const out: { group: THREE.Group; bone: THREE.Bone }[] = [];
    for (const spot of LIMB_SPOTS) {
      if (limbs[spot.id] !== "prosthetic") continue;
      const { shin, side } = LEG[spot.id];
      const bone = bones.get(shin);
      const inv = restInverse.get(shin);
      if (!bone || !inv) continue;
      // rest-pose model space: the knee is the shin bone's head; its height
      // above the floor sets the prosthesis' length
      at.setFromMatrixPosition(rest.copy(inv).invert());
      const group = new THREE.Group();
      group.add(scene.clone(true));
      group.scale.set(side, 1, 1).multiplyScalar(at.y);
      group.position.copy(at);
      group.updateMatrix();
      // model space (rest) into the bone's frame, then undo the bone's shrink
      group.applyMatrix4(inv);
      group.scale.divideScalar(HIDE);
      group.position.divideScalar(HIDE);
      out.push({ group, bone });
    }
    return out;
  }, [limbs, bones, restInverse, scene]);

  useEffect(() => {
    for (const { group, bone } of worn) {
      bone.add(group);
      bone.scale.setScalar(HIDE);
    }
    return () => {
      for (const { group, bone } of worn) {
        bone.remove(group);
        bone.scale.setScalar(1);
      }
    };
  }, [worn]);
  return null;
}

useGLTF.preload(URL);
