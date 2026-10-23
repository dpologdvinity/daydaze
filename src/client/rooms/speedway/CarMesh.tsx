import { useEffect, useMemo, type Ref } from "react";
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Group,
  type Material,
  type Texture,
} from "three";
import {
  RIMS,
  TINTS,
  UNDERGLOWS,
  WRAPS,
  type CarMods,
} from "../../../game/city/drive.ts";
import type { CarSpec } from "../../../game/driving/car.ts";
import { canvasTex, hdr } from "../shared/materials.ts";
import { carParts, GLASS, LIGHT, RIM, TRIM, TYRE } from "./carModels.ts";

// Shared by every car wearing the same mod, made on first use.
const made = new Map<string, Material>();
function shared(key: string, make: () => Material): Material {
  let m = made.get(key);
  if (!m) made.set(key, (m = make()));
  return m;
}

let glowMap: Texture | null = null;
/** A soft round falloff, so the glow pools rather than shows a rectangle. */
function getGlowMap(): Texture {
  glowMap ??= canvasTex(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.6, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return glowMap;
}

function rimMaterial(id: string | undefined) {
  const rim = RIMS.find((r) => r.id === id);
  if (!rim || rim === RIMS[0]) return RIM;
  return shared(`rim:${rim.id}`, () => {
    const m = RIM.clone();
    m.color.set(rim.color);
    return m;
  });
}

function glassMaterial(id: string | undefined) {
  const tint = TINTS.find((t) => t.id === id);
  if (!tint || tint.shade === 0) return GLASS;
  return shared(
    `tint:${tint.id}`,
    () =>
      new MeshStandardMaterial({
        color: GLASS.color.clone().multiplyScalar(1 - tint.shade),
        roughness: 0.05,
        metalness: 0.75,
      }),
  );
}

// How much of the wrap color shows at a body point (car space, meters):
// stripes down the middle, a checker, or the lower body in the second tone.
const WRAP_MASK: Record<string, string> = {
  stripes: "step(0.07, abs(p.x)) * step(abs(p.x), 0.2)",
  "black-stripes": "step(0.07, abs(p.x)) * step(abs(p.x), 0.2)",
  checker: "mod(floor(p.x * 4.0) + floor(p.z * 4.0), 2.0)",
  "two-tone": "step(p.y, 0.6)",
};

/** Paints a vinyl wrap over the lacquer by pattern, so it needs no UVs. */
function wrapPaint(m: MeshPhysicalMaterial, id: string | undefined) {
  const wrap = WRAPS.find((w) => w.id === id);
  const mask = wrap && WRAP_MASK[wrap.id];
  if (!wrap?.color || !mask) return;
  const color = new Color(wrap.color);
  m.customProgramCacheKey = () => `wrap:${wrap.id}`;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.wrapColor = { value: color };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWrap;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWrap = position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWrap;\nuniform vec3 wrapColor;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\n{ vec3 p = vWrap; diffuseColor.rgb = mix(diffuseColor.rgb, wrapColor, ${mask}); }`,
      );
  };
}

/** A soft glowing pool under the car: additive, so no real light needed. */
function glowMaterial(id: string | undefined) {
  const glow = UNDERGLOWS.find((g) => g.id === id);
  if (!glow?.color) return null;
  const color = glow.color;
  return shared(
    `glow:${glow.id}`,
    () =>
      new MeshBasicMaterial({
        color: hdr(color, 2.5),
        map: getGlowMap(),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
  );
}

/**
 * A low-poly car in its class's silhouette: painted shell, glass, trim, tyres,
 * rims and lamps. Nose points down +z, so yaw matches the physics. Starts hidden.
 * Each model is a handful of merged meshes, so a car costs about six draw calls.
 */
export function CarMesh({
  spec,
  color,
  mods,
  ref,
}: {
  spec: CarSpec;
  color: string;
  mods?: CarMods;
  ref?: Ref<Group>;
}) {
  const glow = glowMaterial(mods?.glow);
  const parts = carParts(spec);
  // Clearcoat lacquer on the paint, the only per-car material.
  const paint = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      color,
      roughness: 0.38,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    wrapPaint(m, mods?.wrap);
    return m;
  }, [color, mods?.wrap]);
  useEffect(() => () => paint.dispose(), [paint]);
  return (
    <group ref={ref} visible={false}>
      {parts.paint && <mesh geometry={parts.paint} material={paint} />}
      {parts.glass && (
        <mesh geometry={parts.glass} material={glassMaterial(mods?.tint)} />
      )}
      {parts.trim && <mesh geometry={parts.trim} material={TRIM} />}
      {parts.tyre && <mesh geometry={parts.tyre} material={TYRE} />}
      {parts.rim && (
        <mesh geometry={parts.rim} material={rimMaterial(mods?.rims)} />
      )}
      {parts.light && <mesh geometry={parts.light} material={LIGHT} />}
      {glow && (
        <mesh material={glow} position-y={0.12} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[spec.width * 2.2, spec.length * 1.4]} />
        </mesh>
      )}
    </group>
  );
}
