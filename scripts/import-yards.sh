#!/usr/bin/env bash
# Optimizes the block-yard props that art/yards/build_yards.py builds from CC0
# and CC-BY downloads, into public/models/yards/ (meshopt geometry, WebP
# textures at 256 px; the court's 2 K texture is the one that needs it).
#   RAW=<build_yards.py's $OUT> bash scripts/import-yards.sh
set -euo pipefail
RAW="${RAW:?set RAW to the directory build_yards.py wrote}"
OUT="$(dirname "$0")/../public/models/yards"
mkdir -p "$OUT"
for m in dumpster fence-chain fence-wood bag court; do
  size=256
  [ "$m" = court ] && size=512
  nice -n 19 npx -y @gltf-transform/cli@4.5.1 optimize "$RAW/$m.glb" "$OUT/$m.glb" \
    --compress meshopt --texture-compress webp --texture-size "$size" \
    --simplify false --palette false
done
