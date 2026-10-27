#!/usr/bin/env bash
# Compresses the reef props and gulls (art/ocean/build_ocean.py) into
# public/models/ocean/, and the grouper, crab and turtle (built by
# art/animals/build_animals.py) into public/models/animals/. Meshopt geometry,
# WebP textures at 512 px; flatten, palette and attribute pruning stay off so
# node names, COLOR_0 and UVs survive.
set -euo pipefail
cd "$(dirname "$0")/.."
OPTS=(--compress meshopt --texture-compress webp --texture-size 512
  --simplify false --join false --instance false --flatten false --palette false --prune-attributes false)
mkdir -p public/models/ocean public/models/animals
for n in reef gulls; do
  npx -y @gltf-transform/cli@4.5.1 optimize "art/ocean/.cache/out/$n.glb" "public/models/ocean/$n.glb" "${OPTS[@]}"
done
for n in grouper crab turtle; do
  npx -y @gltf-transform/cli@4.5.1 optimize "art/animals/.cache/out/$n.glb" "public/models/animals/$n.glb" "${OPTS[@]}"
done
ls -la public/models/ocean public/models/animals/{grouper,crab,turtle}.glb
