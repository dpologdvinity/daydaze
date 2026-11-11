"""Convert a downloaded Quaternius vehicle (FBX) into a game-ready GLB.

Run through scripts/import-cars.sh, which supplies the sources and optimizes the
result (CC0 packs: Realistic Car Pack Nov 2018, Public Transport Pack Feb 2017).

    blender --background --factory-startup --python art/cars/import.py -- \
        <source.fbx> <out.glb> <model-key> <near|lo>

The output has one mesh per material bucket, named after the bucket, so the
client can recolor the parts that matter without UVs or textures:

    paint  body panels; vertex color is a grey shade (1.0 primary, less for a
           second tone) that the client multiplies by the car's paint color
    glass  windows (the client tints them)
    trim   bumpers, grilles, mirrors, details
    tyre   rubber (ONE wheel, centered on the origin, axle along x)
    rim    hubs (ONE wheel, same frame; the client swaps rim styles)
    light  head, tail, siren and sign lamps; vertex color is the lamp hue

Orientation and size: nose toward +Z, centered on X and Z, wheels on y = 0,
scaled so the length is the model's `length` (meters). Wheels are found by
their object names ("FrontWheels", "BackWheels"), which also tells us which end
is the nose.

The wheels are not part of the body: `tyre` and `rim` hold a single wheel (the
front one on the +x side) around the origin, so the client can instance it four
times and spin it by distance traveled. Where the four wheels sit is printed as
a `CARWHEELS` line, which is pasted into BODY_WHEELS (src/game/driving/bodies.ts).
The distance twin (`lo`) has a plain disc for `tyre` and no `rim`.
"""

import math
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

source, output, key, detail = sys.argv[sys.argv.index("--") + 1 :]

# Per model: body length in meters; the materials that are paint, mapped to a
# shade; materials that are lamps, mapped to a color; windows. Anything else
# on the body is trim.
LAMP_HEAD = (1.0, 0.93, 0.78, 1)
LAMP_TAIL = (0.9, 0.04, 0.05, 1)
LAMP_BLUE = (0.05, 0.25, 1.0, 1)
LAMP_SIGN = (1.0, 0.7, 0.2, 1)

MODELS = {
    "sedan": dict(
        length=4.5,
        paint={"Blue": 1.0},
    ),
    "hatch": dict(
        length=3.9,
        paint={"LightBlue": 1.0},
    ),
    "suv": dict(
        length=4.7,
        paint={"White": 1.0},
    ),
    "coupe": dict(
        length=4.4,
        paint={"Orange": 1.0, "DarkOrange": 0.55},
    ),
    "sports": dict(
        length=4.5,
        paint={"White": 1.0},
    ),
    "cop": dict(
        length=4.8,
        paint={"White": 1.0},
        lamps={"BlueLights": LAMP_BLUE, "WhiteLights": LAMP_HEAD},
    ),
    "taxi": dict(
        length=4.6,
        paint={"Yellow": 1.0},
        lamps={"DarkOrange": LAMP_SIGN},
    ),
    "ambulance": dict(
        length=6.0,
        paint={"White": 1.0, "Red": 0.6},
    ),
    "schoolbus": dict(
        length=8.0,
        paint={"Yellow": 1.0},
    ),
}
cfg = MODELS[key]
LAMPS = {
    "Headlights": LAMP_HEAD,
    "TailLights": LAMP_TAIL,
    "Lights": LAMP_HEAD,
}
LAMPS.update(cfg.get("lamps", {}))
GREY = (0.2, 0.2, 0.2, 1)
BLACK = (0.03, 0.03, 0.03, 1)
GLASS = (0.04, 0.07, 0.14, 1)
TYRE = (0.02, 0.02, 0.025, 1)
RIM = (0.8, 0.82, 0.88, 1)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)
objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]

# Bake each object's transform into its vertices (FBX scale and rotation).
for o in objects:
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)


def centroid(group):
    pts = [v.co for o in group for v in o.data.vertices]
    return sum(pts, Vector()) / len(pts)


