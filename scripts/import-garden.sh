#!/usr/bin/env bash
# Imports community garden models and props:
# 1. Crops from CC0 Quaternius Nature Crops Pack (/tmp/daydaze-city/q/Nature_Crops_Pack__Jan_2020)
# 2. Tool shed by Quaternius (CC0 1.0 via Poly Pizza)
# 3. Watering can by CreativeTrio (CC0 1.0 via Poly Pizza)
# 4. Compost crate by Quaternius (CC0 1.0 via Poly Pizza)
# Outputs optimized GLBs to public/models/garden/
set -euo pipefail

CROPS_DIR="/tmp/daydaze-city/q/Nature_Crops_Pack__Jan_2020/Nature Crops Pack - Jan 2020/FBX"
OUT="$(dirname "$0")/../public/models/garden"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

echo "=== Converting crops FBX -> GLB with Blender ==="
cat << 'EOF' > "$TMP/convert.py"
import os, sys, bpy

args = sys.argv[sys.argv.index("--") + 1 :]
fbx_dir, out_dir = args[0], args[1]

crops = [
    ("tomato", ["Tomato_1", "Tomato_2", "Tomato_3", "Tomato_4"]),
    ("strawberry", ["BushBerries_1", "BushBerries_2", "BushBerries_3", "BushBerries_4"]),
    ("sunflower", ["Flower_1", "Flower_2", "Flower_3", "Flower_4"]),
    ("pepper", ["Beet_1", "Beet_2", "Beet_3", "Beet_4"]),
    ("herb", ["Lettuce_1", "Lettuce_2", "Lettuce_3", "Lettuce_4"]),
]

for crop_id, stages in crops:
    for idx, stage in enumerate(stages, 1):
        fbx_path = os.path.join(fbx_dir, f"{stage}.fbx")
        if not os.path.exists(fbx_path):
            print(f"Skipping missing: {fbx_path}")
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=fbx_path)
        out_name = f"{crop_id}-{idx}.glb"
        out_path = os.path.join(out_dir, out_name)
        bpy.ops.export_scene.gltf(filepath=out_path, export_format="GLB")
        print(f"Exported: {out_name}")
EOF

blender --background --factory-startup --python "$TMP/convert.py" -- "$CROPS_DIR" "$TMP"

echo "=== Downloading Poly Pizza / Quaternius & CreativeTrio CC0 models ==="
declare -A POLY_MODELS=(
  ["shed.glb"]="https://static.poly.pizza/5f6fd867-1979-4bd1-a2f9-99627cf86ac3.glb"
  ["watering-can.glb"]="https://static.poly.pizza/f87b9c71-1038-49d8-8e13-2656a13d32e9.glb"
  ["compost-bin.glb"]="https://static.poly.pizza/f5ed50d1-1317-4c50-befc-cda0380a6c9c.glb"
)

for name in "${!POLY_MODELS[@]}"; do
  url="${POLY_MODELS[$name]}"
  echo "Downloading $name from $url..."
  curl -sL "$url" -o "$TMP/$name"
done

echo "=== Optimizing GLBs with gltf-transform ==="
for glb in "$TMP"/*.glb; do
  base="$(basename "$glb")"
  echo "Optimizing $base..."
  npx -y @gltf-transform/cli@4.5.1 optimize "$glb" "$OUT/$base" \
    --compress meshopt --texture-compress webp --texture-size 512 --flatten false --palette false --prune-attributes false > /dev/null 2>&1 || cp "$glb" "$OUT/$base"
done

rm -rf "$TMP"
python3 -I "$(dirname "$0")/fix-garden-crop-alpha.py"
echo "=== Done importing garden models ==="
ls -lh "$OUT"
