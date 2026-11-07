"""Street furniture for the city (see docs/assets.md for sources).

Builds one GLB per kind in $OUT: Quaternius' Street Pack lamp and signs (CC0),
Poly Haven's hydrant and trash can, Quaternius' bench (CC0), and Poly Pizza downloads
(mailbox, parking meter, bike rack, bus shelter, palm, planter, traffic light),
and the Sketchfab newspaper box (CC-BY),
all cut down to a few hundred triangles. Each model
stands on y = 0, centered on x and z, facing +z (toward the street), sized in
meters, with its materials kept apart so the client can instance each part.

    SRC_Q=<Street Pack FBX dir> SRC_PH=<dir of Poly Haven gltf folders> SRC_PP=<dir of Poly Pizza glbs> \\
    OUT=<dir> blender --background --factory-startup --python art/street/build_street.py
"""

import math
import os

import bpy
from mathutils import Vector

SRC_Q = os.environ.get("SRC_Q", "")
SRC_PH = os.environ.get("SRC_PH", "")
SRC_PP = os.environ.get("SRC_PP", "")
SRC_PK = os.environ.get("SRC_PK", "")
OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def meshes():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def bake_and_join():
    """Applies every transform, joins all meshes into one object (materials kept)."""
    bpy.ops.object.select_all(action="DESELECT")
    ms = meshes()
    for o in bpy.context.scene.objects:
        o.parent = None if o.type != "MESH" else o.parent
    for o in ms:
        o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def bounds(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi


def fit(o, height=None, length=None, keep_xy=False):
    """Scales to `height` (or longest side `length`), stands on z = 0, centers x and y."""
    lo, hi = bounds(o)
    size = hi - lo
    s = height / size.z if height else length / max(size.x, size.y)
    o.scale = (s, s, s)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    lo, hi = bounds(o)
    c = (lo + hi) / 2
    o.location = (0 if keep_xy else -c.x, 0 if keep_xy else -c.y, -lo.z)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def decimate(o, tris):
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n <= tris:
        return
    m = o.modifiers.new("d", "DECIMATE")
    m.ratio = tris / n
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="d")


def export(name):
    for o in meshes():
        for mod in list(o.modifiers):
            o.modifiers.remove(mod)
    bpy.ops.export_scene.gltf(
        filepath=f"{OUT}/{name}.glb",
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )
    print("BUILT", name, sum(len(p.vertices) - 2 for o in meshes() for p in o.data.polygons))


def opaque():
    """The Street Pack FBX materials import with alpha 0 (glTF would cut them out)."""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                for link in list(n.inputs["Alpha"].links):
                    m.node_tree.links.remove(link)
                n.inputs["Alpha"].default_value = 1.0
        if hasattr(m, "blend_method"):
            m.blend_method = "OPAQUE"
        if m.name.startswith("Glass"):
            # the lamp's lantern: see-through, so the plan's bulb glows inside
            for n in m.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    n.inputs["Alpha"].default_value = 0.3
            if hasattr(m, "blend_method"):
                m.blend_method = "BLEND"


def imported(path, height=None, length=None, tris=None, turn=0.0, keep_xy=False):
    reset()
    if path.endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    if path.endswith(".fbx"):
        opaque()
    o = bake_and_join()
    o.rotation_euler[2] = turn
    bpy.ops.object.transform_apply(rotation=True)
    fit(o, height=height, length=length, keep_xy=keep_xy)
    if tris:
        decimate(o, tris)
    return o


Q = lambda n: f"{SRC_Q}/{n}.fbx"
PH = lambda n: f"{SRC_PH}/{n}/{n}.gltf"

def traffic_light(path):
    """Poly Google's traffic light: the pole and one head, the head copied to all
    four sides, its lenses dropped (the client draws them lit, cycling red,
    yellow and green: SIGNAL in src/game/city/furniture.ts matches this scale)."""
    reset()
    bpy.ops.import_scene.gltf(filepath=path)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for o in [o for o in bpy.context.scene.objects if o.type != "MESH"]:
        bpy.data.objects.remove(o)
    by = {o.name: o for o in meshes()}
    for n in ("Cylinder002", "Cylinder003", "Cylinder004"):
        bpy.data.objects.remove(by.pop(n))
    pole = by.pop("Cylinder001")
    lo, hi = bounds(pole)
    ax = (lo + hi) / 2
    for o in meshes():
        o.location = (-ax.x, -ax.y, -lo.z)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    heads = list(by.values())
    for k in (1, 2, 3):
        bpy.ops.object.select_all(action="DESELECT")
        for h in heads:
            h.select_set(True)
        bpy.ops.object.duplicate()
        for d in bpy.context.selected_objects:
            d.rotation_euler[2] = k * math.pi / 2
        bpy.ops.object.transform_apply(rotation=True)
    o = bake_and_join()
    o.scale = (0.0029, 0.0029, 0.0029)
    bpy.ops.object.transform_apply(scale=True)


PP = lambda n: f"{SRC_PP}/{n}.glb"

