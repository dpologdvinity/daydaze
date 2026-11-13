"""Builds the Paintball and Laser Tag opponents from Quaternius' Universal Base
Characters (CC0, see docs/assets.md): the Superhero woman and man, a 65-bone
rig shared with the Universal Animation Library, so the library's clips play on
them as they are.

    UBC_DIR=<unzipped Universal Base Characters> \
      blender --background --factory-startup --python art/opponents/build_opponents.py

The pack's bodies are bare (painted underwear), so each gets clothes cut from
its own skin, the way the doll's tights are (art/doll/blender/doll_outfits.py):
faces of the decimated body picked by height and bone weights, pushed out along
their normals and left skinned to the same bones, so they follow the body in
any clip. Per sex this writes art/opponents/.cache/out/opponent-<f|m>.glb with
four meshes on one rig:

  Body   the decimated skin, with the pack's skin texture (light and dark
         variants: the client swaps the map)
  Eyes   the pack's eyes (own texture)
  Cloth  jersey, pants, shoes and helmet in one mesh; a white-to-grey vertex
         color says which is which, and the client tints it per team
  Vest   a chest and back plate over the jersey, its own mesh so it can glow

The brows and hair are left out (the helmet covers the head). The pack's UVs
past the first layer are dropped. scripts/optimize-opponents.sh compresses the
files and writes the far-LOD twins.
"""

import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
UBC = os.environ.get("UBC_DIR", "/tmp/ubc")
OUT = os.path.join(HERE, ".cache", "out")
GLTF = "Universal Base Characters[Standard]/Base Characters/Godot - UE"
# the share of the pack's triangles the near body keeps
KEEP = 0.42

# vertex color value per cloth piece (the client multiplies the team color by it)
JERSEY, PANTS, SHOES, HELMET, VISOR = 1.0, 0.32, 0.1, 0.9, 0.03


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def weights(ob, names):
    """Per-vertex total weight on the bones whose name starts with any prefix."""
    groups = {g.index for g in ob.vertex_groups if g.name.startswith(names)}
    out = np.zeros(len(ob.data.vertices))
    for v in ob.data.vertices:
        out[v.index] = sum(g.weight for g in v.groups if g.group in groups)
    return out


def load(sex):
    """The pack's character as (rig, body, eyes), junk removed."""
    clear()
    bpy.ops.import_scene.gltf(filepath=os.path.join(UBC, GLTF, f"Superhero_{sex}_FullBody.gltf"))
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.lower().startswith("superhero"))
    eyes = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Eyes"))
    for o in list(bpy.data.objects):
        # the brows and the importer's bone-shape icospheres
        if o.type == "MESH" and o not in (body, eyes):
            bpy.data.objects.remove(o)
    for ob in (body, eyes):
        while len(ob.data.uv_layers) > 1:
            ob.data.uv_layers.remove(ob.data.uv_layers[-1])
    return rig, body, eyes


def decimate(body, keep):
    """Collapses the body to `keep` of its triangles. The armature modifier
    comes off while it runs (a modifier after another can't be applied) and
    goes back on; vertex groups survive a collapse."""
    arm = next(m for m in body.modifiers if m.type == "ARMATURE")
    target = arm.object
    body.modifiers.remove(arm)
    mod = body.modifiers.new("Decimate", "DECIMATE")
    mod.ratio = keep
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=mod.name)
    again = body.modifiers.new("Armature", "ARMATURE")
    again.object = target


def shell(body, name, pick, push, color, clamp=None):
    """A new skinned object of the body's faces `pick(center, weights)` chooses,
    pushed out `push` metres and painted `color`. `clamp(vertex_co)` may move a
    cut edge flat onto a hem line."""
    me = body.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    deform = bm.verts.layers.deform.active
    names = [g.name for g in body.vertex_groups]

    def share(vert, prefixes):
        return sum(w for gi, w in vert[deform].items() if names[gi].startswith(prefixes))

    drop = [f for f in bm.faces if not pick(f.calc_center_median(), lambda p, f=f: np.mean([share(v, p) for v in f.verts]))]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        v.co = v.co + v.normal * push
        if clamp:
            v.co = clamp(v.co)
    out = bpy.data.meshes.new(name)
    bm.to_mesh(out)
    bm.free()
    ob = bpy.data.objects.new(name, out)
    bpy.context.scene.collection.objects.link(ob)
    # groups carry over by name; the armature drives it like the body
    for g in body.vertex_groups:
        ob.vertex_groups.new(name=g.name)
    ob.parent = body.parent
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = body.parent
    return ob


