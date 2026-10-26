#!/usr/bin/env bash
# Imports trees, bushes, flowers and grass from Quaternius' Stylized Nature
# MegaKit (CC0; the owner's download, unpacked to $KIT) into
# public/models/nature/: each model thinned by art/nature/nature_lod.py
# (bark decimated; the -lo twin for distance and the low tier keeps only the
# main limbs and one leaf card in three, grown to fill), then optimized
# (meshopt, WebP).
#   KIT=/tmp/daydaze-city/Stylized_Nature_MegaKit_Standard__zip/glTF bash scripts/import-nature.sh
set -euo pipefail
KIT="${KIT:-/tmp/daydaze-city/Stylized_Nature_MegaKit_Standard__zip/glTF}"
OUT="$(dirname "$0")/../public/models/nature"
mkdir -p "$OUT"
GT=(npx -y @gltf-transform/cli@4.5.1)
MODELS=(CommonTree_1 CommonTree_2 CommonTree_3 CommonTree_4 CommonTree_5
  Bush_Common Bush_Common_Flowers Flower_3_Group Flower_4_Group
  Grass_Common_Tall Grass_Wispy_Short Fern_1 Rock_Medium_1)
TMP="$(mktemp -d)"
LOD="$(dirname "$0")/../art/nature/nature_lod.py"
for m in "${MODELS[@]}"; do
  name="$(echo "$m" | tr '[:upper:]_' '[:lower:]-')"
  # near: every leaf card, bark decimated; far (-lo): one card in three, grown
  KEEP=1 GROW=1 SOLID_RATIO=0.35 BARK_KEEP=0 blender --background --factory-startup \
    --python "$LOD" -- "$KIT/$m.gltf" "$TMP/$name.glb" > /dev/null
  blender --background --factory-startup --python "$LOD" -- "$KIT/$m.gltf" "$TMP/$name-lo.glb" > /dev/null
  "${GT[@]}" optimize "$TMP/$name.glb" "$OUT/$name.glb" \
    --compress meshopt --texture-compress webp --texture-size 512 --simplify false
  "${GT[@]}" optimize "$TMP/$name-lo.glb" "$OUT/$name-lo.glb" \
    --compress meshopt --texture-compress webp --texture-size 256 --simplify false
done
rm -r "$TMP"
