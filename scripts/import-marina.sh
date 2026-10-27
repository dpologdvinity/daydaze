#!/usr/bin/env bash
# Convert Quaternius' Ships pack and optimize the marina's downloaded props.
set -euo pipefail
cd "$(dirname "$0")/.."
blender --background --factory-startup --python art/marina/build_ships.py
mkdir -p /tmp/daydaze-marina public/models/marina
curl -fL https://static.poly.pizza/f8165b16-ce70-4d62-b339-5ee876da756b.glb -o /tmp/daydaze-marina/yacht.glb
curl -fL https://static.poly.pizza/f5ed50d1-1317-4c50-befc-cda0380a6c9c.glb -o /tmp/daydaze-marina/crate.glb
curl -fL https://static.poly.pizza/df9e4b83-758a-4fc7-b311-70fc949ed7ff.glb -o /tmp/daydaze-marina/barrel.glb
for name in yacht crate barrel; do
  npx -y @gltf-transform/cli@4.5.1 optimize "/tmp/daydaze-marina/$name.glb" "public/models/marina/$name.glb" --compress meshopt --texture-compress webp
done
npx -y @gltf-transform/cli@4.5.1 optimize /tmp/daydaze-marina/BoatWSail.glb public/models/marina/sailboat.glb --compress meshopt --texture-compress webp
