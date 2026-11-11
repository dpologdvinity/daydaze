#!/usr/bin/env bash
# Builds the street kit (crosswalk, stop, slow and double-yellow decals;
# sidewalk corner block, manhole, drain, bollard) from Quaternius' Downtown
# City MegaKit (CC0; the owner's download) with art/city/street_kit.py, then
# compresses it into public/models/street/kit.glb (meshopt, 1024 px webp
# paint atlas). Names and attributes stay: the client finds each piece by node
# name and reads the atlas UVs and vertex colors.
#   gh release download packs -R dpologdvinity/daydaze-assets -p 'Downtown_City_MegaKit_Standard_.zip' -D /tmp/street-kit-pack
#   unzip -q /tmp/street-kit-pack/Downtown_City_MegaKit_Standard_.zip -d /tmp/street-kit-kit
#   bash scripts/import-street.sh
set -euo pipefail
KIT="${KIT:-/tmp/street-kit-kit}"
OUT="$(dirname "$0")/../public/models/street"
TMP="$(mktemp -d)"
KIT="$KIT" flock /tmp/daydaze-blender.lock nice -n 19 blender --background --factory-startup \
  --python "$(dirname "$0")/../art/city/street_kit.py" -- "$TMP/kit.glb" > /dev/null
nice -n 19 npx -y @gltf-transform/cli@4.5.1 optimize "$TMP/kit.glb" "$OUT/kit.glb" \
  --compress meshopt --texture-compress webp --texture-size 1024 --simplify false \
  --join false --instance false --flatten false --palette false --prune-attributes false
rm -r "$TMP"
