// Creates offscreen 2D canvases for painted textures. Throws when the browser
// has no 2D context.

/**
 * A canvas of the given pixel size and its 2D context. By default it is set
 * up for frequent getImageData reads, which keeps it on the CPU; pass
 * `readback = false` for a canvas that is only painted and uploaded as a
 * texture, so the browser can rasterize it on the GPU (gradients, blurs and
 * large fills are many times faster there).
 */
export function makeCanvas(width: number, height: number, readback = true) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: readback });
  if (!ctx) throw new Error("This browser cannot draw to a 2D canvas.");
  return { canvas, ctx };
}
