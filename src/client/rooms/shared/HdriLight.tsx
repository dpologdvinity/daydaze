import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { useQuality } from "../../world/quality.ts";

/** High tier only: a Poly Haven CC0 HDRI (public/hdri/<file>.hdr) lights
 * skin, glass and the generated props with real reflections. */
export function HdriLight({
  file,
  intensity = 0.5,
}: {
  file: string;
  intensity?: number;
}) {
  if (useQuality() !== "high") return null;
  return (
    <Suspense fallback={null}>
      <Environment
        files={`/hdri/${file}.hdr`}
        environmentIntensity={intensity}
      />
    </Suspense>
  );
}
