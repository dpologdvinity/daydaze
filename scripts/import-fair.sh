#!/usr/bin/env bash
# Builds the Fairground's downloaded models into public/models/fair/:
# Sketchfab's gondola cabin and carousel horse (CC-BY, files in $FAIR_SRC,
# default /tmp/fair-sk) are normalized by art/fair/build_fair.py, and Kenney's
# Coaster Kit pieces (CC0, kenney.nl/assets/coaster-kit, unzipped to $KIT) are
# copied; everything is then compressed with meshopt and WebP.
set -euo pipefail
cd "$(dirname "$0")/.."
KIT="${KIT:-/tmp/fair-kenney/kit/Models/GLB format}"
OUT=public/models/fair
mkdir -p "$OUT"
blender --background --factory-startup --python art/fair/build_fair.py
GT=(npx -y @gltf-transform/cli@4.5.1)
OPTS=(--compress meshopt --texture-compress webp --simplify false --join false
  --instance false --flatten false --palette false --prune-attributes false)
# the Sketchfab models are 2-3k triangles each and drawn 8-12 times: thin them
TMP="$(mktemp -d)"
for n in cabin horse; do
  "${GT[@]}" simplify "art/fair/.cache/out/$n.glb" "$TMP/$n.glb" --ratio 0.2 --error 0.02
  "${GT[@]}" optimize "$TMP/$n.glb" "$OUT/$n.glb" --texture-size 512 "${OPTS[@]}"
done
rm -r "$TMP"
for n in coaster-train coaster-train-wooden train-log-flume stall-food stall-drinks \
  stall-information; do
  "${GT[@]}" optimize "$KIT/$n.glb" "$OUT/$n.glb" --texture-size 256 "${OPTS[@]}"
done
