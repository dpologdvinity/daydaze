#!/usr/bin/env bash
# Compress the Blender outputs for the lazily loaded studio.
set -euo pipefail
mkdir -p public/models/pottery
for model in wheel drying-shelf kiln; do
  npx -y @gltf-transform/cli@4.5.1 optimize "/tmp/daydaze-pottery/out/$model.glb" "public/models/pottery/$model.glb" --compress meshopt --texture-compress webp
done
