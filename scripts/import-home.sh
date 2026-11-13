#!/usr/bin/env bash
# Builds the apartment furniture models into public/models/home/: Blender joins
# and recenters each piece (art/home/build_home.py; sources unpacked under
# $HOME_SRC, default /tmp/interior), then gltf-transform compresses them.
# ONLY="id,id" builds just those catalog ids.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/models/home
mkdir -p "$OUT"
blender --background --factory-startup --python art/home/build_home.py
for f in art/home/.cache/out/*.glb; do
  id=$(basename "$f" .glb)
  [[ -z "${ONLY:-}" || ",$ONLY," == *",$id,"* ]] || continue
  npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$(basename "$f")" \
    --compress meshopt --texture-compress webp --texture-size 256 --simplify false \
    --join false --instance false --flatten false --palette false --prune-attributes false
done
