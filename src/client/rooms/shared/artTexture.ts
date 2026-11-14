// Painting images as textures: a hook over drei's useTexture (suspends while the
// WebP loads, and caches it per URL) that marks the image sRGB, and a reader for
// the loaded image's aspect, since the paintings are not all the same shape.

import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";

/** The painting at `url` (see artworkUrl in game/artworks.ts) as a color texture. */
export function useArtTexture(url: string): THREE.Texture {
  const tex = useTexture(url);
  // the texture is cached and shared; this runs before the frame that draws it
  useLayoutEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4; // paintings are seen at a slant down a wall
    tex.needsUpdate = true;
  }, [tex]);
  return tex;
}

/** Width over height of the texture's loaded image; 1 when it has none yet. */
export function textureAspect(tex: THREE.Texture): number {
  const img: unknown = tex.image;
  if (
    typeof img === "object" &&
    img !== null &&
    "width" in img &&
    "height" in img &&
    typeof img.width === "number" &&
    typeof img.height === "number" &&
    img.height > 0
  )
    return img.width / img.height;
  return 1;
}
