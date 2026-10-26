import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { DrunkPost } from "../effects/DrunkPost.tsx";

/** The high tier's post stack. Its own chunk, so low-tier players never
 * download postprocessing. */
export default function Effects() {
  // 2x MSAA: at 1.5x resolution 4x samples cost more than they showed
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1}
        luminanceSmoothing={0.2}
        intensity={1.15}
        radius={0.72}
      />
      <DrunkPost />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}
