// The city's building walls, one material per facade family (plan.ts's
// FACADE_KINDS): brick, stucco, concrete and corrugated metal siding are CC0
// PBR scans (scripts/fetch-textures.ts), box-mapped by world position so
// every wall tiles at true size; the glass curtain wall is a drawn grid of
// panes and mullions that reflects the sky on the high tier.
//
// Two things keep them from reading as plastic: the night glow that keeps
// walls visible on the dark side of the street runs through the photo itself
// (emissiveMap = the color map), so brick still shows its mortar in the
// shade; and the normal maps load on every tier, since walls fill most of
// the screen (about 150 KB for all four sets).

import * as THREE from "three";
import type { FacadeKind } from "../../game/city/plan.ts";
import { boxMapped, groundMaps } from "./worldTexture.ts";

/** A scanned wall: `scale` repeats per meter; `glow` lifts the shaded side. */
function scanned(
  id: string,
  scale: number,
  {
    roughness = 0.85,
    metalness = 0,
    glow = "#7060b0",
    glowIntensity = 0.75,
  } = {},
): THREE.MeshStandardMaterial {
  const maps = groundMaps(id, { full: true });
  return boxMapped(
    new THREE.MeshStandardMaterial({
      ...maps,
      emissiveMap: maps.map,
      emissive: glow,
      emissiveIntensity: glowIntensity,
      roughness,
      metalness,
    }),
    scale,
  );
}

/**
 * A curtain wall: dark glass panes, 1.8 m wide and one 3.6 m floor tall
 * (two panes a texture), between pale mullions and a spandrel band at each
 * floor line. White glass so the instance color tints it.
 */
function curtainTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d context for the curtain wall");
  g.fillStyle = "#d8dcef";
  g.fillRect(0, 0, 128, 128);
  for (const x of [0, 64]) {
    const pane = g.createLinearGradient(x, 0, x + 64, 128);
    pane.addColorStop(0, "#9aa6c8");
    pane.addColorStop(0.55, "#5e6a92");
    pane.addColorStop(1, "#7c88b0");
    g.fillStyle = pane;
    g.fillRect(x + 3, 3, 58, 104);
  }
  // the spandrel: the opaque band hiding each floor slab
  g.fillStyle = "#3a3f58";
  g.fillRect(0, 110, 128, 18);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function curtain(): THREE.MeshStandardMaterial {
  const map = curtainTexture();
  return boxMapped(
    new THREE.MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: "#6070c0",
      emissiveIntensity: 0.7,
      // reflective enough to catch the sky on high, never black on low
      roughness: 0.25,
      metalness: 0.4,
    }),
    // one texture spans two panes (3.6 m) across and one floor up
    1 / 3.6,
  );
}

/** Lazily built, so the canvas texture waits for a document. */
let made: Record<FacadeKind, THREE.MeshStandardMaterial> | null = null;

export function facadeMaterials(): Record<
  FacadeKind,
  THREE.MeshStandardMaterial
> {
  made ??= {
    brick: scanned("brick_wall_02", 0.5),
    stucco: scanned("painted_plaster_wall", 0.3, { roughness: 0.9 }),
    concrete: scanned("concrete_wall_008", 0.25, { roughness: 0.8 }),
    siding: scanned("corrugated_iron", 0.4, {
      roughness: 0.55,
      metalness: 0.45,
      glowIntensity: 0.6,
    }),
    curtain: curtain(),
  };
  return made;
}
