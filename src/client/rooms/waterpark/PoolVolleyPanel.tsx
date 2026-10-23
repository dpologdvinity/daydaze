import type { JSX } from "react";
import { VolleyGame } from "../../city/VolleyStop.tsx";

/** Volleyball across the pool's net, waist-deep. */
export function PoolVolleyPanel(): JSX.Element {
  return <VolleyGame label="Pool volleyball" prize="pool-volleyball" />;
}
