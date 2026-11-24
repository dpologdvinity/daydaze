"""Fit downloaded footwear, legwear and hats to both Daydaze rigs."""

import json
from pathlib import Path

import numpy as np
from mathutils.kdtree import KDTree

import proxies

SOURCES = Path(__file__).parent / "src" / "footwear.json"
OPEN = {"flip-flops", "gladiator-sandals", "slingback-heels"}


def closed(name):
    return name not in OPEN


def tuck_foot(ctx, coords):
    """Move the part below the ankle toward the foot's lengthwise axis."""
    bones = ctx.rig.data.bones
    move = np.zeros_like(coords)
    for side, selected in (("Left", coords[:, 0] > 0), ("Right", coords[:, 0] <= 0)):
        ankle = np.array(bones[f"mixamorig:{side}Foot"].head_local)
        toe = np.array(bones[f"mixamorig:{side}ToeBase"].head_local)
        points = coords[selected]
        axis = toe - ankle
        along = np.clip((points - ankle) @ axis / (axis @ axis), 0.12, 1.0)
        center = ankle + along[:, None] * axis
        fade = np.clip((ankle[2] - points[:, 2]) / 0.05, 0, 1)
        move[selected] = (center - points) * (0.8 * fade[:, None])
    return move



def build(ctx, male, skin):
    """Keep source colors and record the depth of each sole below the floor."""
    packs = json.loads(SOURCES.read_text())
    for pack, styles in packs.items():
        kind = "Hat" if pack.startswith("hats") else "Legwear" if pack.startswith("underwear") else "Shoes"
        for name, spec in styles.items():
            sources = [entry for entry in spec if isinstance(entry, str)]
            ratio = next((entry for entry in spec if isinstance(entry, float)), 1.0)
            source = sources[-1] if male else sources[0]
            folder = Path(proxies.ASSETS) / "clothes" / source
            definition, = folder.glob("*.mhclo")
            material, = folder.glob("*.mhmat")
            texture = next(
                line.split(maxsplit=1)[1]
                for line in material.read_text().splitlines()
                if line.startswith("diffuseTexture ")
            ).strip()
            image = proxies.detail_texture(
                str((folder / texture).relative_to(proxies.ASSETS)), 512, keep_colour=kind == "Shoes"
            )
            pose = folder / "heels.target"
            delta = ctx.foot_pose(pose) if pose.is_file() else None
            sheer = name == "sheer-tights"
            obj = proxies.build(
                ctx,
                f"{kind}_{name}",
                str(definition.relative_to(proxies.ASSETS)),
                proxies.textured(f"{kind.lower()}_{name}", image),
                ratio=ratio,
                snug=0.15 if delta is not None else (0.045 if kind == "Shoes" or sheer else 0.0),
                fit_delta=delta,
                skin=skin if sheer else None,
            )
            if kind == "Shoes":
                obj["lift"] = max(0, -min(v.co.z for v in obj.data.vertices))
            yield obj, None if delta is None else ctx.to_blender(delta, offset=False)


def garment_pose(ctx, delta):
    """Carry the skin pose to socks and hems near the foot."""
    src = sorted({i for face in ctx.FACES["body"] for i in face})
    tree = KDTree(len(src))
    for i in src:
        tree.insert(ctx.PB[i], i)
    tree.balance()
    active = ctx.PB[src][np.any(delta[src], axis=1)]
    high = active[:, 2].max()
    reach = 0.045

    def move(coords):
        posed = coords.copy()
        for i in np.flatnonzero(coords[:, 2] <= high + reach):
            near = tree.find_n(coords[i], 3)
            weights = np.array([1 / max(dist, 1e-4) for _, _, dist in near])
            local = np.average(delta[[j for _, j, _ in near]], axis=0, weights=weights)
            posed[i] += local * max(0, 1 - near[0][2] / reach)
        return posed

    return move
