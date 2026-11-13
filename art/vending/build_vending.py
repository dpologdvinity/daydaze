"""The vending machine: MadeByYeshe's CC-BY "90s Retro Vending Machine" (334
triangles), turned so its glass front faces +z, scaled to 1.85 m tall, feet on
the ground at the origin. The two-triangle glass pane is dropped (the stock
shows through; the shader would only add a draw call).

The source's texture is a photo: brown woodgrain and chip bags with real-looking
labels. It is repainted here, on the same UV layout: the body becomes pure white
(the client multiplies those near-white texels by a candy color per machine,
vendingLook.ts) and the stock window becomes rows of cans and bottles in the
three made-up soda brands' colors (game/vending.ts DRINKS), with a matching
emission map so the front glows at night.

    SRC=<vending .glb> OUT=<out .glb> \\
    blender --background --factory-startup --python art/vending/build_vending.py

Then: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt \\
      --texture-compress webp --texture-size 1024
"""

import math
import os

import bpy
import numpy as np
from mathutils import Matrix, Vector

SRC = os.environ["SRC"]
OUT = os.environ["OUT"]
HEIGHT = 1.85

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

for o in [o for o in bpy.data.objects if o.type == "MESH" and any(m.name == "Generic_Glass" for m in o.data.materials)]:
    bpy.data.objects.remove(o)


# --- repaint the atlas (coordinates are in the source's 1024 px layout, y down)
mat = bpy.data.materials["Vending_Machine"]
principled = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
base = principled.inputs["Base Color"].links[0].from_node.image
W, H = base.size
px = np.array(base.pixels[:], dtype=np.float32).reshape(H, W, 4)
k = W / 1024.0


def rows(y0, y1):
    """Image rows for a y-down span in the 1024 layout (pixel rows run bottom-up)."""
    return slice(int(H - y1 * k), int(H - y0 * k))


def cols(x0, x1):
    return slice(int(x0 * k), int(x1 * k))


# the brown woodgrain body: pure white, so the client's tint is the paint
r, g, b = px[..., 0], px[..., 1], px[..., 2]
wood = (r < 0.7) & (r > b + 0.02) & (r >= g)
px[wood, 0:3] = 1.0

NAVY = np.array([0.05, 0.06, 0.11], dtype=np.float32)
# the four narrow strips beside the window show its sides: plain dark
px[rows(110, 352), cols(574, 828), 0:3] = NAVY

# can palettes: body, label stripe, per brand (peach, berry, mango)
BRANDS = [
    ((1.00, 0.52, 0.38), (0.98, 0.84, 0.72)),
    ((0.62, 0.30, 0.95), (1.00, 0.42, 0.76)),
    ((1.00, 0.78, 0.14), (0.16, 0.78, 0.70)),
]
WIN = (577, 361, 761, 590)
emit = np.zeros((H, W, 4), dtype=np.float32)
emit[..., 3] = 1.0
px[rows(WIN[1], WIN[3]), cols(WIN[0], WIN[2]), 0:3] = NAVY
emit[rows(WIN[1], WIN[3]), cols(WIN[0], WIN[2]), 0:3] = (0.16, 0.18, 0.28)


def paint(y0, y1, x0, x1, rgb, glow=1.0):
    px[rows(y0, y1), cols(x0, x1), 0:3] = rgb
    emit[rows(y0, y1), cols(x0, x1), 0:3] = np.array(rgb) * glow


SHELF = 46
for row in range(5):
    top = WIN[1] + 4 + row * SHELF
    bottle_row = row == 0
    x = WIN[0] + 6
    n = 0
    while x + 12 < WIN[2] - 4:
        body, stripe = BRANDS[(n + row) % 3]
        if bottle_row:
            # a tall bottle: body, a cap in the stripe color, a stripe label
            paint(top + 6, top + 38, x, x + 10, body)
            paint(top + 2, top + 8, x + 3, x + 7, stripe)
            paint(top + 18, top + 26, x, x + 10, stripe, 0.8)
            x += 14
        else:
            paint(top + 8, top + 38, x, x + 12, body)
            paint(top + 5, top + 9, x + 1, x + 11, (0.78, 0.80, 0.84), 0.7)
            paint(top + 18, top + 26, x, x + 12, stripe, 0.8)
            x += 15
        n += 1
    # the shelf's lip
    paint(top + 39, top + 43, WIN[0] + 2, WIN[2] - 2, (0.45, 0.47, 0.52), 0.3)

base.pixels.foreach_set(px.ravel())
base.update()
base.file_format = "PNG"
base.pack()
glow = bpy.data.images.new("vending-glow", W, H)
glow.pixels.foreach_set(emit.ravel())
glow.update()
glow.pack()
glow.colorspace_settings.name = "sRGB"
nodes, links = mat.node_tree.nodes, mat.node_tree.links
tex = nodes.new("ShaderNodeTexImage")
tex.image = glow
links.new(tex.outputs["Color"], principled.inputs["Emission Color"])
principled.inputs["Emission Strength"].default_value = 1.0
# glossy candy plastic, not the source's metal-rough map
# (and none of its other maps: the specular tint alone was 230 KB)
for socket in principled.inputs:
    if socket.name not in ("Base Color", "Emission Color"):
        for lk in list(socket.links):
            links.remove(lk)
principled.inputs["Metallic"].default_value = 0.0
principled.inputs["Roughness"].default_value = 0.28

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
# the source's front faces Blender +x; glTF +z is Blender -y
turn = Matrix.Rotation(-math.pi / 2, 4, "Z")
pts = [turn @ o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p[i] for p in pts) for i in range(3)))
hi = Vector((max(p[i] for p in pts) for i in range(3)))
k = HEIGHT / (hi.z - lo.z)
# center on x and y, feet on z = 0, scaled
fix = Matrix.Scale(k, 4) @ Matrix.Translation(Vector(((lo.x + hi.x) / -2, (lo.y + hi.y) / -2, -lo.z))) @ turn
for o in meshes:
    o.parent = None
    o.data.transform(fix @ o.matrix_world)
    o.matrix_world.identity()
for o in [o for o in bpy.data.objects if o.type != "MESH"]:
    bpy.data.objects.remove(o)
print("TRIS", sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons))
print("SIZE", tuple(round((hi - lo)[i] * k, 3) for i in range(3)))
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB")
