#!/usr/bin/env bash
# Rebuild the food props from the owner's unpacked Quaternius packs.
set -euo pipefail
root=${1:-/tmp/food-kit}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
blender --background --factory-startup --python art/food/build.py -- "$root" "$tmp"
for input in "$tmp"/*.glb; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$input" "public/models/props/$(basename "$input")" --compress meshopt --texture-compress webp --flatten false --palette false --prune-attributes false
done
