// Zooming on your own character. The wheel and pinch scale the whole camera
// rig (camera and orbit target together) about a point on her, so every zoom
// step closes in on her from wherever the camera is: from a room's overview,
// whose orbit target sits far from her, as much as from a close-up. Far out
// the point is her chest; close in it rises to her face, so the closest zoom
// is a portrait. Close in, the view also swings onto her face and the lens
// narrows (a long lens flatters a face; a wide one at 0.7 m stretches the nose),
// and a camera that would end up inside a room's wall is pulled back. Pure:
// positions are plain [x, y, z] tuples.

import { nearestPointOnPolygon, pointInPolygon, type Vec2 } from "./walk.ts";

export type Vec3 = readonly [number, number, number];

/** Heights on the doll (meters above her feet) the zoom closes in on. */
export const CHEST_HEIGHT = 1.1;
export const FACE_HEIGHT = 1.55;
/** Nearest the camera comes to her: her face fills the screen. At the
 * portrait lens that frames about 0.35 m: her head, hair just in. */
export const MIN_ZOOM = 0.75;
/** The world camera's lens (vertical, degrees), and the portrait lens it
 * narrows to at the nearest zoom. */
export const WIDE_FOV = 38;
export const PORTRAIT_FOV = 26;
/** One wheel notch zooms in by this factor (its inverse zooms out). */
export const ZOOM_STEP = 0.88;
/** Within this distance the zoom point starts rising from chest to face. */
const RISE_FROM = 3;

/** How much of a portrait the view is at `distance` meters from her: 0 from
 * RISE_FROM out, 1 at the nearest zoom. */
export function portraitAmount(distance: number): number {
  return Math.min(
    1,
    Math.max(0, (RISE_FROM - distance) / (RISE_FROM - MIN_ZOOM)),
  );
}

/** The height on her the camera zooms toward, at `distance` meters away. */
export function focusHeight(distance: number): number {
  return CHEST_HEIGHT + (FACE_HEIGHT - CHEST_HEIGHT) * portraitAmount(distance);
}

/** The lens (vertical fov, degrees) at `distance` meters from her. */
export function portraitFov(distance: number): number {
  return WIDE_FOV + (PORTRAIT_FOV - WIDE_FOV) * portraitAmount(distance);
}

/**
 * Where the camera looks at `distance` meters from her: the orbit target
 * glides onto her face as the portrait forms. Zooming scales the rig about
 * her, which keeps her wherever she was on screen; from an overview aimed
 * somewhere else that is far off-center, so the last stretch of the zoom
 * centers her.
 */
export function portraitTarget(
  target: Vec3,
  face: Vec3,
  distance: number,
): Vec3 {
  const t = portraitAmount(distance);
  if (t === 0) return target;
  return [
    target[0] + (face[0] - target[0]) * t,
    target[1] + (face[1] - target[1]) * t,
    target[2] + (face[2] - target[2]) * t,
  ];
}

/** One key press zooms in by this factor (its inverse zooms out). */
export const KEY_ZOOM_STEP = 0.8;

/** Notches a key zooms: + or = in (1), - or _ out (-1), others none (0). */
export function keyZoomNotches(key: string): number {
  if (key === "+" || key === "=") return 1;
  if (key === "-" || key === "_") return -1;
  return 0;
}

/**
 * Keeps a camera out of the walls. If `camera` is not inside the room
 * (`inside(x, z)`) while `focus` (her) is, it moves along the line back toward
 * her, keeping that line's height, to the farthest point that is. Her being
 * outside (a seat, a ride) leaves the camera alone.
 */
export function pullInside(
  camera: Vec3,
  focus: Vec3,
  inside: (x: number, z: number) => boolean,
  steps = 14,
): Vec3 {
  if (inside(camera[0], camera[2]) || !inside(focus[0], focus[2]))
    return camera;
  const at = (t: number): Vec3 => [
    focus[0] + (camera[0] - focus[0]) * t,
    focus[1] + (camera[1] - focus[1]) * t,
    focus[2] + (camera[2] - focus[2]) * t,
  ];
  let lo = 0; // inside
  let hi = 1; // outside
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    const p = at(mid);
    if (inside(p[0], p[2])) lo = mid;
    else hi = mid;
  }
  return at(lo);
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

/** How far past a room's walkable floor the camera may still go: the walls
 * stand a little outside the floor's edge. */
export const WALL_MARGIN = 0.35;

/** A room's inside for pullInside: its walkable floor, plus a wall's depth. */
export function roomInside(
  floor: readonly Vec2[],
  margin = WALL_MARGIN,
): (x: number, z: number) => boolean {
  return (x, z) => {
    const p: Vec2 = [x, z];
    if (pointInPolygon(floor, p)) return true;
    const edge = nearestPointOnPolygon(floor, p);
    return Math.hypot(edge[0] - x, edge[1] - z) <= margin;
  };
}

/**
 * Swings `camera` about her face (a turn about the vertical, keeping its
 * height and its distance from her) by `amount` (0 to 1) of the way to the
 * front of her, which is where she faces (`yaw`: she faces (sin yaw, cos
 * yaw)). A portrait of her face is taken from the front, whichever way the
 * room's overview happened to look at her.
 */
export function swingToFront(
  camera: Vec3,
  face: Vec3,
  yaw: number,
  amount: number,
): Vec3 {
  const dx = camera[0] - face[0];
  const dz = camera[2] - face[2];
  const r = Math.hypot(dx, dz);
  // straight above her there is no side to swing from
  if (r < 1e-6) return camera;
  const now = Math.atan2(dx, dz);
  const gap = Math.atan2(Math.sin(yaw - now), Math.cos(yaw - now));
  const to = now + gap * Math.min(1, Math.max(0, amount));
  return [face[0] + Math.sin(to) * r, camera[1], face[2] + Math.cos(to) * r];
}
