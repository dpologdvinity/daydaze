"""Seasonal dressing models: normalize downloaded CC0/CC-BY pieces for the city.

Inputs (untrusted downloads, treated as data) are named in SOURCES; run with
  blender --background --factory-startup --python art/seasons/build_seasonal.py -- <in_dir> <out_dir>
Each model is imported, its meshes joined, the pivot moved to bottom-center,
scaled to a real-world height in meters and exported as GLB. Then:
  npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt \
    --texture-compress webp --flatten false --palette false --prune-attributes false
Credits: docs/assets.md and src/game/credits.ts.
"""

import sys
from pathlib import Path

import bpy

# file -> (height in meters,)
SOURCES = {
    "tree.glb": (8.0,),  # Christmas Tree, Alex Safayan, CC-BY 3.0
    "lantern.glb": (0.9,),  # red lantern, Sophie Kim, CC-BY 3.0
    "bat.glb": (0.7,),  # Bat, Quaternius, CC0
    "Pumpkin.obj": (0.55,),  # Ultimate Food Pack, Quaternius, CC0
}


def build(src: Path, out: Path, height: float) -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if src.suffix == ".glb":
        bpy.ops.import_scene.gltf(filepath=str(src))
    else:
        bpy.ops.wm.obj_import(filepath=str(src))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects:
        o.select_set(o in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    for o in meshes:  # bake parent transforms so the join keeps the pose
        o.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    lo = [min(v[i] for v in obj.bound_box) for i in range(3)]
    hi = [max(v[i] for v in obj.bound_box) for i in range(3)]
    k = height / (hi[2] - lo[2])
    obj.data.transform(
        __import__("mathutils").Matrix.Translation(
            (-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])
        )
    )
    obj.scale = (k, k, k)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(filepath=str(out), export_format="GLB", export_yup=True)


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1 :]
    src_dir, out_dir = Path(args[0]), Path(args[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, (height,) in SOURCES.items():
        build(src_dir / name, out_dir / (Path(name).stem.lower() + ".glb"), height)


main()
