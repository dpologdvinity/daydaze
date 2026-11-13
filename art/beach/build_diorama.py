"""Beach diorama pieces for the Water Park deck and the hotel rooftop.

Cuts the sun bed, the beach umbrella and the towel out of Jef Belmans' "Let's
go to the beach" diorama (CC-BY, see docs/assets.md), straightens each (the
diorama has them tilted and half buried in sand), stands it on y = 0 centered
on x and z, and writes one GLB per piece to $OUT. The baked sand and weathering
textures are dropped: parts get the house palette as vertex colors instead
(the Water Park's PROPS material draws them), except the towel, which keeps its
UVs so the deck can print its own stripes on it. Umbrellas come in several
palettes: eight gores alternating two colors.

    SRC=<dir holding source/export.fbx> OUT=<dir> \\
    blender --background --factory-startup --python art/beach/build_diorama.py

Then: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

SRC = os.environ["SRC"]
OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)

# name in the diorama -> (extra yaw in degrees, longest side in meters; an
# umbrella is sized by its height instead)
PIECES = {
    "Sunbed": (0, 1.9),
    "BeachUmbrella": (0, 2.7),
    "Towel": (0, 0.9),
}
# umbrella palettes: (file suffix, gore A, gore B); eight gores alternate A, B
UMBRELLAS = [
    ("pink", "#ff4fb3", "#ffffff"),
    ("sky", "#3fc2ff", "#ffd23f"),
    ("mint", "#7cf0c8", "#ff9a56"),
]
UMBRELLA_POLE = "#ffffff"
SUNBED_FRAME = "#7fd4e8"
# the canopy's disc in the umbrella's texture: its center in UV space, where
# the gores fan out around it (faces on it are canopy, the rest is pole)
CANOPY_UV = Vector((0.317, 0.312))
CANOPY_RADIUS = 0.33


def linear(hex_color):
    """sRGB hex to the linear floats glTF vertex colors hold."""
    out = []
    for i in (1, 3, 5):
        c = int(hex_color[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def straighten(src):
    """A copy of the diorama mesh in its own frame, Z up."""
    me = src.data.copy()
    # the FBX import tilts every prop to its place in the dune; undo that and
    # keep only the unit scale and the Y-up to Z-up turn
    scale = src.matrix_world.to_scale()[0]
    me.transform(Matrix.Rotation(math.radians(90), 4, "X") @ Matrix.Scale(scale, 4))
    return me


def align_bed(me):
    """Turns a bed so its length runs along y with the raised back at +y (glTF -z)."""
    pts = [v.co for v in me.vertices]
    n = len(pts)
    mx = sum(p.x for p in pts) / n
    my = sum(p.y for p in pts) / n
    cxx = sum((p.x - mx) ** 2 for p in pts)
    cyy = sum((p.y - my) ** 2 for p in pts)
    cxy = sum((p.x - mx) * (p.y - my) for p in pts)
    long_axis = 0.5 * math.atan2(2 * cxy, cxx - cyy)
    me.transform(Matrix.Rotation(math.pi / 2 - long_axis, 4, "Z"))
    top = max(p.z for p in (v.co for v in me.vertices))
    raised = [v.co.y for v in me.vertices if v.co.z > 0.9 * top]
    if sum(raised) / len(raised) < sum(v.co.y for v in me.vertices) / n:
        me.transform(Matrix.Rotation(math.pi, 4, "Z"))


def fit(me, yaw, size, by_height=False):
    """Turns, scales to `size` and stands on z = 0, centered on x and y (an
    umbrella on its pole's foot, not its tilted canopy)."""
    me.transform(Matrix.Rotation(math.radians(yaw), 4, "Z"))
    pts = [v.co for v in me.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    s = size / ((hi.z - lo.z) if by_height else max(hi.x - lo.x, hi.y - lo.y))
    if by_height:
        foot = [p for p in pts if p.z < lo.z + 0.03]
        c = sum(foot, Vector()) / len(foot)
    else:
        c = (lo + hi) / 2
    me.transform(Matrix.Scale(s, 4) @ Matrix.Translation((-c.x, -c.y, -lo.z)))
    if by_height:
        # the canopy leans off the pole: turn it to lean toward glTF -z, over the beds
        crown = [v.co for v in me.vertices if v.co.z > 0.85 * size]
        lean = sum((Vector((p.x, p.y, 0)) for p in crown), Vector()) / len(crown)
        me.transform(Matrix.Rotation(math.pi / 2 - math.atan2(lean.y, lean.x), 4, "Z"))


def paint(me, color_of_face):
    """One flat vertex color per face, from `color_of_face(polygon)`."""
    attr = me.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    for poly in me.polygons:
        color = color_of_face(me, poly)
        for loop in poly.loop_indices:
            attr.data[loop].color = color
    me.color_attributes.active_color = attr


def double_sided(me):
    """Adds a flipped copy of every face, so a one-sided canopy shows from below."""
    bm = bmesh.new()
    bm.from_mesh(me)
    flipped = bmesh.ops.duplicate(bm, geom=list(bm.faces))
    bmesh.ops.reverse_faces(bm, faces=[f for f in flipped["geom"] if isinstance(f, bmesh.types.BMFace)])
    bm.to_mesh(me)
    bm.free()


def export(obj, name):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, name + ".glb"),
        export_format="GLB",
        use_selection=True,
        export_vertex_color="ACTIVE",
        export_image_format="NONE",
        export_materials="EXPORT",
    )


