import { useFrame } from "@react-three/fiber";
import { Effect } from "postprocessing";
import { useMemo } from "react";
import { Uniform } from "three";
import { liveDrunk } from "./drunk.ts";

// Sway moves the screen UVs; warmth tints the colour; edge darkens the corners
// (the vignette stands in for an edge blur). All three are scaled by the buzz.
const SHADER = /* glsl */ `
uniform float sway;
uniform float warm;
uniform float edge;
uniform float time;

void mainUv(inout vec2 uv) {
	uv.x += sin(time * 2.2) * sway;
	uv.y += cos(time * 1.6) * sway * 0.5;
}

vec4 mainImage(in vec4 inputColor, in vec2 uv, in GData data) {
	vec3 c = inputColor.rgb * vec3(1.0 + 0.12 * warm, 1.0, 1.0 - 0.18 * warm);
	float d = length((uv - 0.5) * vec2(1.0, 0.8));
	c *= 1.0 - edge * smoothstep(0.3, 0.75, d);
	return vec4(c, inputColor.a);
}
`;

class DrunkEffect extends Effect {
  readonly params: Record<"sway" | "warm" | "edge" | "time", Uniform>;

  constructor() {
    const uniforms = {
      sway: new Uniform(0),
      warm: new Uniform(0),
      edge: new Uniform(0),
      time: new Uniform(0),
    };
    super("DrunkEffect", SHADER, {
      uniforms: new Map(Object.entries(uniforms)),
    });
    this.params = uniforms;
  }
}

/** The drunk post pass, inside the composer on the high tier only. */
export function DrunkPost() {
  const effect = useMemo(() => new DrunkEffect(), []);
  useFrame((state) => {
    effect.params.sway.value = liveDrunk.sway;
    effect.params.warm.value = liveDrunk.warm;
    effect.params.edge.value = liveDrunk.edge;
    effect.params.time.value = state.clock.elapsedTime;
  });
  return <primitive object={effect} />;
}
