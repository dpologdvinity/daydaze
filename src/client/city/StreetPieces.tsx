// The city's street dressing: Quaternius' Downtown City MegaKit pieces (CC0,
// built by scripts/import-street.sh into public/models/street/kit.glb)
// placed where src/game/city/streetPieces.ts says. Two draw calls however
// many are loaded: the paint (crosswalks, stop and slow words, double yellow
// lines) is one alpha-blended mesh on the kit's weathered decal atlas, and
// the solids (sidewalk corner blocks, manholes, storm drains, bollards) are
// one mesh in the sidewalk's concrete. CityScene hands over the pieces on
// every plan reload (`cityStreet`); each reload merges them anew.

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { laneTint } from "../../game/city/daylight.ts";
import {
  DECAL_KINDS,
  SOLID_KINDS,
  type StreetPiece,
} from "../../game/city/streetPieces.ts";
import { createStore } from "../rooms/shared/store.ts";
import { useDaylight } from "./daylight.ts";
import { mergePieces, pieceModels } from "./streetMerge.ts";
import { SIDEWALK_GLOW, sidewalkMaterial } from "./sidewalkLook.ts";

const URL = "/models/street/kit.glb";

/** The pieces in view; set by CityScene. */
export const cityStreet = createStore({
  pieces: [] as readonly StreetPiece[],
});

/** The decal atlas, from the crosswalk's material. */
function atlasOf(scene: THREE.Object3D): THREE.Texture | null {
  let map: THREE.Texture | null = null;
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name !== "crosswalk") return;
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    if (material instanceof THREE.MeshStandardMaterial) map = material.map;
  });
  return map;
}

export function StreetPieces(): JSX.Element {
  const gltf = useGLTF(URL);
  const canvas = useThree((state) => state.gl.domElement);
  const { pieces } = cityStreet.use();
  const day = useDaylight();
  const models = useMemo(() => pieceModels(gltf.scene), [gltf]);

  const paintMaterial = useMemo(() => {
    const map = atlasOf(gltf.scene);
    if (map) {
      // the long lines tile the atlas sideways
      map.wrapS = THREE.RepeatWrapping;
      map.anisotropy = 8;
    }
    return new THREE.MeshBasicMaterial({
      map,
      // flat-lit like the rest of the city's paint (laneTint, below)
      toneMapped: false,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }, [gltf]);

  const solidMaterial = useMemo(
    () => sidewalkMaterial({ vertexColors: true }),
    [],
  );

  // paint is white by day and a dusky violet at night; the solids' glow fades
  // with the neon like the sidewalks'
  useEffect(() => {
    paintMaterial.color.setRGB(...laneTint(day.neon));
    solidMaterial.emissiveIntensity = SIDEWALK_GLOW * (0.1 + 0.9 * day.neon);
  }, [day, paintMaterial, solidMaterial]);
  useEffect(
    () => () => {
      paintMaterial.dispose();
      solidMaterial.dispose();
    },
    [paintMaterial, solidMaterial],
  );

  const paint = useMemo(
    () => mergePieces(pieces, models, DECAL_KINDS),
    [pieces, models],
  );
  const solids = useMemo(
    () => mergePieces(pieces, models, SOLID_KINDS),
    [pieces, models],
  );
  useEffect(() => () => paint?.dispose(), [paint]);
  useEffect(() => () => solids?.dispose(), [solids]);
  // read by the screenshot script and tests: the pieces are in and placed
  useEffect(() => {
    if (pieces.length > 0) canvas.dataset.street = "ready";
  }, [pieces, canvas]);

  return (
    <>
      {paint && (
        <mesh geometry={paint} material={paintMaterial} renderOrder={1} />
      )}
      {solids && <mesh geometry={solids} material={solidMaterial} />}
    </>
  );
}

useGLTF.preload(URL);
