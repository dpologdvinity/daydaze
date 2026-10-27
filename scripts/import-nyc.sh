#!/usr/bin/env bash
# Builds the NYC facade bays from Quaternius' Downtown City MegaKit (CC0; the
# owner's download, unpacked to $KIT) with art/city/nyc_bays.py, then
# compresses them into public/models/nyc/bays.glb (meshopt). Flatten and
# palette stay off so each bay stays its own named node; attributes stay
# because the client reads the vertex colors and the glass/brick flags.
#   KIT="/tmp/daydaze-city/megakit/Exports/glTF (Godot)" bash scripts/import-nyc.sh
set -euo pipefail
KIT="${KIT:-/tmp/daydaze-city/megakit/Exports/glTF (Godot)}"
OUT="$(dirname "$0")/../public/models/nyc"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
KIT="$KIT" blender --background --factory-startup \
  --python "$(dirname "$0")/../art/city/nyc_bays.py" -- "$TMP/bays.glb" > /dev/null
npx -y @gltf-transform/cli@4.5.1 optimize "$TMP/bays.glb" "$OUT/bays.glb" \
  --compress meshopt --simplify false --join false --instance false \
  --flatten false --palette false --prune-attributes false
rm -r "$TMP"
