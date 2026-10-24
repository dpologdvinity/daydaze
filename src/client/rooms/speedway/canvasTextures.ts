// Canvas-painted textures for the Speedway, and the seeded random generator
// their paint functions use so the art is the same every visit.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Paints a texture onto a `w` by `h` canvas context. */
export type Paint = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) => void;

/** A 0..1 generator that repeats for a seed, so the canvas art is the same every visit. */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * A canvas texture painted once per `key`. `key` must name everything the paint
 * depends on, since the paint function is not compared.
 */
export function useCanvasTexture(
  key: string,
  w: number,
  h: number,
  paint: Paint,
  repeat = false,
): THREE.CanvasTexture {
  // `key` decides when to repaint (the contract above), so the paint function
  // itself is read from a ref rather than compared
  const latestPaint = useRef(paint);
  latestPaint.current = paint;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) latestPaint.current(ctx, w, h);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    // the key names the texture too, which helps in a three.js inspector
    t.name = key;
    if (repeat) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    }
    return t;
  }, [key, w, h, repeat]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
