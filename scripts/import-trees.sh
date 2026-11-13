#!/usr/bin/env bash
# Optimizes the street trees and palms that art/nature/build_trees.py builds
# from Quaternius' Textured Stylized Trees and Ultimate Stylized Nature (CC0),
# into public/models/nature/ (trees: street-tree-N.glb and the far twin
# street-tree-N-lo.glb) and public/models/street/ (the palm furniture models).
# Meshopt geometry, WebP textures (512 px near, 256 px far twins).
#   RAW=<build_trees.py's $OUT> bash scripts/import-trees.sh
set -euo pipefail
RAW="${RAW:?set RAW to the directory build_trees.py wrote}"
ROOT="$(dirname "$0")/.."
GT=(npx -y @gltf-transform/cli@4.5.1)
opt() { # in out texture-size
  "${GT[@]}" optimize "$1" "$2" --compress meshopt --texture-compress webp \
    --texture-size "$3" --simplify false --palette false
}
for i in 1 2 3 4 5; do
  opt "$RAW/street-tree-$i.glb" "$ROOT/public/models/nature/street-tree-$i.glb" 512
  opt "$RAW/street-tree-$i-lo.glb" "$ROOT/public/models/nature/street-tree-$i-lo.glb" 256
done
opt "$RAW/palm.glb" "$ROOT/public/models/street/palm.glb" 512
opt "$RAW/palm-2.glb" "$ROOT/public/models/street/palm-2.glb" 512
