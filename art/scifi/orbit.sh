#!/usr/bin/env bash
# Optimizes the Quaternius Sci-Fi Essentials Kit (CC0) props Orbit 9 uses, and
# the Sketchfab planet and star skybox (CC-BY), into public/models/. Run from
# anywhere; pass the unzipped kit's glTF folder and the folder holding the two
# Sketchfab GLBs (planet.glb, stars.glb), both untrusted data (never run
# anything from them).
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
kit="${1:?kit glTF folder}"
sketch="${2:?folder with planet.glb and stars.glb}"
opt=(--compress meshopt --texture-compress webp --texture-size 1024)
for prop in Chair Desk_L Desk_Medium Shelves_WideTall Mug SatelliteDish; do
  lower="$(echo "$prop" | tr '[:upper:]_' '[:lower:]-')"
  npx -y @gltf-transform/cli@4.5.1 optimize "$kit/Prop_${prop}.gltf" "$root/public/models/props/scifi-${lower}.glb" "${opt[@]}"
done
# the planet (ringed gas giant) and the stars sphere keep their node names and
# textures; 1024 px is plenty behind a window
for name in planet stars; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$sketch/$name.glb" "$root/public/models/space-$name.glb" --compress meshopt --texture-compress webp --texture-size 1024 --flatten false --join false
done
