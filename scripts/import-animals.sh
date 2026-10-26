#!/usr/bin/env bash
# Builds and compresses the animated animals and fish (Quaternius, CC0) into
# public/models/animals/: Blender writes one skinned, vertex-colored GLB each
# (art/animals/build_animals.py), then meshopt shrinks them. Flatten, palette
# and attribute pruning stay off so node names and COLOR_0 survive.
set -euo pipefail
cd "$(dirname "$0")/.."
blender --background --factory-startup --python art/animals/build_animals.py
OUT=public/models/animals
mkdir -p "$OUT"
for src in art/animals/.cache/out/*.glb; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$src" "$OUT/$(basename "$src")" \
    --compress meshopt --texture-compress webp \
    --simplify false --join false --instance false --flatten false --palette false --prune-attributes false
done
