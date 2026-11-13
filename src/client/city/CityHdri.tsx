// The city's night HDRI (high tier only), in its own file so CityScene can
// load drei's Environment, and the HDR/EXR/gain-map loaders it drags in, only
// when a high-tier night needs it, not for every first load.
import { Environment } from "@react-three/drei";
import type { JSX } from "react";

export default function CityHdri(): JSX.Element {
  return (
    <Environment
      files="/hdri/cobblestone_street_night.hdr"
      environmentIntensity={0.5}
    />
  );
}
