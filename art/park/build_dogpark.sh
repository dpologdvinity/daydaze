#!/usr/bin/env bash
# Rebuild the dog park props. Needs the five Poly Pizza GLBs in $1 (default
# /tmp/park2-dl: tunnels, ramp, seesaw, bowl2, ball; see docs/assets.md for the URLs).
set -euo pipefail
src=${1:-/tmp/park2-dl}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
blender --background --factory-startup --python art/park/build_dogpark.py -- "$src" "$tmp"
mkdir -p public/models/park
for input in "$tmp"/*.glb; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$input" "public/models/park/$(basename "$input")" --compress meshopt --texture-compress webp --flatten false --palette false --prune-attributes false
done
