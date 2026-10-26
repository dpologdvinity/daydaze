"""Distance twins for the nature models (scripts/import-nature.sh).

A tree's crown is hundreds of separate leaf cards, which a mesh simplifier
can't merge, so the far twin keeps one card in KEEP (picked evenly by island
order) and grows each kept card by GROW about its own centre, so the crown
still reads as full from a distance; bark and other solid parts are decimated.
Bark is many separate branch pieces that decimation can't merge, so the far
twin also keeps only the BARK_KEEP largest (the trunk and main limbs; the
leaves hide the twigs).

    blender --background --factory-startup --python art/nature/nature_lod.py -- in.gltf out.glb
"""

import os
import sys

import bmesh
import bpy
from mathutils import Vector

# the far twin by default; the near model uses KEEP=1 GROW=1 SOLID_RATIO=0.35
# BARK_KEEP=0 (every branch)
KEEP = int(os.environ.get("KEEP", 3))
GROW = float(os.environ.get("GROW", 1.45))
SOLID_RATIO = float(os.environ.get("SOLID_RATIO", 0.15))
BARK_KEEP = int(os.environ.get("BARK_KEEP", 14))
LEAFY = ("leaf", "leaves", "flower", "petal", "grass", "fern", "plant")

args = sys.argv[sys.argv.index("--") + 1 :]
src, dst = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)


def islands_of(bm, wanted):
    """Groups of connected faces (sharing an edge) for which wanted(face) holds."""
    seen = set()
    islands = []
    for f in bm.faces:
        if f.index in seen or not wanted(f):
            continue
        stack, island = [f], []
        seen.add(f.index)
        while stack:
            g = stack.pop()
            island.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen and wanted(h):
                        seen.add(h.index)
                        stack.append(h)
        islands.append(island)
    return islands


for ob in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    me = ob.data
    leafy = {
        i
        for i, m in enumerate(me.materials)
        if m and any(k in m.name.lower() for k in LEAFY)
    }
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    # islands of connected leaf faces: one card each
    # glTF splits vertices at every UV seam, which leaves the bark as loose
    # triangles to the decimator; weld them back (UVs live on the loops)
    bark_verts = list(
        {v for f in bm.faces if f.material_index not in leafy for v in f.verts}
    )
    bmesh.ops.remove_doubles(bm, verts=bark_verts, dist=1e-4)
    bm.faces.ensure_lookup_table()
    islands = islands_of(bm, lambda f: f.material_index in leafy)
    drop = []
    if BARK_KEEP:
        solid = islands_of(bm, lambda f: f.material_index not in leafy)
        solid.sort(key=len, reverse=True)
        for island in solid[BARK_KEEP:]:
            drop.extend(island)
    for n, island in enumerate(islands):
        if n % KEEP:
            drop.extend(island)
            continue
        verts = list({v for f in island for v in f.verts})
        c = sum((v.co for v in verts), Vector()) / len(verts)
        for v in verts:
            v.co = c + (v.co - c) * GROW
    bmesh.ops.delete(bm, geom=list(set(drop)), context="FACES")
    bm.to_mesh(me)
    bm.free()
    # bark and other solid parts (most of a tree's faces): decimated through
    # a vertex group, so the leaf cards are left whole
    solid = {
        v
        for p in me.polygons
        if p.material_index not in leafy
        for v in p.vertices
    }
    if solid:
        group = ob.vertex_groups.new(name="solid")
        group.add(list(solid), 1.0, "REPLACE")
        mod = ob.modifiers.new("lod", "DECIMATE")
        mod.ratio = SOLID_RATIO
        mod.vertex_group = "solid"
        mod.vertex_group_factor = 1.0
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier="lod")

bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB")