def flat_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.9
    attr = m.node_tree.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Color"
    m.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return m


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, "source", "export.fbx"))
diorama = {o.name: o for o in bpy.data.objects if o.type == "MESH"}


def build(piece, name, color_of_face=None, by_height=False, double=False):
    yaw, size = PIECES[piece]
    me = straighten(diorama[piece])
    if piece == "Sunbed":
        align_bed(me)
    fit(me, yaw, size, by_height)
    if color_of_face:
        paint(me, color_of_face)
        me.materials.clear()
        me.materials.append(flat_material(name))
    if double:
        double_sided(me)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    export(obj, name)


def gores(me):
    """Which of the canopy's eight gores each face is in, or None for the pole.

    The canopy is a disc in the umbrella's texture (CANOPY_UV), so faces on it
    are canopy. Its eight faces round the apex are the gores' roots (ordered by
    their angle in UV space); every face further out takes the gore of the
    neighbor one step nearer the apex, so a gore runs apex to rim however the
    rings are cut.
    """
    uvs = me.uv_layers.active.data
    canopy = {}
    for poly in me.polygons:
        uv = sum((uvs[l].uv for l in poly.loop_indices), Vector((0, 0))) / len(poly.loop_indices)
        if (uv - CANOPY_UV).length <= CANOPY_RADIUS:
            canopy[poly.index] = uv - CANOPY_UV
    around = {}
    for i in canopy:
        for v in me.polygons[i].vertices:
            around.setdefault(v, []).append(i)
    apex = max(around, key=lambda v: len(around[v]))
    label = {}
    roots = sorted(around[apex], key=lambda i: math.atan2(canopy[i].y, canopy[i].x))
    for k, i in enumerate(roots):
        label[i] = k % 8
    edge_faces = {}
    for i in canopy:
        poly = me.polygons[i]
        for key in poly.edge_keys:
            edge_faces.setdefault(key, []).append(i)
    frontier = list(roots)
    while frontier:
        nxt = []
        for i in frontier:
            for key in me.polygons[i].edge_keys:
                for j in edge_faces[key]:
                    if j not in label:
                        label[j] = label[i]
                        nxt.append(j)
        frontier = nxt
    return {i: label.get(i) for i in canopy}


def umbrella_color(a, b):
    """Gores alternate colors A, B round the canopy; everything else is pole."""
    labels = {}

    def color(me, poly):
        if not labels:
            labels.update(gores(me))
        gore = labels.get(poly.index)
        if gore is None:
            return linear(UMBRELLA_POLE)
        return linear(a if gore % 2 == 0 else b)

    return color


build("Sunbed", "sunbed", lambda me, p: linear(SUNBED_FRAME))
build("Towel", "towel-draped")
for suffix, a, b in UMBRELLAS:
    build("BeachUmbrella", "umbrella-" + suffix, umbrella_color(a, b), by_height=True, double=True)
