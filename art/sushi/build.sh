#!/usr/bin/env bash
# Rebuild the restaurant props from the unpacked Quaternius kit.
set -euo pipefail
kit=${1:?Pass the unpacked Sushi Restaurant Kit directory}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
blender --background --factory-startup --python art/sushi/build.py -- "$kit" "$tmp"
for input in "$tmp"/*.glb; do
  name=$(basename "$input")
  npx -y @gltf-transform/cli@4.5.1 optimize "$input" "public/models/props/sushi-$name" --compress meshopt --texture-compress webp --flatten false --palette false --prune-attributes false
done
