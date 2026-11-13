#!/usr/bin/env bash
# Builds the Amusement Park's kiddie train (the engine, tender and an open
# passenger wagon, from Quaternius' Train Pack, CC0; the owner's download,
# unpacked so $TRAINS holds its FBX folder) with art/fair/build_train.py, then
# compresses them into public/models/fair/ (meshopt; flatten, palette and
# attribute pruning stay off so the vertex colors survive).
#   TRAINS="<dir>/Train Pack - April 2019/FBX" bash scripts/import-train.sh
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
blender --background --factory-startup --python art/fair/build_train.py -- "$TMP" > /dev/null
for part in engine tender wagon; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$TMP/kiddie-$part.glb" "public/models/fair/kiddie-$part.glb" \
    --compress meshopt --simplify false --join false --instance false \
    --flatten false --palette false --prune-attributes false
done
