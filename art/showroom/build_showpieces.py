"""The Dealership's two showpieces, built from CC-BY downloads and stripped of
every logo, badge and wordmark.

  CAR=saloon   Fishboe's "Jaguar/Daimler XJ X308 Pack" (CC-BY): the XJ Sport
               variant only. The pack's badge materials (leaper, V8, model name,
               hub caps) are reassigned to plain chrome and the JAGUAR plates in
               the "Details" texture are painted out. In-game it is the made-up
               "Aurelia Grand Saloon".
  CAR=concept  3DHaupt's "Future Car" (CC-BY): body, wheels and canopy, the
               display plate dropped. The blend carries no texture links, so
               its sci-fi greeble (Speed_Car_c_2.jpg, no text) is loaded from
               the download and the car split into show paint (clearcoated
               lilac), dark trim, rubber, tinted glass and a candy canopy
               frame. In-game it is the made-up "Comet Zero".

Each is decimated, joined to one object per material, turned so it faces +z
(glTF), centered on x and z, set on y = 0 and scaled to a showroom length.

    CAR=saloon BLEND=<X308Pack.blend> TEXTURES=<textures dir> OUT=<out .glb> \\
    blender --background --factory-startup --python art/showroom/build_showpieces.py

Then: npx -y @gltf-transform/cli@4.5.1 optimize in.glb out.glb --compress meshopt \\
      --texture-compress webp --texture-size 1024
"""

import math
import os

import bpy
import numpy as np
from mathutils import Matrix, Vector

CAR = os.environ["CAR"]
bpy.ops.wm.open_mainfile(filepath=os.environ["BLEND"])
bpy.ops.file.find_missing_files(directory=os.environ["TEXTURES"])

if CAR == "saloon":
    keep = lambda o: o.name.startswith("XJSport_")
    # decimate ratio by part: body, interior, wheels, brake calipers
    ratio = lambda o: 0.35 if o.name.endswith("Body") else 0.25 if "Interior" in o.name else 0.15 if "Wheel" in o.name else 1.0
    LENGTH = 4.9
    turn = Matrix.Identity(4)  # nose already on -y (glTF +z)
else:
    keep = lambda o: o.name in ("Cube.044", "Cube.045", "Speed_car.000", "Speed_car.007")
    ratio = lambda o: 0.12 if o.name == "Speed_car.007" else 0.06 if o.name.startswith(("Cube.044", "Speed_car.000")) else 1.0
    LENGTH = 4.6
    # texel luminance (0 to 1) under which a body face is dark trim, not paint
    LUM_TRIM = float(os.environ.get("LUM_TRIM", "0.34"))
    # the nose is on -x: a quarter turn about z puts it on -y (glTF +z)
    turn = Matrix.Rotation(math.pi / 2, 4, "Z")

for o in list(bpy.data.objects):
    if o.type != "MESH" or not keep(o):
        bpy.data.objects.remove(o, do_unlink=True)

