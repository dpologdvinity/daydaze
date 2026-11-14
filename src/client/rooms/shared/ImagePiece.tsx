// A painting on a wall (Gallery 44, the food rooms): an image piece fitted to
// its slot by the loaded image's own aspect, in the frame the room passes. Suspends while the WebP
// loads, so wrap it in Suspense (the wall stays bare until then).

import type { JSX } from "react";
import * as THREE from "three";
import {
  artworkUrl,
  fitInside,
  type ArtworkId,
} from "../../../game/artworks.ts";
import { textureAspect, useArtTexture } from "./artTexture.ts";

const BOX = new THREE.BoxGeometry(1, 1, 1);

/** A hung painting: `at` and `ry` place its slot's center on the wall (it faces
 * +z turned by `ry`); the picture is the largest that fits `maxW` by `maxH`. */
export function ImagePiece({
  art,
  at,
  ry,
  maxW,
  maxH,
  frame,
}: {
  art: ArtworkId;
  at: readonly [number, number, number];
  ry: number;
  maxW: number;
  maxH: number;
  frame: THREE.Material;
}): JSX.Element {
  const tex = useArtTexture(artworkUrl(art));
  const { w, h } = fitInside(textureAspect(tex), maxW, maxH);
  return (
    <group position={[...at]} rotation-y={ry}>
      <mesh geometry={BOX} material={frame} scale={[w + 0.1, h + 0.1, 0.05]} />
      <mesh position-z={0.03}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  );
}