def build(sex):
    rig, body, eyes = load(sex)
    top = max(v.co.z for v in body.data.vertices)
    # landmarks from the rig, in metres (the pack's bones are the same on both)
    z = lambda bone: rig.data.bones[bone].head_local.z
    waist, hip, knee, ankle = z("spine_01") - 0.02, z("pelvis"), z("calf_l"), z("foot_l")
    chest0, neck = z("spine_03") - 0.05, z("neck_01")
    elbow = rig.data.bones["lowerarm_l"].head_local.x
    shoulder = rig.data.bones["upperarm_l"].head_local.x
    print(sex, "height", round(top, 3), "waist", round(waist, 3), "ankle", round(ankle, 3), "neck", round(neck, 3))
    decimate(body, KEEP)
    tris = len(body.data.polygons)
    print(sex, "body", tris, "faces after decimation")

    # --- cloth: one object per piece, joined below ---
    sleeve = shoulder + (elbow - shoulder) * 0.62
    hem = waist - 0.04
    jersey = shell(
        body,
        "Jersey",
        lambda c, w: c.z > hem - 0.03 and c.z < neck + 0.02 and abs(c.x) < sleeve + 0.03,
        0.011,
        JERSEY,
        clamp=lambda p: Vector((max(-sleeve, min(sleeve, p.x)), p.y, max(hem, p.z))),
    )
    pants = shell(
        body,
        "Pants",
        lambda c, w: c.z < waist + 0.06 and c.z > ankle + 0.0,
        0.006,
        PANTS,
        clamp=lambda p: Vector((p.x, p.y, max(ankle + 0.025, min(waist + 0.03, p.z)))),
    )
    shoes = shell(
        body,
        "Shoes",
        lambda c, w: c.z < ankle + 0.03,
        0.009,
        SHOES,
        clamp=lambda p: Vector((p.x, p.y, min(ankle + 0.03, p.z))),
    )
    helmet = shell(
        body,
        "Helmet",
        lambda c, w: c.z > top - 0.14 and c.y > -0.3,
        0.016,
        HELMET,
        clamp=lambda p: Vector((p.x, p.y, max(top - 0.115, p.z))),
    )
    vest = shell(
        body,
        "Vest",
        lambda c, w: c.z > chest0 - 0.09 and c.z < neck - 0.01 and abs(c.x) < 0.2,
        0.024,
        1.0,
        clamp=lambda p: Vector((max(-0.17, min(0.17, p.x)), p.y, max(chest0 - 0.06, min(neck - 0.04, p.z)))),
    )
    return rig, body, eyes, [(jersey, JERSEY), (pants, PANTS), (shoes, SHOES), (helmet, HELMET)], vest


def paint(ob, value):
    """Vertex color `value` (grey) on every corner, named Color."""
    attr = ob.data.color_attributes.new("Color", "BYTE_COLOR", "CORNER")
    attr.data.foreach_set("color", [value, value, value, 1.0] * len(attr.data))


def export(sex, rig, parts):
    for ob in parts:
        # glTF skins carry four influences a vertex: keep the strongest, normalized
        bpy.ops.object.select_all(action="DESELECT")
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for ob in parts:
        ob.select_set(True)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"opponent-{'m' if sex == 'Male' else 'f'}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_animations=False,
        export_skins=True,
        export_morph=False,
        export_vertex_color="ACTIVE",
        export_materials="EXPORT",
    )
    print("wrote", path)


def main():
    for sex in ("Female", "Male"):
        rig, body, eyes, pieces, vest = build(sex)
        # the cloth pieces become one mesh: white for the team's color, greys
        # for the dark parts
        for ob, value in pieces:
            paint(ob, value)
        bpy.ops.object.select_all(action="DESELECT")
        for ob, _ in pieces:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = pieces[0][0]
        bpy.ops.object.join()
        cloth = bpy.context.view_layer.objects.active
        cloth.name = "Cloth"
        mat = bpy.data.materials.new("cloth")
        mat.use_nodes = True
        cloth.data.materials.append(mat)
        vmat = bpy.data.materials.new("vest")
        vmat.use_nodes = True
        vest.data.materials.append(vmat)
        body.name, eyes.name = "Body", "Eyes"
        export(sex, rig, [body, eyes, cloth, vest])


main()
