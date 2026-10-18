import { useFrame } from "@react-three/fiber";
import { Effect } from "postprocessing";
import { useMemo } from "react";
import { Uniform } from "three";
import { liveDrunk } from "./drunk.ts";
import { liveHigh } from "./high.ts";

// Sway moves the screen UVs; warmth tints the color; edge darkens the corners
// (the vignette stands in for an edge blur). All three are scaled by the buzz.
const SHADER = /* glsl */ `
uniform float sway;
uniform float warm;
uniform float edge;
uniform float time;
uniform float glow;
uniform float hue;
uniform float breathe;
uniform float drift;

// rotates a color round the gray axis by angle a
vec3 hueTurn(vec3 c, float a) {
	const vec3 k = vec3(0.57735);
	float s = sin(a);
	float co = cos(a);
	return c * co + cross(k, c) * s + k * dot(k, c) * (1.0 - co);
}

void mainUv(inout vec2 uv) {
	uv.x += sin(time * 2.2) * sway;
	uv.y += cos(time * 1.6) * sway * 0.5;
	// the trip: the whole view swells and settles, slower than a breath
	uv = 0.5 + (uv - 0.5) * (1.0 - breathe * sin(time * 1.57));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	vec3 c = inputColor.rgb * vec3(1.0 + 0.12 * warm, 1.0, 1.0 - 0.18 * warm);
	// the high: lifted saturation and a soft glow
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, 1.0 + 0.6 * glow) + glow * 0.08;
	// the trip: colors drift round the wheel, banded by height on screen
	c = hueTurn(c, hue * (time * 0.4 * drift + uv.y * 2.0));
	float d = length((uv - 0.5) * vec2(1.0, 0.8));
	c *= 1.0 - edge * smoothstep(0.3, 0.75, d);
	outputColor = vec4(c, inputColor.a);
}
`;

class DrunkEffect extends Effect {
  readonly params: Record<
    "sway" | "warm" | "edge" | "time" | "glow" | "hue" | "breathe" | "drift",
    Uniform
  >;

  constructor() {
    const uniforms = {
      sway: new Uniform(0),
      warm: new Uniform(0),
      edge: new Uniform(0),
      time: new Uniform(0),
      glow: new Uniform(0),
      hue: new Uniform(0),
      breathe: new Uniform(0),
      drift: new Uniform(1),
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
    effect.params.glow.value = liveHigh.glow;
    effect.params.hue.value = liveHigh.hue;
    effect.params.breathe.value = liveHigh.breathe;
    effect.params.drift.value = liveHigh.drift;
  });
  return <primitive object={effect} />;
}
