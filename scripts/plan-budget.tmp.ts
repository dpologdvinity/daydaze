// Temporary: plan-level draw calls and triangles at sample points. Not committed.
import { cellsWithin } from "../src/game/city/cells.ts";
import { VIEW_RADIUS, POINT_LIGHTS } from "../src/game/city/tuning.ts";
import { planCity, drawCallsOf, trianglesOf } from "../src/game/city/plan.ts";

const points: [number, number][] = [
  [0, 0],
  [-120, 0],
  [120, 0],
  [0, 40],
  [150, -20],
  [-60, 20],
];
let worstCalls = 0;
let worstTris = 0;
for (const at of points) {
  const plan = planCity(cellsWithin(at, VIEW_RADIUS), POINT_LIGHTS.high, at);
  const calls = drawCallsOf(plan);
  const tris = trianglesOf(plan);
  worstCalls = Math.max(worstCalls, calls);
  worstTris = Math.max(worstTris, tris);
  console.log(`at ${at}: ${calls} calls, ${tris} triangles`);
}
console.log(`worst: ${worstCalls} calls, ${worstTris} triangles`);
