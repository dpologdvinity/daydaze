#!/usr/bin/env bash
# Builds the district lot models from Quaternius' Ultimate Textured Building
# Pack (CC0; the owner's download) with art/city/district_blocks.py, then
# compresses them into public/models/districts/lots.glb (meshopt). Node names
# and UVs stay: the client finds each lot by name and recolors it by moving
# the UVs along its own palette atlas (src/client/city/DistrictLots.tsx).
#   gh release download packs -R dpologdvinity/daydaze-assets -p 'Ultimate_Textured_Building_Pack_-_Dec_2019-20261026T213332Z-1-001.zip' -D /tmp/db-pack
#   unzip -q /tmp/db-pack/*.zip -d /tmp/db-kit
#   bash scripts/import-districts.sh
set -euo pipefail
KIT="${KIT:-/tmp/db-kit/Ultimate Textured Building Pack - Dec 2019}"
OUT="$(dirname "$0")/../public/models/districts"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
KIT="$KIT" flock /tmp/daydaze-blender.lock nice -n 19 blender --background --factory-startup \
  --python "$(dirname "$0")/../art/city/district_blocks.py" -- "$TMP/lots.glb" > /dev/null
nice -n 19 npx -y @gltf-transform/cli@4.5.1 optimize "$TMP/lots.glb" "$OUT/lots.glb" \
  --compress meshopt --texture-compress false --simplify false --join false --instance false \
  --flatten false --palette false --prune-attributes false
rm -r "$TMP"
