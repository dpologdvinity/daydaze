"""Renders src/braid-strip.png: the texture on every knotless braid (#396).

    blender --background --factory-startup --python-exit-code 1 --python art/doll/blender/braid_strip.py

A real three-strand plait, not a painted one: a bundle of hair curves goes
through Blender's own `Braid Hair Curves` node group (procedural hair assets,
CC0 with Blender), then a pinch of `Frizz Hair Curves` for flyaways. Cycles
renders it straight on, orthographic and lit by a grey sky and a soft light from
above, so the image holds the plait's own shading: strands, a sheen on each
lobe and the shadow where one lock crosses another. The render is cropped to whole
plait periods so it tiles along the braid, turned grey and saved with the
braid's silhouette in its alpha. hair_built.py wraps it round each braid.
"""

import math
import os

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "src", "braid-strip.png")
ASSETS = os.path.join(bpy.utils.system_resource("DATAFILES"), "assets", "nodes", "procedural_hair_node_assets.blend")
# the strip: pixels across (3.2 braid radii), and plait periods down; it
# keeps the render's aspect, so a braid's texture repeats every
# width * height / WIDTH along it (hair_built.py reads the size back)
WIDTH, PERIODS = 128, 2
# hairs in the bundle, points per hair, bundle length (braid radii)
HAIRS, POINTS, LENGTH = 900, 320, 30.0


def node_groups(*names):
    with bpy.data.libraries.load(ASSETS) as (src, dst):
        dst.node_groups = list(names)
    return {n: bpy.data.node_groups[n] for n in names}


def set_inputs(mod, **values):
    """Sets a node-group modifier's inputs by their interface names."""
    ids = {
        it.name: it.identifier
        for it in mod.node_group.interface.items_tree
        if it.item_type == "SOCKET" and it.in_out == "INPUT"
    }
    for name, value in values.items():
        getattr(mod.properties.inputs, ids[name.replace("_", " ")]).value = value


def bundle():
    """Straight hairs up +Z from a disk one braid radius wide."""
    rng = np.random.default_rng(7)
    hc = bpy.data.hair_curves.new("bundle")
    hc.add_curves([POINTS] * HAIRS)
    r = np.sqrt(rng.random(HAIRS)) * 0.95
    a = rng.random(HAIRS) * 2 * np.pi
    roots = np.stack([np.cos(a) * r, np.sin(a) * r, np.zeros(HAIRS)], 1)
    # the first hair is the guide the braid winds round: the bundle's centre
    roots[0] = 0
    pos = np.repeat(roots, POINTS, 0)
    pos[:, 2] = np.tile(np.linspace(0, LENGTH, POINTS), HAIRS)
    hc.position_data.foreach_set("vector", pos.astype(np.float32).ravel())
    radius = hc.attributes.get("radius") or hc.attributes.new("radius", "FLOAT", "POINT")
    radius.data.foreach_set("value", np.full(HAIRS * POINTS, 0.022, np.float32))
    ob = bpy.data.objects.new("bundle", hc)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    groups = node_groups("Braid Hair Curves", "Frizz Hair Curves")
    ob = bundle()
    braid = ob.modifiers.new("braid", "NODES")
    braid.node_group = groups["Braid Hair Curves"]
    # one braid (a guide distance wider than the bundle), braided from the
    # very root; flat shapes keep its radius and its locks' thickness the
    # same all the way down, which is what reads as a neat three-strand
    # plait (the defaults taper it into a twisted rope)
    set_inputs(
        braid,
        Radius=1.0,
        Frequency=1.0,
        Braid_Start=0.0,
        Shape=0.0,
        Thickness_Shape=0.0,
        Subdivision=1,
        Guide_Distance=100.0,
    )
    frizz = ob.modifiers.new("frizz", "NODES")
    frizz.node_group = groups["Frizz Hair Curves"]
    set_inputs(frizz, Cumulative_Offset=False, Distance=0.025, Shape=0.0, Seed=3)

    mat = bpy.data.materials.new("hair")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
    bsdf.inputs["Roughness"].default_value = 0.55
    ob.data.materials.append(mat)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 64
    scene.render.film_transparent = True
    # the plait's lobes reach about 1.3 radii out: the strip is 3.2 wide
    span = 3.2
    rows = int(WIDTH * LENGTH / span)
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = rows
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = LENGTH
    cam.location = (0, -10, LENGTH / 2)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    scene.camera = cam
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.7, 0.7, 0.7, 1)
    scene.world = world
    # a soft light from above and in front: each lobe catches it on top and
    # shades under the one that crosses it, the way a plait reads in a room
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 2.0
    sun.data.angle = math.radians(30)
    sun.rotation_euler = (math.radians(35), 0, 0)
    scene.collection.objects.link(sun)
    tmp = os.path.join(bpy.app.tempdir, "braid-render.png")
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)

    img = bpy.data.images.load(tmp)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    # the plait's period: the spacing of the lobes down its left side (the
    # leftmost solid column of each row, smoothed, dips once a lobe)
    solid = px[:, :, 3] > 0.5
    left = np.where(solid.any(1), solid.argmax(1), w).astype(float)
    left = np.convolve(left, np.ones(9) / 9, "same")
    rows = np.arange(h // 8, h - h // 8)
    dips = [r for r in rows if left[r] == left[r - 12 : r + 13].min() and left[r] < np.median(left)]
    # merge flat-bottomed dips into one per lobe
    lobes = [d for i, d in enumerate(dips) if i == 0 or d - dips[i - 1] > 6]
    period = (lobes[-1] - lobes[0]) / (len(lobes) - 1)
    span = int(round(PERIODS * period))
    start = h // 2 - span // 2
    crop = px[start : start + span]
    out = bpy.data.images.new("strip", WIDTH, len(crop), alpha=True)
    alpha = crop[:, :, 3]
    lum = crop[:, :, :3] @ np.array([0.3, 0.59, 0.11], np.float32)
    # the grey centres on 0.85, as every hair texture's does
    # (proxies.detail_texture), so the tint reads at its true color
    solid = alpha > 0.5
    g = np.clip(lum * (0.85 / max(lum[solid].mean(), 1e-3)), 0, 1)
    rgba = np.dstack([g, g, g, alpha])
    out.pixels.foreach_set(rgba.astype(np.float32).ravel())
    out.filepath_raw = OUT
    out.file_format = "PNG"
    out.save()
    print(f"braid period {period:.2f} rows from {len(lobes)} lobes; wrote", OUT)


main()
