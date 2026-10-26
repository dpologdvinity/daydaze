// Zooming on your own character. The wheel and pinch scale the whole camera
// rig (camera and orbit target together) about a point on her, so every zoom
// step closes in on her from wherever the camera is: from a room's overview,
// whose orbit target sits far from her, as much as from a close-up. Far out
// the point is her chest; close in it rises to her face, so the closest zoom
// is a portrait. Pure: positions are plain [x, y, z] tuples.

export type Vec3 = readonly [number, number, number];

/** Heights on the doll (meters above her feet) the zoom closes in on. */
export const CHEST_HEIGHT = 1.1;
export const FACE_HEIGHT = 1.55;
/** Nearest the camera comes to her: her face fills the screen. */
export const MIN_ZOOM = 0.55;
/** One wheel notch zooms in by this factor (its inverse zooms out). */
export const ZOOM_STEP = 0.88;
/** Within this distance the zoom point starts rising from chest to face. */
const RISE_FROM = 3;

/** The height on her the camera zooms toward, at `distance` meters away. */
export function focusHeight(distance: number): number {
  const t = Math.min(
    1,
    Math.max(0, (RISE_FROM - distance) / (RISE_FROM - MIN_ZOOM)),
  );
  return CHEST_HEIGHT + (FACE_HEIGHT - CHEST_HEIGHT) * t;
}

/**
 * Scales camera and target about `focus` by `k` (< 1 zooms in), clamping the
 * camera's distance to `focus` within [min, max]. The direction from her to
 * the camera never changes, so a zoom never swings the view.
 */
export function zoomAbout(
  camera: Vec3,
  target: Vec3,
  focus: Vec3,
  k: number,
  min: number,
  max: number,
): { camera: Vec3; target: Vec3 } {
  const d = Math.hypot(
    camera[0] - focus[0],
    camera[1] - focus[1],
    camera[2] - focus[2],
  );
  if (d === 0) return { camera, target };
  const s = Math.min(max, Math.max(min, d * k)) / d;
  const about = (p: Vec3): Vec3 => [
    focus[0] + (p[0] - focus[0]) * s,
    focus[1] + (p[1] - focus[1]) * s,
    focus[2] + (p[2] - focus[2]) * s,
  ];
  return { camera: about(camera), target: about(target) };
}
