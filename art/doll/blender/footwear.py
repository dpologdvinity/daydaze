"""Fit downloaded footwear, legwear and hats to both Daydaze rigs."""

import json
from pathlib import Path

import proxies

SOURCES = Path(__file__).parent / "src" / "footwear.json"


def build(ctx, male):
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
            obj = proxies.build(
                ctx,
                f"{kind}_{name}",
                str(definition.relative_to(proxies.ASSETS)),
                proxies.textured(f"{kind.lower()}_{name}", image),
                ratio=ratio,
            )
            if kind == "Shoes":
                obj["lift"] = max(0, -min(v.co.z for v in obj.data.vertices))
            yield obj
