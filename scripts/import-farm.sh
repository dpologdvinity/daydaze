#!/usr/bin/env bash
# Imports farm models and props:
# 1. Crops from CC0 Quaternius Nature Crops Pack (/tmp/daydaze-city/q/Nature_Crops_Pack__Jan_2020)
# 2. Soil plots from Kenney Nature Kit
# 3. Barn, silo, hay bale, market stand, fence by Quaternius (CC0 via Poly Pizza)
# 4. Tractor and scarecrow by Poly by Google (CC-BY 3.0 via Poly Pizza)
# Outputs optimized GLBs to public/models/farm/
set -euo pipefail

CROPS_DIR="/tmp/daydaze-city/q/Nature_Crops_Pack__Jan_2020/Nature Crops Pack - Jan 2020/FBX"
KENNEY_ZIP="/tmp/daydaze-city/kenney/nature-kit.zip"
OUT="$(dirname "$0")/../public/models/farm"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

echo "=== Converting crops FBX -> GLB with Blender ==="
cat << 'EOF' > "$TMP/convert.py"
import os, sys, bpy

args = sys.argv[sys.argv.index("--") + 1 :]
fbx_dir, out_dir = args[0], args[1]

crops = [
    ("Carrot", ["Carrot_1", "Carrot_2", "Carrot_3", "Carrot_4", "Carrot_Crop"]),
    ("Tomato", ["Tomato_1", "Tomato_2", "Tomato_3", "Tomato_4", "Tomato_Crop"]),
    ("Corn", ["Corn_1", "Corn_2", "Corn_3", "Corn_4", "Corn_Crop"]),
    ("Wheat", ["Wheat_1", "Wheat_2", "Wheat_3", "Wheat_4", "Wheat_Crop"]),
]

for crop_name, stages in crops:
    for stage in stages:
        fbx_path = os.path.join(fbx_dir, f"{stage}.fbx")
        if not os.path.exists(fbx_path):
            print(f"Skipping missing: {fbx_path}")
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=fbx_path)
        out_name = stage.lower().replace("_", "-") + ".glb"
        out_path = os.path.join(out_dir, out_name)
        bpy.ops.export_scene.gltf(filepath=out_path, export_format="GLB")
        print(f"Exported: {out_name}")
EOF

blender --background --factory-startup --python "$TMP/convert.py" -- "$CROPS_DIR" "$TMP"

echo "=== Extracting Kenney dirt plots ==="
unzip -p "$KENNEY_ZIP" "Models/GLTF format/crops_dirtRow.glb" > "$TMP/dirt-row.glb"
unzip -p "$KENNEY_ZIP" "Models/GLTF format/crops_dirtSingle.glb" > "$TMP/dirt-single.glb"

echo "=== Downloading Poly Pizza / Quaternius & Google models ==="
declare -A POLY_MODELS=(
  ["barn.glb"]="https://static.poly.pizza/e0ecaf1c-bff4-4f30-9a53-0cf0c1c90deb.glb"
  ["silo.glb"]="https://static.poly.pizza/3944662c-ccdd-440d-94bf-a1e37624a536.glb"
  ["hay-bale.glb"]="https://static.poly.pizza/8ab0043c-9a54-47b1-9b46-31b98d2f6ed8.glb"
  ["market-stand.glb"]="https://static.poly.pizza/e2633001-4cf5-46fa-ac68-575c9954f4ba.glb"
  ["fence.glb"]="https://static.poly.pizza/e53463b2-c5e8-4734-bc36-9ea8581ab148.glb"
  ["tractor.glb"]="https://static.poly.pizza/df097309-a762-4f8f-af36-c4d2b42dae1f.glb"
  ["scarecrow.glb"]="https://static.poly.pizza/b543e861-9c94-4831-be18-6ceb3c127652.glb"
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
    --compress meshopt --texture-compress webp --texture-size 512 --simplify false > /dev/null 2>&1 || cp "$glb" "$OUT/$base"
done

rm -rf "$TMP"
echo "=== Done importing farm models ==="
ls -lh "$OUT"
