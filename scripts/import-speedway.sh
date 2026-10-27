#!/usr/bin/env bash
# Builds and optimizes Speedway oval assets from Quaternius Realistic Car Pack
# and Kenney Racing Kit / Mini Characters into public/models/speedway/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="$ROOT/art/speedway/build_speedway_assets.py"
OUT="$ROOT/public/models/speedway"
KENNEY_RACING="/tmp/daydaze-city/kenney/racing-kit/Models/GLTF format"
TMP="/tmp/daydaze-speedway-build"

mkdir -p "$OUT" "$TMP"

echo "=== Running Blender asset processing ==="
blender --background --factory-startup --python "$ART"

echo "=== Optimizing with gltf-transform ==="
GT=(npx -y @gltf-transform/cli@4.5.1)

# Optimize cars and characters
for m in stock-car-1 stock-car-2 stock-car-3 stock-car-4 spectator pit-crew; do
  if [ -f "$TMP/$m.glb" ]; then
    echo "Optimizing $m.glb..."
    "${GT[@]}" optimize "$TMP/$m.glb" "$OUT/$m.glb" \
      --compress meshopt --texture-compress webp --simplify false --flatten false --palette false --prune-attributes false
  fi
done

# Optimize Kenney racing props
KENNEY_MODELS=(
  grandStand
  grandStandCovered
  barrierWall
  barrierRed
  barrierWhite
  pitsGarage
  pitsOffice
  overheadLights
  pylon
  flagCheckers
  billboard
  billboardDouble_exclusive
)

for km in "${KENNEY_MODELS[@]}"; do
  src="$KENNEY_RACING/$km.glb"
  # Convert camelCase to kebab-case
  dst_name=$(echo "$km" | sed -r 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
  if [ -f "$src" ]; then
    echo "Optimizing $km -> $dst_name.glb..."
    "${GT[@]}" optimize "$src" "$OUT/$dst_name.glb" \
      --compress meshopt --texture-compress webp --simplify false
  fi
done

echo "Speedway assets build complete! Contents:"
ls -lh "$OUT"
