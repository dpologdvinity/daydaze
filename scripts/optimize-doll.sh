#!/usr/bin/env bash
# Compresses the doll parts Blender wrote to art/doll/blender/.cache/out into
# public/models/doll/ (meshopt geometry, WebP textures). Simplify stays off:
# it would tear the shape keys the sliders and tucks rely on.
set -euo pipefail
IN="$(dirname "$0")/../art/doll/blender/.cache/out"
OUT="$(dirname "$0")/../public/models/doll"
mkdir -p "$OUT"
for f in "$IN"/*.glb; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$(basename "$f")" \
    --compress meshopt --texture-compress webp --texture-size 1024 \
    --simplify false --join false --instance false
done
ls -la "$OUT"
