"""Street trees and palms from Quaternius' stylized packs (CC0), near and far.

Builds, into $OUT, a GLB pair per model: the full tree (`<name>.glb`) and the
far twin (`<name>-lo.glb`, for distance and the low tier). Sources, unpacked by
hand (the owner's downloads; see docs/assets.md):

    TST   Textured Stylized Trees, May 2020  (FBX/Tree_*.fbx, Textures/)
    USN   Ultimate Stylized Nature, May 2022 (FBX/PalmTree_*.fbx, Textures/)

What the script does to each model:

- one bark and one leaf material (same two textures for every model of a pack,
  so the client's instanced meshes share them), leaf alpha as cutout;
- the leaf texture's color is bled into its transparent texels, so a mipmapped
  cutout edge blends leaf green and not the black of the empty texels (that
  black ring was the dark, noisy fringe on every crown);
- leaf normals point away from the crown's center (a little upward), so a crown
  shades like one lit volume and no card's back goes dark;
- the far twin keeps one leaf card in KEEP (the survivors grown by GROW about
  their own centers, so the crown still reads full) and decimates the bark.

    [ONLY="street-tree-8 palm"] SRC_TST=<dir> SRC_USN=<dir> OUT=<dir> \\
    blender --background --factory-startup --python art/nature/build_trees.py

then `bash scripts/import-trees.sh` optimizes the GLBs into public/models/nature/.
"""

import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector

SRC_TST = os.environ["SRC_TST"]
SRC_USN = os.environ["SRC_USN"]
OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)

# (output name, pack, FBX name, height in meters or 0 for as modeled, far twin
# too, KEEP, GROW, bark ratio of the far twin)
MODELS = [
    ("street-tree-1", "TST", "Tree_1", 0, True, 1, 1.0, 0.3),
    ("street-tree-2", "TST", "Tree_5", 0, True, 3, 1.4, 0.2),
    ("street-tree-3", "TST", "Tree_6", 0, True, 2, 1.3, 0.15),
    ("street-tree-4", "TST", "Tree_8", 0, True, 2, 1.3, 0.15),
    ("street-tree-5", "TST", "Tree_10", 0, True, 2, 1.3, 0.15),
    # the palms are street furniture (public/models/street/), drawn only near
    # birches and maples for the Uptown park and Suburbia's lawns (plan.ts
    # treeAt picks them there); the far twin carries them on the low tier
    ("street-tree-6", "TSTB", "Birch_2", 0, True, 2, 1.3, 0.15),
    ("street-tree-7", "TSTB", "Birch_7", 0, True, 2, 1.3, 0.15),
    ("street-tree-8", "USNM", "MapleTree_1", 0, True, 4, 1.8, 0.04),
    ("street-tree-9", "USNM", "MapleTree_2", 0, True, 5, 2.0, 0.04),
    ("palm", "USN", "PalmTree_1", 7.0, False, 1, 1.0, 1.0),
    ("palm-2", "USN", "PalmTree_3", 7.0, False, 1, 1.0, 1.0),
]
PACKS = {
    "TST": dict(
        src=SRC_TST,
        leaves="Textures/Tree_Leaves.png",
        bark="Textures/Tree_Bark.jpg",
    ),
    "USN": dict(
        src=SRC_USN,
        leaves="Textures/PalmTree_Leaves.png",
        bark="Textures/PalmTree_Trunk.png",
    ),
    # the Textured Stylized Trees' birch (own leaf and bark textures)
    "TSTB": dict(
        src=SRC_TST,
        leaves="Textures/Birch_Leaves_Green.png",
        bark="Textures/Birch_Bark.png",
    ),
    # the Ultimate Stylized Nature maple: its leaf texture is autumn red, so the
    # gray one is used, turned leaf green here (the client tints each tree)
    "USNM": dict(
        src=SRC_USN,
        leaves="Textures/MapleTree_Leaves_BW.png",
        bark="Textures/MapleTree_Bark.png",
        leaf_color=(0.9, 1.2, 0.7),
    ),
}
# how far the leaf normals lean up from "away from the crown's center"
LEAN_UP = 0.35


