"""Renders src/braid-strips.png and src/braid-strips.json: the textures every
braid variant in hair_built.py shares (#396), side by side in one atlas.

    blender --background --factory-startup --python-exit-code 1 --python art/doll/blender/braid_strip.py

Needs Blender 5.2 or newer (it sets node-group modifier inputs through
`modifier.properties.inputs`, new in 5.2); the committed atlas needs nothing.

Three locks of real hair, not painted ones. Each is a bundle of hair curves
shaped by Blender's own procedural hair node groups (CC0, shipped with
Blender), with a pinch of `Frizz Hair Curves` for flyaways:

- plait: `Braid Hair Curves` with flat shape curves, a neat three-strand
  plait (knotless and box braids);
- twist: `Braid Hair Curves` at its default shape, which winds the locks
  into a two-strand rope (twists);
- curl: a thin bundle through `Curl Hair Curves`, a springy curl (the loose
  curls of goddess braids).

Cycles renders each straight on, orthographic, lit by a grey sky and a soft
light from above, so the image holds the lock's own shading: strands, a
sheen on each lobe and the shadow where one lock crosses another. Each is
cropped to whole periods so it tiles down its column, resampled to the
atlas height and turned grey (its silhouette in the alpha). The JSON
records each column's u range and the aspect (height over width) it had
before resampling: along a ribbon `w` metres wide the texture repeats every
`w * aspect`.
"""

import json
import math
import os

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "src", "braid-strips.png")
ASSETS = os.path.join(bpy.utils.system_resource("DATAFILES"), "assets", "nodes", "procedural_hair_node_assets.blend")
# each column: pixels across (SPAN lock radii) and down, in the atlas
WIDTH, HEIGHT, SPAN = 128, 256, 3.2
# hairs in a bundle, points per hair, bundle length (lock radii)
HAIRS, POINTS, LENGTH = 900, 320, 30.0
# name -> (node group, its inputs, bundle radius, frizz); radii are the
# plait's
STRIPS = {
    "plait": (
        "Braid Hair Curves",
        # flat shapes keep the radius and each lock's thickness the same all
        # the way down: a neat plait (the defaults taper it into a rope)
        dict(Radius=1.0, Frequency=1.0, Braid_Start=0.0, Shape=0.0, Thickness_Shape=0.0, Guide_Distance=100.0),
        0.95,
        0.025,
    ),
    "twist": (
        "Braid Hair Curves",
        dict(Radius=1.0, Frequency=1.0, Braid_Start=0.0, Factor_Min=1.0, Factor_Max=1.0, Guide_Distance=100.0),
        0.95,
        0.025,
    ),
    "curl": (
        "Curl Hair Curves",
        # a thin, frizzier lock wound wide: a loose spiral curl
        dict(Radius=0.7, Frequency=0.2, Curl_Start=0.0, Guide_Distance=100.0),
        0.4,
        0.06,
    ),
}


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


def bundle(radius):
    """Straight hairs up +Z from a disk `radius` lock radii wide."""
    rng = np.random.default_rng(7)
    hc = bpy.data.hair_curves.new("bundle")
    hc.add_curves([POINTS] * HAIRS)
    r = np.sqrt(rng.random(HAIRS)) * radius
    a = rng.random(HAIRS) * 2 * np.pi
    roots = np.stack([np.cos(a) * r, np.sin(a) * r, np.zeros(HAIRS)], 1)
    # the first hair is the guide the lock winds round: the bundle's centre
    roots[0] = 0
    pos = np.repeat(roots, POINTS, 0)
    pos[:, 2] = np.tile(np.linspace(0, LENGTH, POINTS), HAIRS)
    hc.position_data.foreach_set("vector", pos.astype(np.float32).ravel())
    attr = hc.attributes.get("radius") or hc.attributes.new("radius", "FLOAT", "POINT")
    attr.data.foreach_set("value", np.full(HAIRS * POINTS, 0.022, np.float32))
    ob = bpy.data.objects.new("bundle", hc)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def render(group, inputs, radius, fuzz):
    """One lock rendered straight on: (rows, WIDTH, 4) pixels, bottom row first."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    groups = node_groups(group, "Frizz Hair Curves")
    ob = bundle(radius)
    shape = ob.modifiers.new("shape", "NODES")
    shape.node_group = groups[group]
    set_inputs(shape, Subdivision=1, **inputs)
    frizz = ob.modifiers.new("frizz", "NODES")
    frizz.node_group = groups["Frizz Hair Curves"]
    set_inputs(frizz, Cumulative_Offset=False, Distance=fuzz, Shape=0.0, Seed=3)

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
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = int(WIDTH * LENGTH / SPAN)
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
    tmp = os.path.join(bpy.app.tempdir, "strip-render.png")
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(tmp)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    return px.reshape(h, w, 4)


def period(px):
    """Rows per period: the spacing of the lobes down the lock's left side
    (the leftmost solid column of each row, smoothed, dips once a lobe)."""
    h, w = px.shape[:2]
    solid = px[:, :, 3] > 0.5
    left = np.where(solid.any(1), solid.argmax(1), w).astype(float)
    left = np.convolve(left, np.ones(9) / 9, "same")
    rows = np.arange(h // 8, h - h // 8)
    dips = [r for r in rows if left[r] == left[r - 12 : r + 13].min() and left[r] < np.median(left)]
    # merge flat-bottomed dips into one per lobe
    lobes = [d for i, d in enumerate(dips) if i == 0 or d - dips[i - 1] > 6]
    return (lobes[-1] - lobes[0]) / (len(lobes) - 1)


def main():
    atlas = np.zeros((HEIGHT, WIDTH * len(STRIPS), 4), np.float32)
    meta = {}
    for k, (name, (group, inputs, radius, fuzz)) in enumerate(STRIPS.items()):
        px = render(group, inputs, radius, fuzz)
        p = period(px)
        # as many whole periods as come closest to a square tile
        n = max(1, round(WIDTH / p))
        span = int(round(n * p))
        start = len(px) // 2 - span // 2
        crop = px[start : start + span]
        rows = (np.arange(HEIGHT) * span / HEIGHT).astype(int)
        crop = crop[rows]
        alpha = crop[:, :, 3]
        lum = crop[:, :, :3] @ np.array([0.3, 0.59, 0.11], np.float32)
        # the grey centres on 0.85, as every hair texture's does
        # (proxies.detail_texture), so the tint reads at its true color
        g = np.clip(lum * (0.85 / max(lum[alpha > 0.5].mean(), 1e-3)), 0, 1)
        atlas[:, k * WIDTH : (k + 1) * WIDTH] = np.dstack([g, g, g, alpha])
        meta[name] = {"u": [k / len(STRIPS), (k + 1) / len(STRIPS)], "aspect": span / WIDTH}
        print(f"{name}: period {p:.1f} rows, {n} per tile")
    out = bpy.data.images.new("strips", atlas.shape[1], HEIGHT, alpha=True)
    out.pixels.foreach_set(atlas.ravel())
    out.filepath_raw = OUT
    out.file_format = "PNG"
    out.save()
    with open(OUT.replace(".png", ".json"), "w") as f:
        json.dump(meta, f, indent=2)
        f.write("\n")
    print("wrote", OUT)


main()
