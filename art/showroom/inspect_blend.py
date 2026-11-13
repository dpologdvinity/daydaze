"""Lists the meshes of a .blend (BLEND): name, triangles, materials, world size."""
import os
import bpy
from mathutils import Vector

bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
total = 0
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    if o.type != "MESH":
        continue
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    total += tris
    d = o.dimensions
    print("OBJ", o.name, o.parent.name if o.parent else "-", tris, [m.name for m in o.data.materials if m], tuple(round(c, 2) for c in d), "hide" if o.hide_viewport or o.hide_render else "")
print("TOTAL", total, "collections", [c.name for c in bpy.data.collections])
