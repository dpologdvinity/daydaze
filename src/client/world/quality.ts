// The render quality tier (high or low) as React context, so scenes can pick
// detail levels. Defaults to high when no provider is mounted.

import { createContext, useContext } from "react";

/**
 * The two render tiers. Low must stay inside the low-tier budget (under 250
 * draw calls, 300k triangles, 4 lights).
 */
export type QualityTier = "high" | "low";

/**
 * Provides the active tier to the scene; the app sets it from the device or the
 * `?quality=` flag.
 */
export const QualityContext = createContext<QualityTier>("high");

/** The current quality tier from QualityContext. */
export const useQuality = () => useContext(QualityContext);
