#!/usr/bin/env bash
# Builds Beachside's motels and cottages (public/models/beachside/) and
# Suburbia's extra homes (public/models/suburbia/house-q-*.glb) from
# Quaternius's building packs (CC0, unpacked under $MOTELS_SRC, default
# /tmp/daydaze-city/q): Blender joins and normalizes each building
# (art/motels/build_motels.py) and thins it to 3000 triangles; gltf-transform compresses it.
set -euo pipefail
cd "$(dirname "$0")/.."
blender --background --factory-startup --python art/motels/build_motels.py > /dev/null
GT=(npx -y @gltf-transform/cli@4.5.1)
OPTS=(--compress meshopt --texture-compress webp --texture-size 256 --join false
  --instance false --flatten false --palette false --prune-attributes false)
mkdir -p public/models/beachside public/models/suburbia
for in in art/motels/.cache/out/*.glb; do
  name="$(basename "$in" .glb)"
  case "$name" in
    house-q-*) out="public/models/suburbia/$name.glb" ;;
    *) out="public/models/beachside/$name.glb" ;;
  esac
  "${GT[@]}" optimize "$in" "$out" "${OPTS[@]}"
done
