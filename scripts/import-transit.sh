#!/usr/bin/env bash
# CC0 Quaternius Public Transport / Realistic Cars, Kenney Car Kit; CC-BY Zsky stop.
# Owner packs under /tmp/daydaze-city/q; additional downloads remain data only.
set -euo pipefail
TRANSIT_TMP="$(mktemp -d)"
trap 'rm -rf "$TRANSIT_TMP"' EXIT
curl -fLs https://kenney.nl/media/pages/assets/car-kit/1a312ec241-1775131960/kenney_car-kit.zip -o "$TRANSIT_TMP/cars.zip"
unzip -q "$TRANSIT_TMP/cars.zip" -d "$TRANSIT_TMP/cars"
curl -fLs https://static.poly.pizza/7a1ec2af-89e6-4785-976f-7c0991608a88.glb -o "$TRANSIT_TMP/stop.glb"
Q="${Q:-/tmp/daydaze-city/q}"
BLENDER="${BLENDER:-blender}"
mkdir -p public/models/transit
for kind in bus taxi sedan van stop; do
  case "$kind" in
    bus) source="$Q/Public_Transport_Pack__Feb_2017/Public Transport Pack - Feb 2017/FBX/Bus.fbx" ;;
    taxi) source="$Q/Realistic_Car_Pack__Nov_2018/Realistic Car Pack - Nov 2018/FBX/Taxi.fbx" ;;
    sedan) source="$Q/Realistic_Car_Pack__Nov_2018/Realistic Car Pack - Nov 2018/FBX/NormalCar1.fbx" ;;
    van) source="$TRANSIT_TMP/cars/Models/FBX format/van.fbx" ;;
    stop) source="$TRANSIT_TMP/stop.glb" ;;
  esac
  for detail in near lo; do
    suffix=""
    if [[ "$detail" == lo ]]; then suffix="-lo"; fi
    "$BLENDER" --background --factory-startup --python art/transit/import.py -- "$source" "$TRANSIT_TMP/model.glb" "$kind" "$detail" > "$TRANSIT_TMP/blender.log" 2>&1
    npx -y @gltf-transform/cli@4.5.1 optimize "$TRANSIT_TMP/model.glb" "public/models/transit/$kind$suffix.glb" --compress meshopt --texture-compress webp --simplify false
  done
done