def bled(path, name, color=None):
    """The image at `path` (multiplied by `color` if given) with every
    transparent texel's color taken from its nearest opaque neighbors
    (dilated eight texels out)."""
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    if color:
        px[..., :3] = np.clip(px[..., :3] * np.array(color, np.float32), 0, 1)
    known = px[..., 3] > 0.5
    for _ in range(8):
        total = np.zeros((h, w, 3), np.float32)
        count = np.zeros((h, w), np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = np.roll(known, (dy, dx), (0, 1))
            c = np.roll(px[..., :3], (dy, dx), (0, 1))
            total += c * k[..., None]
            count += k
        fill = ~known & (count > 0)
        px[fill, :3] = total[fill] / count[fill, None]
        known = known | fill
    img.pixels[:] = px.reshape(-1)
    img.name = name
    img.pack()
    return img


def material(name, image, cutout):
    """A Principled material wearing `image`; `cutout` also reads its alpha."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.9
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if cutout:
        mat.node_tree.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        mat.use_backface_culling = False
        if hasattr(mat, "blend_method"):
            mat.blend_method = "CLIP"
            mat.alpha_threshold = 0.5
    return mat


def islands_of(bm, wanted):
    """Groups of connected faces (sharing an edge) for which wanted(face) holds."""
    seen, islands = set(), []
    for f in bm.faces:
        if f.index in seen or not wanted(f):
            continue
        stack, island = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop()
            island.append(g)
            for e in g.edges:
                for n in e.link_faces:
                    if n.index not in seen and wanted(n):
                        seen.add(n.index)
                        stack.append(n)
        islands.append(island)
    return islands


def build(out_name, pack, fbx, height, keep, grow, bark_ratio, lo, images):
    cfg = PACKS[pack]
    bpy.ops.import_scene.fbx(filepath=os.path.join(cfg["src"], "FBX", fbx + ".fbx"))
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects:
        o.parent = None if o.type != "MESH" else o.parent
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    me = ob.data

    # bark is material 0, leaves 1, whatever the pack called them
    leafy = {
        i
        for i, m in enumerate(me.materials)
        if m and any(k in m.name.lower() for k in ("leaf", "leaves"))
    }
    slots = [1 if p.material_index in leafy else 0 for p in me.polygons]
    me.materials.clear()  # resets every polygon to slot 0
    bark_mat, leaf_mat = images
    me.materials.append(bark_mat)
    me.materials.append(leaf_mat)
    for p, slot in zip(me.polygons, slots):
        p.material_index = slot
    for p in me.polygons:
        p.use_smooth = True

    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    # glTF splits vertices at every UV seam; weld the bark's back together
    bmesh.ops.remove_doubles(
        bm,
        verts=list({v for f in bm.faces if f.material_index == 0 for v in f.verts}),
        dist=1e-4,
    )
    bm.faces.ensure_lookup_table()
    cards = islands_of(bm, lambda f: f.material_index == 1)
    if lo:
        drop = []
        for n, island in enumerate(cards):
            if n % keep:
                drop.extend(island)
                continue
            verts = list({v for f in island for v in f.verts})
            c = sum((v.co for v in verts), Vector()) / len(verts)
            for v in verts:
                v.co = c + (v.co - c) * grow
        bmesh.ops.delete(bm, geom=list(set(drop)), context="FACES")
    bm.to_mesh(me)
    bm.free()

    if lo:
        # decimate the bark only, through a vertex group, so leaf cards stay whole
        bark_verts = {
            v for p in me.polygons if p.material_index == 0 for v in p.vertices
        }
        if bark_verts:
            group = ob.vertex_groups.new(name="bark")
            group.add(list(bark_verts), 1.0, "REPLACE")
            mod = ob.modifiers.new("lod", "DECIMATE")
            # the ratio is of the whole mesh, the leaves (kept whole) included
            tris = [len(q.vertices) - 2 for q in me.polygons]
            leaf = sum(t for t, q in zip(tris, me.polygons) if q.material_index == 1)
            mod.ratio = (leaf + bark_ratio * (sum(tris) - leaf)) / sum(tris)
            mod.vertex_group = "bark"
            mod.vertex_group_factor = 1.0
            bpy.context.view_layer.objects.active = ob
            bpy.ops.object.modifier_apply(modifier="lod")
        me = ob.data

    # stand on z = 0 (the glTF's y), centered on the trunk's foot
    zs = [v.co.z for v in me.vertices]
    z0 = min(zs)
    foot = [v.co for v in me.vertices if v.co.z < z0 + 0.15]
    cx = sum(v.x for v in foot) / len(foot)
    cy = sum(v.y for v in foot) / len(foot)
    k = height / (max(zs) - z0) if height else 1.0
    for v in me.vertices:
        v.co = Vector((v.co.x - cx, v.co.y - cy, v.co.z - z0)) * k

    # leaf normals: away from the crown's center, leaning up
    leaf_verts = {v for p in me.polygons if p.material_index == 1 for v in p.vertices}
    bark_vs = {v for p in me.polygons if p.material_index == 0 for v in p.vertices}
    if leaf_verts:
        c = sum((me.vertices[i].co for i in leaf_verts), Vector()) / len(leaf_verts)
        normals = []
        for v in me.vertices:
            if v.index in leaf_verts and v.index not in bark_vs:
                n = (v.co - c) + Vector((0, 0, LEAN_UP * max((v.co - c).length, 0.5)))
                normals.append(n.normalized() if n.length > 1e-6 else Vector((0, 0, 1)))
            else:
                normals.append(v.normal.copy())
        me.normals_split_custom_set_from_vertices(normals)

    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    path = os.path.join(OUT, out_name + ("-lo" if lo else "") + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=False,
        export_image_format="WEBP",
    )
    print("BUILT", path, tris, "tris", len(cards), "cards")


def textures(key):
    """A pack's leaf image (bled) and bark image."""
    cfg = PACKS[key]
    leaves = bled(
        os.path.join(cfg["src"], cfg["leaves"]), key + "_leaves", cfg.get("leaf_color")
    )
    bark = bpy.data.images.load(os.path.join(cfg["src"], cfg["bark"]))
    bark.name = key + "_bark"
    bark.pack()
    return leaves, bark


ONLY = os.environ.get("ONLY", "").split()  # build just these names
for name, pack, fbx, height, far, keep, grow, ratio in MODELS:
    if ONLY and name not in ONLY:
        continue
    for lo in (False, True) if far else (False,):
        # images and materials live in the file being built, so make them anew
        bpy.ops.wm.read_factory_settings(use_empty=True)
        imgs = textures(pack)
        mats = (
            material("Bark", imgs[1], False),
            material("Leaves", imgs[0], True),
        )
        build(name, pack, fbx, height, keep, grow, ratio, lo, mats)
