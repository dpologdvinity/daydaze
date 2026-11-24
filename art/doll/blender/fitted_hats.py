"""Fit downloaded non-proxy hats to the Daydaze doll's head bone."""

from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix

import proxies

ROOT = Path(proxies.ASSETS) / "wardrobe-props"
HATS = {
    "beret": ("beret.fbx", ["beret.png"], 0.90, 0.020),
    "sun-hat": ("sun-hat.fbx", ["straw.png", "ribbon.jpg"], 0.92, 0.032),
    "cowboy-hat": ("cowboy-hat.glb", [], 0.95, 0.042),
}


def build(ctx):
    """Align each crown with the top of the scalp and bind it to the head."""
    src = sorted({index for face in ctx.FACES["body"] for index in face})
    skin = ctx.PB[src]
    top = skin[:, 2].max()
    crown = skin[skin[:, 2] > top - 0.07]
    center = (crown.max(axis=0) + crown.min(axis=0)) / 2
    head_scale = np.ptp(crown[:, 0]) / 0.153

    for name, (filename, textures, size, clearance) in HATS.items():
        existing = set(bpy.data.objects)
        path = str(ROOT / filename)
        if filename.endswith(".fbx"):
            bpy.ops.import_scene.fbx(filepath=path, use_image_search=False)
        else:
            bpy.ops.import_scene.gltf(filepath=path)
        imported = set(bpy.data.objects) - existing
        obj, = [obj for obj in imported if obj.type == "MESH"]
        obj.data.transform(obj.matrix_world)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        for other in imported - {obj}:
            bpy.data.objects.remove(other, do_unlink=True)
        obj.name = obj.data.name = f"Hat_{name}"

        points = np.array([v.co[:] for v in obj.data.vertices])
        lower, upper = points[:, 2].min(), points[:, 2].max()
        cap = points[points[:, 2] > lower + 0.72 * (upper - lower)]
        origin = np.r_[(cap.min(axis=0) + cap.max(axis=0))[:2] / 2, upper]
        fitted = (points - origin) * size * head_scale + np.r_[center[:2], top + clearance]
        obj.data.vertices.foreach_set("co", fitted.ravel())

        if textures:
            slots = [face.material_index for face in obj.data.polygons]
            obj.data.materials.clear()
            for i, tex in enumerate(textures):
                image = proxies.detail_texture(str((ROOT / tex).relative_to(proxies.ASSETS)), 512)
                obj.data.materials.append(proxies.textured(f"hat_{name}_{i}", image))
            for face, slot in zip(obj.data.polygons, slots, strict=True):
                face.material_index = slot
        else:
            material, = obj.data.materials
            surface = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
            link, = surface.inputs["Base Color"].links
            image = link.from_node.image
            image.scale(512, 512)
            obj.data.materials[0] = proxies.textured(f"hat_{name}", image)

        head = obj.vertex_groups.new(name=ctx.HEAD)
        head.add(list(range(len(points))), 1.0, "REPLACE")
        yield obj
