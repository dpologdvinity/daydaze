import { createContext, useContext } from "react";

export type QualityTier = "high" | "low";

export const QualityContext = createContext<QualityTier>("high");

export const useQuality = () => useContext(QualityContext);
