#!/usr/bin/env python3
"""Build and optimize 3D assets for the Daytona/NASCAR Speedway oval:
- Converts Quaternius Realistic Car Pack models (FBX) to glTF with stock-car UV mapping
- Prepares low-poly instanced spectator crowd and pit crew models
- Copies and optimizes Kenney Racing Kit models (grandstands, barriers, pit garages, flagstand)
Usage:
  blender --background --factory-startup --python art/speedway/build_speedway_assets.py
"""

import math
import os
import bpy
import bmesh
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
TMP_DIR = "/tmp/daydaze-speedway-build"
OUT_DIR = os.path.join(ROOT, "public/models/speedway")
KENNEY_RACING = "/tmp/daydaze-city/kenney/racing-kit/Models/GLTF format"
KENNEY_CHAR = "/tmp/daydaze-city/kenney/mini-characters/Models/GLB format"
QUATERNIUS_CARS = "/tmp/daydaze-city/q/Realistic_Car_Pack__Nov_2018/Realistic Car Pack - Nov 2018/FBX"

os.makedirs(TMP_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)


def process_stock_car(name: str, out_name: str):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    fbx_path = os.path.join(QUATERNIUS_CARS, f"{name}.fbx")
    if not os.path.exists(fbx_path):
        print(f"Skipping {name}: {fbx_path} not found")
        return

    bpy.ops.import_scene.fbx(filepath=fbx_path)

    # Join all mesh children into single object
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if not meshes:
        return
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    car = bpy.context.active_object
    car.name = out_name

    # Rotate 180 around Z so +Y in Blender (headlights) faces -Y, which glTF exports as +Z forward
    car.rotation_euler.z = math.pi
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    # Scale up slightly by 1.25x to match stock car proportions (approx 5.0m length)
    car.scale = Vector((1.25, 1.25, 1.25))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Calculate bounding box
    bbox = [car.matrix_world @ Vector(b) for b in car.bound_box]
    min_x = min(v.x for v in bbox)
    max_x = max(v.x for v in bbox)
    min_y = min(v.y for v in bbox)
    max_y = max(v.y for v in bbox)
    min_z = min(v.z for v in bbox)

    # Center on ground plane (Z bottom = 0, X center = 0, Y center = 0)
    car.location.x -= (min_x + max_x) / 2
    car.location.y -= (min_y + max_y) / 2
    car.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    # Recompute bounds after centering
    bbox = [Vector(b) for b in car.bound_box]
    min_x = min(v.x for v in bbox)
    max_x = max(v.x for v in bbox)
    min_y = min(v.y for v in bbox)
    max_y = max(v.y for v in bbox)
    min_z = min(v.z for v in bbox)
    max_z = max(v.z for v in bbox)

    # Project UV coordinates for stock car decals
    bm = bmesh.new()
    bm.from_mesh(car.data)
    uv_layer = (
        bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    )

    for face in bm.faces:
        normal = face.normal
        for loop in face.loops:
            v = loop.vert.co
            if normal.z > 0.35:
                # Top view (roof, hood, trunk): Upper UV (U: 0.05..0.95, V: 0.52..0.98)
                # Headlights are at min_y (-Y), rear is at max_y (+Y)
                u = 0.5 + (v.x / (max_x - min_x + 1e-5)) * 0.9
                v_coord = 0.52 + ((max_y - v.y) / (max_y - min_y + 1e-5)) * 0.45
                loop[uv_layer].uv = Vector((u, v_coord))
            elif abs(normal.x) > 0.3:
                # Side doors: U: 0.05..0.45 (left door), 0.55..0.95 (right door), V: 0.05..0.48
                fwd_share = (max_y - v.y) / (max_y - min_y + 1e-5)
                v_coord = 0.05 + ((v.z - min_z) / (max_z - min_z + 1e-5)) * 0.42
                if normal.x > 0:
                    # Left door (Blender +X)
                    u = 0.05 + fwd_share * 0.4
                else:
                    # Right door (Blender -X)
                    u = 0.55 + fwd_share * 0.4
                loop[uv_layer].uv = Vector((u, v_coord))
            else:
                # Bumpers / grills
                u = 0.5 + (v.x / (max_x - min_x + 1e-5)) * 0.4
                v_coord = 0.5
                loop[uv_layer].uv = Vector((u, v_coord))

    bm.to_mesh(car.data)
    bm.free()

    tmp_glb = os.path.join(TMP_DIR, f"{out_name}.glb")
    bpy.ops.export_scene.gltf(filepath=tmp_glb, export_format="GLB")
    print(f"Exported {tmp_glb}")


def process_character(in_glb: str, out_name: str, decimate_ratio=0.25):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not os.path.exists(in_glb):
        print(f"Skipping {in_glb}")
        return

    bpy.ops.import_scene.gltf(filepath=in_glb)
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if not meshes:
        return
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    char = bpy.context.active_object
    char.name = out_name

    # Decimate to ultra-low poly for massive instancing
    mod = char.modifiers.new(name="Decimate", type="DECIMATE")
    mod.ratio = decimate_ratio
    bpy.ops.object.modifier_apply(modifier="Decimate")

    # Center on feet
    bbox = [char.matrix_world @ Vector(b) for b in char.bound_box]
    min_z = min(v.z for v in bbox)
    char.location.z -= min_z
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    tmp_glb = os.path.join(TMP_DIR, f"{out_name}.glb")
    bpy.ops.export_scene.gltf(filepath=tmp_glb, export_format="GLB")
    print(f"Exported {tmp_glb}")


# 1. Process 4 stock cars
process_stock_car("SportsCar", "stock-car-1")
process_stock_car("SportsCar2", "stock-car-2")
process_stock_car("NormalCar1", "stock-car-3")
process_stock_car("NormalCar2", "stock-car-4")

# 2. Process Spectator and Pit Crew figures
process_character(
    os.path.join(KENNEY_CHAR, "character-male-a.glb"), "spectator", 0.2
)
process_character(
    os.path.join(KENNEY_CHAR, "character-male-b.glb"), "pit-crew", 0.3
)