if CAR == "saloon":
    # the JAGUAR plates in the Details texture (its lower half): painted dark
    details = bpy.data.materials["Details"]
    img = next(n.image for n in details.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
    W, H = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    px[: int(H * (1 - 0.53)), :, 0:3] = 0.05  # rows run bottom-up: the bottom 47%
    img.pixels.foreach_set(px.ravel())
    img.update()
    img.pack()

if CAR == "saloon":
    # a deep teal body in place of the pack's silver, so it reads against the
    # white showroom (set here, as the glTF optimizer would merge a plain silver
    # with the chrome)
    paint = bpy.data.materials["PaintSilver"]
    # the pack's paint is a node group: replace it with a plain glossy principled
    paint.use_nodes = True
    tree = paint.node_tree
    tree.nodes.clear()
    bsdf = tree.nodes.new("ShaderNodeBsdfPrincipled")
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (0.012, 0.22, 0.16, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.55
    bsdf.inputs["Roughness"].default_value = 0.22

parts = [o for o in bpy.data.objects if o.type == "MESH"]
for o in parts:
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

for o in parts:
    if CAR == "saloon":
        # badge materials become the object's chrome: no leaper, V8, model name or hub logo
        slots = [m.name if m else "" for m in o.material_slots]
        chrome = next((i for i, n in enumerate(slots) if n == "Chrome"), None)
        if chrome is not None:
            bad = {i for i, n in enumerate(slots) if "Badg" in n}
            for p in o.data.polygons:
                if p.material_index in bad:
                    p.material_index = chrome
    bpy.context.view_layer.objects.active = o
    tri = o.modifiers.new("tri", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)
    r = ratio(o)
    if r < 1.0:
        dec = o.modifiers.new("dec", "DECIMATE")
        dec.ratio = r
        bpy.ops.object.modifier_apply(modifier=dec.name)
    if CAR == "concept" and o.name in ("Cube.044", "Speed_car.000"):
        # tag a wheel pair's faces: after the join they are told from the body
        tag = bpy.data.materials.new("wheel-tag")
        o.data.materials.append(tag)
        for p in o.data.polygons:
            p.material_index = len(o.data.materials) - 1

bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
car = bpy.context.view_layer.objects.active


def style_concept(car):
    """Show paint, trim, rubber, glass and a candy frame in place of one flat color."""
    image = bpy.data.images.load(os.path.join(os.environ["TEXTURES"], "Speed_Car_c_2.jpg"))
    assert car.data.uv_layers.active, "the concept car has UVs"
    W, H = image.size
    tex = np.array(image.pixels[:], dtype=np.float32).reshape(H, W, 4)[..., :3].mean(axis=2)
    uv = car.data.uv_layers.active.data
    mats = car.data.materials
    names = [m.name if m else "" for m in mats]

    def make(name, color, metallic, rough, coat=0.0, textured=True, alpha=1.0, debug=(1, 1, 1)):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        t = m.node_tree
        b = next(n for n in t.nodes if n.type == "BSDF_PRINCIPLED")
        if textured:
            # the greeble stays as the base color, multiplied by the paint
            img = t.nodes.new("ShaderNodeTexImage")
            img.image = image
            mix = t.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            mix.inputs["B"].default_value = (*color, 1.0)
            t.links.new(img.outputs["Color"], mix.inputs["A"])
            t.links.new(mix.outputs["Result"], b.inputs["Base Color"])
        else:
            b.inputs["Base Color"].default_value = (*color, 1.0)
        b.inputs["Metallic"].default_value = metallic
        b.inputs["Roughness"].default_value = rough
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Alpha"].default_value = alpha
        if alpha < 1.0:
            m.blend_method = "BLEND"
        m.diffuse_color = (*debug, 1.0)
        mats.append(m)
        return len(mats) - 1

    paint = make("show-paint", (0.55, 0.40, 1.0), 0.35, 0.18, coat=1.0, debug=(0.6, 0.4, 1.0))
    trim = make("show-trim", (0.35, 0.36, 0.42), 0.8, 0.4, debug=(1.0, 0.6, 0.1))
    rubber = make("show-rubber", (0.1, 0.1, 0.11), 0.0, 0.9, textured=False, debug=(0.9, 0.1, 0.1))
    rim = make("show-rim", (0.8, 0.82, 0.9), 1.0, 0.25, textured=False, debug=(0.9, 0.9, 0.9))
    glass = make("show-glass", (0.02, 0.05, 0.1), 0.2, 0.05, textured=False, alpha=0.55, debug=(0.1, 0.4, 0.9))
    frame = make("show-frame", (0.5, 0.35, 0.95), 0.4, 0.15, coat=1.0, textured=False, debug=(0.6, 0.4, 1.0))
    skin = names.index("s_car")
    for p in car.data.polygons:
        name = names[p.material_index] if p.material_index < len(names) else ""
        if name.startswith("wheel-tag"):
            # the wheels' axle is along y: faces looking along it are the rim, the rest tyre
            p.material_index = rim if abs(p.normal.y) > 0.7 else rubber
        elif p.material_index == skin:
            u = sum(uv[l].uv[0] for l in p.loop_indices) / p.loop_total
            v = sum(uv[l].uv[1] for l in p.loop_indices) / p.loop_total
            lum = tex[min(H - 1, max(0, int(v * H))), min(W - 1, max(0, int((u % 1) * W)))]
            p.material_index = trim if lum < LUM_TRIM else paint
        elif name == "glass":
            p.material_index = glass
        elif name == "Car_lack":
            p.material_index = frame


if CAR == "concept":
    style_concept(car)
car.data.transform(turn @ car.matrix_world)
car.matrix_world.identity()
# drop material slots no face uses (the removed badges and plates)
bpy.ops.object.material_slot_remove_unused()

if os.environ.get("PREVIEW_DIR"):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x = sc.render.resolution_y = 600
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c"))
    cam.data.clip_end = 1000
    sc.collection.objects.link(cam)
    sc.camera = cam
    bb = [car.matrix_world @ Vector(c) for c in car.bound_box]
    ctr = sum(bb, Vector()) / 8
    size = max((max(p[i] for p in bb) - min(p[i] for p in bb)) for i in range(3))
    for name, d in [("q", Vector((1, -1, 0.5))), ("top", Vector((0, -0.3, 1)))]:
        cam.location = ctr + d.normalized() * size * 1.3
        cam.rotation_euler = (ctr - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(os.environ["PREVIEW_DIR"], f"{CAR}-{name}.png")
        bpy.ops.render.render(write_still=True)

pts = [Vector(c) for c in (v.co for v in car.data.vertices)]
lo = Vector((min(p[i] for p in pts) for i in range(3)))
hi = Vector((max(p[i] for p in pts) for i in range(3)))
k = LENGTH / (hi.y - lo.y)
shift = Vector(((lo.x + hi.x) / -2, (lo.y + hi.y) / -2, -lo.z))
car.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(shift))
car.name = CAR
print("TRIS", sum(len(p.vertices) - 2 for p in car.data.polygons), "MATS", [m.name for m in car.data.materials])
print("SIZE", tuple(round((hi - lo)[i] * k, 2) for i in (0, 2, 1)))
bpy.ops.export_scene.gltf(filepath=os.environ["OUT"], export_format="GLB")
