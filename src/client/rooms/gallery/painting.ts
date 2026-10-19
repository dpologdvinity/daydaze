import { useEffect, useState } from "react";
import * as THREE from "three";
import { cleanPainting, PAINTING_KEY } from "../../../game/painting.ts";
import { createStore } from "../shared/store.ts";

function load(): string | null {
  try {
    return cleanPainting(localStorage.getItem(PAINTING_KEY));
  } catch {
    return null;
  }
}

/** The player's painting on the open wall (a PNG data URL), and whether the
 * easel is open. */
export const painting = createStore({ url: load(), easel: false });

/** Keeps the painting; false when storage refuses it (full, or private). */
export function hang(url: string): boolean {
  const clean = cleanPainting(url);
  if (!clean) return false;
  try {
    localStorage.setItem(PAINTING_KEY, clean);
  } catch {
    return false;
  }
  painting.set({ url: clean });
  return true;
}

/** The hung painting as a texture, or null while there's none (or it's
 * still decoding). */
export function usePaintingTexture(): THREE.Texture | null {
  const { url } = painting.use();
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    let live = true;
    const t = new THREE.TextureLoader().load(url, () => {
      if (live) setTex(t);
    });
    t.colorSpace = THREE.SRGBColorSpace;
    return () => {
      live = false;
      t.dispose();
    };
  }, [url]);
  return tex;
}
