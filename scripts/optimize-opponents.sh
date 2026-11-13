#!/usr/bin/env bash
# Compresses the Paintball and Laser Tag opponents Blender wrote to
# art/opponents/.cache/out (art/opponents/build_opponents.py and build_clips.py)
# into public/models/opponents/: meshopt geometry, WebP eye textures, a far-LOD
# twin of each body (a third of the triangles), the clip file resampled, and the
# skin JPEGs copied as they are. Simplify stays off in the first pass and
# flatten, palette and joins too: the meshes' names and skinning must survive.
set -euo pipefail
IN="$(dirname "$0")/../art/opponents/.cache/out"
OUT="$(dirname "$0")/../public/models/opponents"
mkdir -p "$OUT"
OPTS=(--compress meshopt --texture-compress webp --texture-size 256
  --simplify false --join false --instance false --flatten false --palette false --prune-attributes false)
LO="$(mktemp -d)"
for name in opponent-f opponent-m; do
  npx -y @gltf-transform/cli@4.5.1 optimize "$IN/$name.glb" "$OUT/$name.glb" "${OPTS[@]}"
  # far twin: about a third of the triangles; the skin weights ride along
  npx -y @gltf-transform/cli@4.5.1 simplify "$IN/$name.glb" "$LO/$name.glb" --ratio 0.3 --error 0.01
  npx -y @gltf-transform/cli@4.5.1 optimize "$LO/$name.glb" "$OUT/$name-lo.glb" "${OPTS[@]}"
done
# the clips: no rest-valued translation or scale channels, then resampled
node --experimental-strip-types "$(dirname "$0")/trimClips.ts" "$IN/opponent-clips.glb" "$LO/trimmed.glb"
npx -y @gltf-transform/cli@4.5.1 prune "$LO/trimmed.glb" "$LO/pruned.glb"
npx -y @gltf-transform/cli@4.5.1 resample "$LO/pruned.glb" "$LO/clips.glb" --tolerance 0.003
npx -y @gltf-transform/cli@4.5.1 optimize "$LO/clips.glb" "$OUT/opponent-clips.glb" "${OPTS[@]}" --meshopt-level high
cp "$IN"/skin-*.jpg "$OUT"/
rm -rf "$LO"
ls -la "$OUT"
