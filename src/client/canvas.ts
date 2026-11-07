// Creates offscreen 2D canvases for painted textures. Throws when the browser
// has no 2D context.

/**
 * A canvas of the given pixel size and its 2D context, set up for frequent
 * getImageData reads.
 */
export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot draw to a 2D canvas.");
  return { canvas, ctx };
}
