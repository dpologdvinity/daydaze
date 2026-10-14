// shortcut: local XZ polygon helpers; swap for src/game/walk.ts once it lands.
type Polygon = readonly (readonly [number, number])[];

/** Even-odd ray cast along +x. */
export function isInsidePolygon(
  polygon: Polygon,
  x: number,
  z: number,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}

/** The point itself when walkable, otherwise the closest point on an edge. */
export function clampToPolygon(
  polygon: Polygon,
  x: number,
  z: number,
): [number, number] {
  if (isInsidePolygon(polygon, x, z)) return [x, z];
  let best: [number, number] = [x, z];
  let bestDistance = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[j];
    const [bx, bz] = polygon[i];
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSquared = dx * dx + dz * dz;
    const t =
      lengthSquared === 0
        ? 0
        : Math.min(
            1,
            Math.max(0, ((x - ax) * dx + (z - az) * dz) / lengthSquared),
          );
    const px = ax + t * dx;
    const pz = az + t * dz;
    const distance = Math.hypot(x - px, z - pz);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = [px, pz];
    }
  }
  return best;
}
