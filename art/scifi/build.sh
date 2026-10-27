#!/usr/bin/env bash
# Optimize Quaternius' CC0 sci-fi crate for the room prop loader.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
source_dir="${1:-/tmp/daydaze-city/q/Sci-Fi_Essentials_Kit/glTF}"
for prop in Crate Locker; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$source_dir/Prop_${prop}.gltf" "$root/public/models/props/scifi-${prop,,}.glb" --compress meshopt --texture-compress webp
done
# J-Toastie's CC-BY arcade machine; remove its original screen, then bake colors.
curl -fsSL https://static.poly.pizza/e45e15cd-7b22-4b5d-ba19-e29fe9d5811a.glb -o /tmp/daydaze-scifi-arcade.glb
blender --background --factory-startup --python "$root/art/scifi/cabinet.py" -- /tmp/daydaze-scifi-arcade.glb /tmp/daydaze-scifi-cabinet.glb
npx -y @gltf-transform/cli@4.5.1 optimize /tmp/daydaze-scifi-cabinet.glb "$root/public/models/props/scifi-arcade.glb" --compress meshopt --texture-compress webp
