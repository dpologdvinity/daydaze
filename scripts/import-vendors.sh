#!/usr/bin/env bash
# Reuse credited downloaded models; decode meshopt before Blender restyling.
set -euo pipefail
vendor_tmp="$(mktemp -d)"
trap 'rm -rf "$vendor_tmp"' EXIT
mkdir -p public/models/vendors
npx -y @gltf-transform/cli@4.5.1 copy public/models/transit/van.glb "$vendor_tmp/van.glb"
# Original meshes preserve the cone and the cart's narrow umbrella supports.
curl -fLs https://static.poly.pizza/ada71d8f-d96d-4116-835d-d5bc4fb87718.glb -o "$vendor_tmp/cone.glb"
curl -fLs https://static.poly.pizza/74a0c848-46c7-4205-86b7-a0dd469d771d.glb -o "$vendor_tmp/cart.glb"
for kind in truck cart; do
  blender --background --factory-startup --python art/vendors/build.py -- "$vendor_tmp" "$vendor_tmp/$kind.glb" "$kind"
  npx -y @gltf-transform/cli@4.5.1 optimize "$vendor_tmp/$kind.glb" "public/models/vendors/$kind.glb" --compress meshopt --texture-compress webp --simplify false
done
