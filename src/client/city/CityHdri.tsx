// The city reflection environment, loaded only when the tier and hour need it.
import { Environment } from "@react-three/drei";
import type { JSX } from "react";

export default function CityHdri({ night }: { night: boolean }): JSX.Element {
  return (
    <Environment
      files={
        night
          ? "/hdri/cobblestone_street_night.hdr"
          : "/hdri/wide_street_01.hdr"
      }
      environmentIntensity={night ? 0.5 : 0.26}
    />
  );
}