def street_set():
    imported(Q("Streetlight_Single"), height=5.4, tris=350); export("lamp")
    imported(Q("Sign_Stop"), height=2.4); export("sign-stop")
    imported(Q("Sign_NoParking"), height=2.4); export("sign-noparking")
    imported(PH("fire_hydrant"), height=0.8, tris=300); export("hydrant")
    imported(PH("metal_trash_can"), height=0.95, tris=250); export("trashcan")
    # Poly Pizza downloads (see docs/assets.md)
    imported(PP("mailbox"), height=1.15, tris=240); export("mailbox")
    imported(PP("meter"), height=1.4, tris=400); export("meter")
    imported(PP("bikerack"), length=1.1, tris=800); export("bikerack")
    imported(PP("busstop"), height=2.9, tris=300); export("busstop")
    imported(PP("palm1"), height=7.0, tris=350); export("palm")
    traffic_light(PP("traffic2")); export("trafficlight")
    imported(f"{SRC_PP}/newsbox-src/scene.gltf", height=1.1, tris=700); export("newsbox")
    imported(PP("planter"), length=1.8, tris=1000); export("planter")


PK = lambda n: f"{SRC_PK}/{n}.glb"


def split_ends(o):
    """Gives the bench two materials, "slats" (the long boards) and "ends" (the legs
    and arms, |x| > 0.74 m), and separates them into two meshes so the client can
    texture each (CityFurniture BENCH_SURFACES). Colors are placeholders: the client
    draws both from its tiling surfaces."""
    base = o.data.materials[0]
    ends = base.copy()
    base.name, ends.name = "slats", "ends"
    # distinct colors, or glTF-Transform's dedup folds the two materials into one
    for m, rgb in ((base, (0.35, 0.22, 0.12)), (ends, (0.1, 0.1, 0.1))):
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                n.inputs["Base Color"].default_value = (*rgb, 1.0)
    o.data.materials.append(ends)
    for p in o.data.polygons:
        p.material_index = 1 if abs(p.center.x) > 0.74 else 0
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="MATERIAL")
    bpy.ops.object.mode_set(mode="OBJECT")


def bench_set():
    """Quaternius' rustic bench (CC0, Poly Pizza), 1.8 m long, seat at 0.46 m. Built
    twice (the client textures them differently: green paint and iron, weathered
    planks). The bench's back is at +z in the source; turn it to face +z like the
    other kinds."""
    for name in ("bench", "boardbench"):
        o = imported(PP("bench-quaternius"), length=1.8, turn=math.pi)
        split_ends(o)
        export(name)


def park_set():
    """The park's props (Poly Pizza, CC0 / CC-BY; see docs/assets.md)."""
    imported(PK("fountain3"), length=6.0, tris=900); export("fountain")
    imported(PK("gazebo2"), length=7.0, tris=700); export("gazebo")
    imported(PK("rowboat2"), length=3.0, tris=350); export("rowboat")
    imported(PK("duck2"), length=0.5, tris=250); export("duck")
    imported(PK("picnic1"), length=2.2, tris=450); export("picnic-table")
    imported(PK("basket"), height=0.35, tris=200); export("basket")
    imported(PK("rug"), length=2.4, tris=200); export("blanket")


def beach_set():
    """Beachside's boardwalk props (Poly Pizza, CC0 / CC-BY; see docs/assets.md)."""
    imported(PK("umb1"), height=2.6, tris=250); export("umbrella-red")
    imported(PK("umb2"), height=2.6, tris=250); export("umbrella-blue")
    imported(PK("lifeguard"), height=3.8, tris=500); export("lifeguard")
    imported(PK("chaise"), length=1.9, tris=300); export("chaise")
    imported(PK("fence1"), length=3.0, tris=120); export("rail")
    imported(PK("popcorn"), length=2.2, tris=500); export("popcorn-cart")
    imported(PK("hotdog"), height=2.4, tris=300); export("hotdog-cart")
    imported(PK("icecream"), height=4.5, tris=250); export("cone")
    # the Ferris wheel is the animated download, optimized straight from its glTF (no Blender)
    imported(PK("carousel"), length=9.0, tris=1200); export("carousel")
    imported(PK("towel"), length=1.8, tris=60); export("towel")
    imported(PK("castle"), length=1.4, tris=250); export("sandcastle")


def deck_set():
    """Boardwalk kiosks and the cyclists' bicycle (Poly Pizza; see docs/assets.md)."""
    imported(PK("market"), length=3.2, tris=700); export("kiosk-market")
    imported(PK("vendor"), length=2.6, tris=900); export("kiosk-vendor")
    imported(PK("booth"), length=3.4, tris=700); export("kiosk-booth")
    imported(PK("bicycle"), length=1.8, tris=1000); export("bicycle")
    imported(PK("pickup"), length=6.0, tris=1500); export("parade-truck")


if os.environ.get("SET") == "park":
    park_set()
elif os.environ.get("SET") == "deck":
    deck_set()
elif os.environ.get("SET") == "bench":
    bench_set()
elif os.environ.get("SET") == "beach":
    beach_set()
else:
    street_set()
