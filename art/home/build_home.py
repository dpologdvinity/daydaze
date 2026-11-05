"""Converts the apartment's furniture to one GLB each (joined into a single
mesh, world transform applied, origin at the bottom center) and prints each
model's size in meters so footprints in src/game/home/decor.ts can be checked.

Sources (CC0): Quaternius's Ultimate House Interior and two Furniture Packs (FBX, in
$HOME_SRC/uh, f19 and f17)
and Kenney's two televisions (GLB, in $HOME_SRC/kenney, via Poly Pizza).

Run: blender --background --factory-startup --python art/home/build_home.py
Writes art/home/.cache/out/<id>.glb; scripts/import-home.sh compresses them
into public/models/home/.
"""

import os

import bpy
from mathutils import Vector

SRC = os.environ.get("HOME_SRC", "/tmp/interior")
# the three Quaternius packs; the first that has the file wins
PACKS = [
    os.path.join(SRC, "uh", "Ultimate House Interior Pack - June 2020", "FBX"),
    os.path.join(SRC, "f19", "Furniture Pack - March 2019", "FBX"),
    os.path.join(SRC, "f17", "Furniture Pack - Oct 2017", "FBX"),
]


def find(stem):
    for d in PACKS:
        f = os.path.join(d, stem + ".fbx")
        if os.path.exists(f):
            return f
    raise FileNotFoundError(stem)

OUT = os.path.join(os.path.dirname(__file__), ".cache", "out")

# catalog id -> file ("uh:" Quaternius FBX, "k:" Kenney GLB)
MODELS = {
    "sofa": "uh:Couch_Large1",
    "sofa-small": "uh:Couch_Small1",
    "sofa-corner": "uh:Couch_L",
    "armchair": "uh:ChairCushioned",
    "bed": "uh:BedDouble",
    "bed-single": "uh:Bed_Single",
    "table": "uh:Table_RoundLarge",
    "table-small": "uh:Table_RoundSmall",
    "coffee-table": "uh:CoffeeTable",
    "desk": "uh:Desk",
    "office-chair": "uh:OfficeChair",
    "stool": "uh:Stool",
    "lamp": "uh:Light_Floor1",
    "lamp-desk": "uh:Light_Desk",
    "rug": "uh:Carpet_1",
    "rug-round": "uh:Carpet_Round",
    "plant": "uh:Houseplant_1",
    "plant-tall": "uh:Houseplant_5",
    "vase": "uh:Vase",
    "bookshelf": "uh:BookCaseBooks",
    "nightstand": "uh:NightStand_1",
    "drawer": "uh:Drawer_2",
    "closet": "uh:Closet2",
    "fireplace": "uh:Fireplace",
    "tv": "k:tv-vintage",
    "tv-flat": "k:tv",
    "fridge": "uh:Kitchen_Fridge",
    "oven": "uh:Kitchen_Oven",
    "kitchen-sink": "uh:Kitchen_Sink",
    "kitchen-cabinet": "uh:Kitchen_Cabinet1",
    "bathtub": "uh:Bathroom_Bathtub",
    "shower": "uh:Bathroom_Shower1",
    "toilet": "uh:Bathroom_Toilet",
    "sink": "uh:Bathroom_Sink",
    "washer": "uh:Bathroom_WashingMachine",
    "mirror": "uh:Bathroom_Mirror1",
    "trash": "uh:Trashcan_Small1",
}


def bounds(ob):
    pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


os.makedirs(OUT, exist_ok=True)
for name, ref in MODELS.items():
    kind, stem = ref.split(":")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if kind == "uh":
        bpy.ops.import_scene.fbx(filepath=find(stem))
    else:
        bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, "kenney", stem + ".glb"))
    # the FBX materials import with alpha 0 (glTF would write them invisible)
    for mat in bpy.data.materials:
        if mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == "BSDF_PRINCIPLED":
                    for link in list(node.inputs["Alpha"].links):
                        mat.node_tree.links.remove(link)
                    node.inputs["Alpha"].default_value = 1.0
        mat.blend_method = "OPAQUE"
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    mn, mx = bounds(ob)
    ob.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    bpy.ops.object.transform_apply(location=True)
    mn, mx = bounds(ob)
    s = mx - mn  # Blender is z-up: x width, y depth, z height (glTF y-up on export)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + ".glb"), export_format="GLB")
    print(f"SIZE {name} w={s.x:.2f} d={s.y:.2f} h={s.z:.2f} faces={len(ob.data.polygons)} mats={len(ob.data.materials)}")
