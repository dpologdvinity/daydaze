import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { LIMB_SPOTS, type Limbs, type LimbSpot } from "../../../game/look.ts";

// The pylon and ankle adapter of the "leg prosthesis" by victorghys
// (Sketchfab, CC-BY), cut and fitted by art/doll/blender/prosthesis.py: 1 m
// long, hanging down from y = 0.
const URL = "/models/doll/prosthesis.glb";

/** The doll's shin bone for each leg (Mixamo naming). */
export const SHIN: Record<LimbSpot, string> = {
  legL: "mixamorigLeftLeg",
  legR: "mixamorigRightLeg",
};
const FOOT: Record<LimbSpot, string> = {
  legL: "mixamorigLeftFoot",
  legR: "mixamorigRightFoot",
};
/** Every bone whose skin goes with a prosthesis: the shin, and the foot and
 * toes (hidden inside her shoe anyway, and the ankle's skin is skinned to
 * the foot bone, so it would show as a sock above the shoe). */
export const HIDDEN_BONES: Record<LimbSpot, readonly string[]> = {
  legL: [SHIN.legL, FOOT.legL, "mixamorigLeftToeBase"],
  legR: [SHIN.legR, FOOT.legR, "mixamorigRightToeBase"],
};

/** The pylon is thinner than a shin: its width as a share of its length. */
const WIDTH = 0.2;
/** A soft liner cuff around the knee, hiding the skin's cut edge there. */
const CUFF = new THREE.CylinderGeometry(0.037, 0.033, 0.1, 20, 1, true);
const LINER = new THREE.MeshStandardMaterial({
  color: "#2a2d33",
  roughness: 0.8,
  side: THREE.DoubleSide,
});

const rest = new THREE.Matrix4();
const knee = new THREE.Vector3();
const ankle = new THREE.Vector3();
const down = new THREE.Vector3(0, -1, 0);

/**
 * A prosthetic pylon for each limb marked "prosthetic": hung from the shin
 * bone (so it bends with every pose and clip) from the knee to the ankle, in
 * place of the skin over the shin, which is discarded in the skin shader
 * (`shinHide`, HumanDoll). Her own foot stays, in her shoe, and a long
 * trouser leg or boot still covers the pylon.
 */
export function Prosthetics({
  limbs,
  bones,
  restInverse,
  shinHide,
}: {
  limbs: Limbs;
  bones: Map<string, THREE.Bone>;
  restInverse: Map<string, THREE.Matrix4>;
  shinHide: THREE.IUniform<THREE.Vector2>;
}) {
  const { scene } = useGLTF(URL);
  const worn = useMemo(() => {
    const out: { group: THREE.Group; bone: THREE.Bone }[] = [];
    for (const spot of LIMB_SPOTS) {
      if (limbs[spot.id] !== "prosthetic") continue;
      const bone = bones.get(SHIN[spot.id]);
      const inv = restInverse.get(SHIN[spot.id]);
      const footInv = restInverse.get(FOOT[spot.id]);
      if (!bone || !inv || !footInv) continue;
      // the knee and ankle in the shin bone's own rest frame
      knee.setFromMatrixPosition(rest.copy(inv).invert()).applyMatrix4(inv);
      ankle
        .setFromMatrixPosition(rest.copy(footInv).invert())
        .applyMatrix4(inv);
      const along = ankle.clone().sub(knee);
      const length = along.length();
      const group = new THREE.Group();
      const pylon = scene.clone(true);
      pylon.scale.set(WIDTH * length, length, WIDTH * length);
      group.add(pylon);
      const cuff = new THREE.Mesh(CUFF, LINER);
      cuff.position.y = -0.02;
      group.add(cuff);
      group.quaternion.setFromUnitVectors(down, along.normalize());
      group.position.copy(knee);
      out.push({ group, bone });
    }
    return out;
  }, [limbs, bones, restInverse, scene]);

  useEffect(() => {
    for (const { group, bone } of worn) bone.add(group);
    shinHide.value.set(
      limbs.legL === "prosthetic" ? 1 : 0,
      limbs.legR === "prosthetic" ? 1 : 0,
    );
    return () => {
      for (const { group, bone } of worn) bone.remove(group);
      shinHide.value.set(0, 0);
    };
  }, [worn, limbs, shinHide]);
  return null;
}
