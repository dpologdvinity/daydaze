// Writes src/game/city/infill.generated.ts: the plan that fills the city's
// empty blocks with rows of buildings, back alleys and yards (see
// src/game/city/infill.ts). The layout is static, so this runs at build time,
// not in the browser. Run it after changing the layout:
//   node --experimental-strip-types scripts/gen-infill.ts
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { neighborhoodAt } from "../src/game/city/cells.ts";
import { infillInput } from "../src/game/city/infillInput.ts";
import { planInfill, renderInfill } from "../src/game/city/infill.ts";

const out = new URL("../src/game/city/infill.generated.ts", import.meta.url);
const plan = planInfill(infillInput(neighborhoodAt));
writeFileSync(out, renderInfill(plan));
execFileSync("npx", ["prettier", "--write", out.pathname], {
  stdio: "inherit",
});
console.log(
  `${plan.buildings.length} buildings, ${plan.yards.length} yards, ${plan.lanes.length} lanes`,
);
