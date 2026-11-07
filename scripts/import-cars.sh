#!/usr/bin/env bash
# Rebuilds public/models/cars/<model>.glb and <model>-lo.glb from the CC0
# Quaternius Realistic Car Pack (Nov 2018) and Public Transport Pack (Feb 2017).
#
# The packs live in the owner's private asset repo (GitHub release "packs"):
#   gh release download packs -R dpologdvinity/daydaze-assets -p 'Realistic_Car_Pack*' -D /tmp/cars
#   gh release download packs -R dpologdvinity/daydaze-assets -p 'Public_Transport_Pack*' -D /tmp/pt
#   unzip /tmp/cars/*.zip -d /tmp/cars_x; unzip /tmp/pt/*.zip -d /tmp/pt_x
# then:  CARS_DIR=/tmp/cars_x PT_DIR=/tmp/pt_x scripts/import-cars.sh
# The downloads are data only: nothing from them is executed.
set -euo pipefail
CARS_DIR="${CARS_DIR:-/tmp/cars_x}"
PT_DIR="${PT_DIR:-/tmp/pt_x}"
BLENDER="${BLENDER:-blender}"
OUT=public/models/cars
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"
C="$CARS_DIR/Realistic Car Pack - Nov 2018/FBX"
P="$PT_DIR/Public Transport Pack - Feb 2017/FBX"
# model-key  source file
MODELS=(
  "sedan|$C/NormalCar1.fbx"
  "hatch|$C/NormalCar2.fbx"
  "suv|$C/SUV.fbx"
  "coupe|$C/SportsCar.fbx"
  "sports|$C/SportsCar2.fbx"
  "cop|$C/Cop.fbx"
  "taxi|$C/Taxi.fbx"
  "ambulance|$P/Ambulance.fbx"
  "schoolbus|$P/SchoolBus.fbx"
)
for entry in "${MODELS[@]}"; do
  key="${entry%%|*}"
  source="${entry#*|}"
  for detail in near lo; do
    suffix=""
    [[ "$detail" == lo ]] && suffix="-lo"
    "$BLENDER" --background --factory-startup --python art/cars/import.py -- \
      "$source" "$WORK/$key$suffix.glb" "$key" "$detail" | grep CARTRIS
    # Flags from CLAUDE.md: keep node names and attributes (the client finds
    # the paint, glass, trim, tyre, rim and light meshes by name).
    npx -y @gltf-transform/cli@4.5.1 optimize "$WORK/$key$suffix.glb" "$OUT/$key$suffix.glb" \
      --compress meshopt --texture-compress webp --flatten false --palette false \
      --prune-attributes false --join false --simplify false
  done
done
ls -l "$OUT"
