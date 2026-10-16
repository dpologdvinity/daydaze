#!/usr/bin/env bash
# Compresses the doll parts Blender wrote to art/doll/blender/.cache/out into
# public/models/doll/ (meshopt geometry, WebP textures). Simplify stays off:
# it would tear the shape keys the sliders and tucks rely on. Flatten and
# palette stay off so node extras and material names survive, and UVs stay
# on the untextured skin and eyes, which the client paints at runtime.
set -euo pipefail
IN="$(dirname "$0")/../art/doll/blender/.cache/out"
OUT="$(dirname "$0")/../public/models/doll"
mkdir -p "$OUT"
for f in "$IN"/*.glb; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$(basename "$f")" \
    --compress meshopt --texture-compress webp --texture-size 1024 \
    --simplify false --join false --instance false --flatten false --palette false --prune-attributes false
done
ls -la "$OUT"