# The nose is the end the front wheels are on. Turn it toward Blender -Y,
# which glTF exports as +Z.
front = [o for o in objects if "Front" in o.name]
back = [o for o in objects if "Back" in o.name]
assert front and back, "wheel objects must be named Front*/Back*"
axis = centroid(front) - centroid(back)
axis.z = 0
angle = math.atan2(axis.x, -axis.y)  # rotation taking `axis` onto -Y
turn = Matrix.Rotation(angle, 4, "Z")
for o in objects:
    o.data.transform(turn)

pts = [v.co for o in objects for v in o.data.vertices]
lo = Vector(tuple(min(p[i] for p in pts) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in pts) for i in range(3)))
scale = cfg["length"] / (hi.y - lo.y)
center = Vector(((hi.x + lo.x) / 2, (hi.y + lo.y) / 2, lo.z))
for o in objects:
    for v in o.data.vertices:
        v.co = (v.co - center) * scale

# Bucket materials, one per mesh in the output. A vertex color node feeds the
# base color, so the exporter writes COLOR_0.
BUCKETS = ["paint", "glass", "trim", "tyre", "rim", "light"]
bucket_mat = {}
for name in BUCKETS:
    m = bpy.data.materials.new("Car" + name.capitalize())
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    vc = m.node_tree.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Color"
    m.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.6
    bucket_mat[name] = m


def classify(wheel, name):
    """(bucket, color) for a face with source material `name`."""
    if wheel:
        return ("rim", RIM) if name == "Grey" else ("tyre", TYRE)
    if name in cfg["paint"]:
        s = cfg["paint"][name]
        return "paint", (s, s, s, 1)
    if name == "Windows":
        return "glass", GLASS
    if name in LAMPS:
        return "light", LAMPS[name]
    if name == "Grey":
        return "trim", GREY
    return "trim", BLACK


for o in objects:
    wheel = "Wheel" in o.name
    old = [m.name if m else "" for m in o.data.materials]
    # the FBX may carry its own color layers: ours must be the only one
    while o.data.color_attributes:
        o.data.color_attributes.remove(o.data.color_attributes[0])
    colors = o.data.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="CORNER")
    chosen = []
    for p in o.data.polygons:
        bucket, color = classify(wheel, old[p.material_index] if old else "")
        chosen.append(BUCKETS.index(bucket))
        for i in p.loop_indices:
            colors.data[i].color = color
    o.data.materials.clear()
    for name in BUCKETS:
        o.data.materials.append(bucket_mat[name])
    for p, index in zip(o.data.polygons, chosen):
        p.material_index = index

bpy.ops.object.select_all(action="DESELECT")
for o in objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
car = bpy.context.object
# Marks the window vertices, so the distance twin's decimation can protect them
# (flat quads are the cheapest thing to collapse, and the windows are flat).
glass_index = BUCKETS.index("glass")
car.vertex_groups.new(name="glass").add(
    sorted({v for p in car.data.polygons if p.material_index == glass_index for v in p.vertices}),
    1.0,
    "REPLACE",
)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.separate(type="MATERIAL")
bpy.ops.object.mode_set(mode="OBJECT")

parts = {}
for o in list(bpy.context.scene.objects):
    if o.type != "MESH":
        continue
    if not o.data.polygons:
        bpy.data.objects.remove(o)
        continue
    bucket = o.data.materials[o.data.polygons[0].material_index].name[3:].lower()
    o.name = bucket
    o.data.name = bucket
    parts[bucket] = o

def tris_of(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def split_by_material(obj):
    """Separates `obj` into one object per bucket material, named after it."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="MATERIAL")
    bpy.ops.object.mode_set(mode="OBJECT")
    # free the names of the meshes joined away (they linger as orphans)
    bpy.data.orphans_purge(do_recursive=True)
    out = {}
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH" or o in parts.values():
            continue
        if not o.data.polygons:
            bpy.data.objects.remove(o)
            continue
        name = o.data.materials[o.data.polygons[0].material_index].name[3:].lower()
        o.name = o.data.name = name
        out[name] = o
    return out


def quadrant(co):
    """Which wheel a point belongs to: (right of center, toward the tail)."""
    return (co.x > 0, co.y > 0)


def wheel_centres(tyre):
    """The four wheels as {quadrant: (center, radius, width)}: the tyre vertices
    grouped by side (x) and end (y), each group's bounding box (the axle runs
    along x)."""
    groups = {}
    for v in tyre.data.vertices:
        groups.setdefault(quadrant(v.co), []).append(v.co.copy())
    assert len(groups) == 4, "expected four wheels"
    out = {}
    for q, pts in groups.items():
        xs, ys, zs = ([c[i] for c in pts] for i in range(3))
        centre = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2))
        out[q] = (centre, max(max(ys) - min(ys), max(zs) - min(zs)) / 2, max(xs) - min(xs))
    return out


def lone_wheel(obj, q, centre):
    """Keeps only the faces of wheel `q`, moved so the wheel's center is the origin."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(
        bm, geom=[f for f in bm.faces if quadrant(f.calc_center_median()) != q], context="FACES"
    )
    bmesh.ops.translate(bm, verts=bm.verts, vec=-centre)
    bm.to_mesh(obj.data)
    bm.free()


