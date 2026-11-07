#!/usr/bin/env bash
# Rebuild the band shell, crate, chair and instrument props. Needs the source
# GLBs in $1 (default /tmp/bs-dl: openair, fruitcrate, chair, trumpet, sax,
# drum, stand; URLs in docs/assets.md).
set -euo pipefail
src=${1:-/tmp/bs-dl}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
blender --background --factory-startup --python art/park/build_bandshell.py -- "$src" "$tmp"
mkdir -p public/models/park
for input in "$tmp"/*.glb; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$input" "public/models/park/$(basename "$input")" --compress meshopt --texture-compress webp --flatten false --palette false --prune-attributes false
done
