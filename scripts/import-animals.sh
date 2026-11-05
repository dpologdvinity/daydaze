#!/usr/bin/env bash
# Builds and compresses the animated animals and fish (Quaternius, CC0) into
# public/models/animals/: Blender writes one skinned, vertex-colored GLB each
# (art/animals/build_animals.py), then meshopt shrinks them. Flatten, palette
# and attribute pruning stay off so node names and COLOR_0 survive.
set -euo pipefail
cd "$(dirname "$0")/.."
# Name some animals (./scripts/import-animals.sh bear elk) to rebuild only those.
blender --background --factory-startup --python art/animals/build_animals.py ${1:+-- "$@"}
OUT=public/models/animals
mkdir -p "$OUT"
for src in art/animals/.cache/out/*.glb; do
  [ $# -eq 0 ] || [[ " $* " == *" $(basename "$src" .glb) "* ]] || continue
  npx -y @gltf-transform/cli@4.5.1 optimize "$src" "$OUT/$(basename "$src")" \
    --compress meshopt --texture-compress webp --texture-size 1024 \
    --simplify false --join false --instance false --flatten false --palette false --prune-attributes false
done