def wheel_disc(radius, width):
    """A plain 10-sided disc at the origin, axle along x: the distance twin's wheel."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=width, rotation=(0, math.pi / 2, 0))
    d = bpy.context.object
    while d.data.uv_layers:
        d.data.uv_layers.remove(d.data.uv_layers[0])
    d.data.materials.append(bucket_mat["tyre"])
    colors = d.data.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="CORNER")
    for c in colors.data:
        c.color = TYRE
    d.name = d.data.name = "tyre"
    return d


# The wheels leave the body: one wheel (front, +x side) at the origin for the
# client to instance, and where the four sit, for BODY_WHEELS. glTF is x right,
# y up, z toward the nose; Blender's y is -z and its z is up.
centres = wheel_centres(parts["tyre"])
proto = (True, False)
proto_centre = centres[proto][0]
front = [c for q, (c, _, _) in centres.items() if not q[1]]
rear = [c for q, (c, _, _) in centres.items() if q[1]]
radius, width = centres[proto][1], centres[proto][2]
print(
    "CARWHEELS",
    key,
    dict(
        radius=round(radius, 3),
        width=round(width, 3),
        y=round(proto_centre.z, 3),
        frontX=round(sum(abs(c.x) for c in front) / 2, 3),
        rearX=round(sum(abs(c.x) for c in rear) / 2, 3),
        frontZ=round(-sum(c.y for c in front) / 2, 3),
        rearZ=round(-sum(c.y for c in rear) / 2, 3),
    ),
)
for name in ("tyre", "rim"):  # the buses have no hubs
    if name in parts:
        lone_wheel(parts[name], proto, proto_centre)

if detail == "lo":
    # The distance twin: the body thinned as one mesh (so paint, trim and
    # glass cannot pull apart at the seams), a plain disc for the wheel, no hubs.
    if "rim" in parts:
        bpy.data.objects.remove(parts.pop("rim"))
    bpy.data.objects.remove(parts.pop("tyre"))
    tyre = wheel_disc(radius, width)
    body_parts = [parts.pop(name) for name in ("paint", "trim", "glass", "light") if name in parts]
    bpy.ops.object.select_all(action="DESELECT")
    for o in body_parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = body_parts[0]
    bpy.ops.object.join()
    body = bpy.context.object
    # the joined mesh keeps the first part's name; free "paint" for the split
    body.name = body.data.name = "lodbody"
    # about 700 triangles for the body: the low tier draws this twin from
    # every distance, and the budget (src/game/city/budget.ts) prices a dozen.
    # The windows are held back from the decimation: left to it, the cheap
    # flat quads of the glass collapse first and the glass goes thin.
    mod = body.modifiers.new("lod", "DECIMATE")
    mod.ratio = min(1.0, 690 / tris_of(body))
    mod.use_symmetry = True
    mod.symmetry_axis = "X"
    mod.vertex_group = "glass"
    mod.invert_vertex_group = True  # weight 1 here means "collapse freely"
    mod.vertex_group_factor = 10.0
    bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.update(split_by_material(body))
    parts["tyre"] = tyre

total = sum(len(o.data.polygons) for o in parts.values())
tris = 0
for o in parts.values():
    for p in o.data.polygons:
        tris += len(p.vertices) - 2
print("CARTRIS", key, detail, tris, {b: sum(len(p.vertices) - 2 for p in o.data.polygons) for b, o in parts.items()})

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=output, export_format="GLB", use_selection=True)
