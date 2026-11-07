import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type Ref } from "react";
import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  DoubleSide,
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
import {
  BODY_LENGTH,
  bodyOfCar,
  bodyUrl,
  type BodyKey,
} from "../../../game/driving/bodies.ts";
import { bodyGeometry } from "../../city/carBodies.ts";
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

// Headlight beams: a soft additive cone from each lamp, no real light.
let beamMade: { geometry: ConeGeometry; material: MeshBasicMaterial } | null =
  null;
function beam() {
  beamMade ??= {
    geometry: new ConeGeometry(1.3, 8, 16, 1, true),
    material: new MeshBasicMaterial({
      color: hdr("#fff2c4", 0.35),
      transparent: true,
      opacity: 0.18,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    }),
  };
  return beamMade;
}

/** Bumpers, grille and mirrors of a downloaded body: their colors are in the mesh. */
const ROAD_TRIM = new MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.55,
  metalness: 0.2,
});

type CarProps = {
  spec: CarSpec;
  color: string;
  mods?: CarMods;
  /** Headlights on: beams on the road ahead. */
  beams?: boolean;
  ref?: Ref<Group>;
};

/**
 * Clearcoat lacquer on the paint, the only per-car material. A downloaded body
 * carries a grey shade per vertex (a second tone), so it asks for vertex colors.
 */
function usePaint(color: string, mods: CarMods | undefined, shaded: boolean) {
  const paint = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      color,
      vertexColors: shaded,
      roughness: 0.38,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    wrapPaint(m, mods?.wrap);
    return m;
  }, [color, mods?.wrap, shaded]);
  useEffect(() => () => paint.dispose(), [paint]);
  return paint;
}

/** Underglow pool and headlight beams, the same on every body. */
function Extras({
  spec,
  mods,
  beams,
}: {
  spec: CarSpec;
  mods?: CarMods;
  beams: boolean;
}) {
  const glow = glowMaterial(mods?.glow);
  return (
    <>
      {glow && (
        <mesh material={glow} position-y={0.12} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[spec.width * 2.2, spec.length * 1.4]} />
        </mesh>
      )}
      {beams &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={beam().geometry}
            material={beam().material}
            position={[side * spec.width * 0.3, 0.55, spec.length / 2 + 4]}
            // the apex at the lamp, opening toward the road ahead (+z)
            rotation-x={-Math.PI / 2}
          />
        ))}
    </>
  );
}

/**
 * A road car: a downloaded Quaternius body (public/models/cars/, see
 * src/game/driving/bodies.ts) scaled to the spec's length, its paint,
 * windows and rims taking the car's color, tint and rim style, and the wrap
 * painted over the lacquer. Nose points down +z. Starts hidden.
 */
function BodyCar({
  spec,
  body,
  color,
  mods,
  beams = false,
  ref,
}: CarProps & { body: BodyKey }) {
  const gltf = useGLTF(bodyUrl(body));
  const parts = bodyGeometry(gltf.scene);
  const paint = usePaint(color, mods, true);
  const scale = spec.length / BODY_LENGTH[body];
  return (
    <group ref={ref} visible={false}>
      <group scale={scale}>
        <mesh geometry={parts.paint} material={paint} />
        {parts.glass && (
          <mesh geometry={parts.glass} material={glassMaterial(mods?.tint)} />
        )}
        {parts.trim && <mesh geometry={parts.trim} material={ROAD_TRIM} />}
        {parts.tyre && <mesh geometry={parts.tyre} material={TYRE} />}
        {parts.rim && (
          <mesh geometry={parts.rim} material={rimMaterial(mods?.rims)} />
        )}
        {parts.light && <mesh geometry={parts.light} material={LIGHT} />}
      </group>
      <Extras spec={spec} mods={mods} beams={beams} />
    </group>
  );
}

/**
 * A car: road cars wear a downloaded body; karts, bumper cars and the stock
 * car keep their procedural low-poly shells. Nose points down +z, so yaw
 * matches the physics. Starts hidden.
 */
export function CarMesh(props: CarProps) {
  const body = bodyOfCar(props.spec.id);
  return body ? (
    <BodyCar {...props} body={body} />
  ) : (
    <ProceduralCar {...props} />
  );
}

/**
 * A low-poly procedural car in its class's silhouette: painted shell, glass,
 * trim, tyres, rims and lamps. Each model is a handful of merged meshes, so a
 * car costs about six draw calls.
 */
function ProceduralCar({ spec, color, mods, beams = false, ref }: CarProps) {
  const parts = carParts(spec);
  const paint = usePaint(color, mods, false);
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
      <Extras spec={spec} mods={mods} beams={beams} />
    </group>
  );
}
