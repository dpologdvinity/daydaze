#!/usr/bin/env bash
# Imports the single stems for Petal & Stem from Quaternius' Stylized Nature
# MegaKit (CC0; the owner's download, unzipped glTF folder in $KIT) into
# public/models/florist/, optimized (meshopt, WebP, small textures).
#   KIT=/tmp/florist-kit/glTF bash art/florist/import.sh
set -euo pipefail
KIT="${KIT:-/tmp/florist-kit/glTF}"
OUT="$(dirname "$0")/../../public/models/florist"
mkdir -p "$OUT"
for m in Flower_3_Single Flower_4_Single Fern_1; do
  name="$(echo "$m" | tr '[:upper:]_' '[:lower:]-')"
  npx -y @gltf-transform/cli@4.5.1 optimize "$KIT/$m.gltf" "$OUT/$name.glb" \
    --compress meshopt --texture-compress webp --texture-size 256 \
    --simplify false --flatten false --palette false --prune-attributes false
done
