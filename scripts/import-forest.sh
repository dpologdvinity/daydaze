#!/usr/bin/env bash
# Builds and compresses the forest trail's trees, logs, rocks and plants
# (Quaternius, CC0) into public/models/forest/: Blender writes one GLB each
# (art/forest/build_forest.py), then meshopt shrinks them. Flatten, palette and
# attribute pruning stay off so COLOR_0 and the UVs survive.
set -euo pipefail
cd "$(dirname "$0")/.."
blender --background --factory-startup --python art/forest/build_forest.py
OUT=public/models/forest
mkdir -p "$OUT"
for src in art/forest/.cache/out/*.glb; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$src" "$OUT/$(basename "$src")" \
    --compress meshopt --texture-compress webp --texture-size 512 \
    --simplify false --join false --instance false --flatten false --palette false --prune-attributes false
done
