#!/usr/bin/env bash
# Compresses the doll parts Blender wrote to art/doll/blender/.cache/out into
# public/models/doll/ (meshopt geometry, WebP textures), plus a simplified
# -lo twin of every worn part for dolls past the LOD distance. Simplify stays off:
# it would tear the shape keys the sliders and tucks rely on. Flatten and
# palette stay off so node extras and material names survive, and UVs stay
# on the untextured skin and eyes, which the client paints at runtime.
# Each part first loses the shape keys that don't move it (pruneMorphs.ts):
# optimize would otherwise store them as arrays of zeros.
set -euo pipefail
IN="$(dirname "$0")/../art/doll/blender/.cache/out"
OUT="$(dirname "$0")/../public/models/doll"
mkdir -p "$OUT"
OPTS=(--compress meshopt --texture-compress webp --texture-size 1024
  --simplify false --join false --instance false --flatten false --palette false --prune-attributes false)
LO="$(mktemp -d)"
for src in "$IN"/*.glb; do
  name="$(basename "$src" .glb)"
  f="$LO/$name-pruned.glb"
  node --experimental-strip-types "$(dirname "$0")/pruneMorphs.ts" "$src" "$f"
  npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$name.glb" "${OPTS[@]}"
  # worn parts get a low-poly twin for far-off dolls: the same vertices'
  # attributes (skin weights, shape keys) on about a fifth of the triangles
  case "$name" in
    hair-* | outfit-* | shoes-* | swim-*)
      npx -y @gltf-transform/cli@4.5.1 simplify "$f" "$LO/$name.glb" --ratio 0.2 --error 0.02
      npx -y @gltf-transform/cli@4.5.1 optimize "$LO/$name.glb" "$OUT/$name-lo.glb" "${OPTS[@]}"
      ;;
  esac
done
rm -rf "$LO"
ls -la "$OUT"
