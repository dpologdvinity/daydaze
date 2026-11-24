"""Convert the owner's garden downloads to compact runtime glTF files.

Run from the worktree with `python art/city/pack_garden_assets.py`.
The source downloads are never modified. Requires glTF Transform 4.5.1.
"""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[2]
COMMON = Path(subprocess.check_output(
    ["git", "rev-parse", "--git-common-dir"], cwd=ROOT, text=True
).strip())
SOURCE = (ROOT / COMMON).resolve().parent / "local-assets/downloads/game/curated-world/gardens/sketchfab"
DEST = ROOT / "public/models/garden"
MODELS = {
    "pergola_ivy_arch": ("ivy-arch", "CC-BY-4.0"),
    "rose_arch": ("rose-arch", "CC-BY-4.0"),
    "village_window_box": ("flower-box", "CC0-1.0"),
    "hanging_planter": ("hanging-planter", "CC-BY-4.0"),
    "wisteria_flowers": ("wisteria", "CC-BY-4.0"),
}


def main():
    cli = shutil.which("gltf-transform")
    if not cli or subprocess.check_output([cli, "--version"], text=True).strip() != "4.5.1":
        raise RuntimeError("Install @gltf-transform/cli 4.5.1 before running")
    DEST.mkdir(parents=True, exist_ok=True)
    receipt = ROOT / "art/city/sources/garden-provenance.zip"
    with ZipFile(receipt, "w", ZIP_DEFLATED) as archive:
        for source, (_, license_id) in MODELS.items():
            original = SOURCE / source
            license_file = original / "license.txt"
            if license_id not in license_file.read_text():
                raise ValueError(f"Unexpected license for {source}")
            archive.write(license_file, f"{source}/license.txt")
            hashes = {
                str(path.relative_to(original)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted(original.rglob("*")) if path.is_file()
            }
            archive.writestr(f"{source}/sha256.json", json.dumps(hashes, indent=2) + "\n")
    with tempfile.TemporaryDirectory(prefix="daydaze-garden-") as tmp:
        for source, (name, license_id) in MODELS.items():
            if os.environ.get("GARDEN_ONLY") not in (None, source):
                continue
            original = SOURCE / source
            if license_id not in (original / "license.txt").read_text():
                raise ValueError(f"Unexpected license for {source}")
            work = Path(tmp) / source
            shutil.copytree(original, work)
            scene = work / "scene.gltf"
            document = json.loads(scene.read_text())
            # Ivy uses cutout foliage, so depth sorting cannot hide the arch.
            if source == "pergola_ivy_arch":
                for material in document.get("materials", []):
                    if material.get("alphaMode") == "BLEND":
                        material["alphaMode"] = "MASK"
                        material["alphaCutoff"] = 0.5
            scene.write_text(json.dumps(document))
            centered = work / "centered.glb"
            subprocess.run([
                "nice", "-n", "19", cli,
                "center", str(scene), str(centered), "--pivot",
                "above" if source in ("hanging_planter", "wisteria_flowers") else "below",
            ], cwd=ROOT, check=True)
            subprocess.run([
                "nice", "-n", "19", cli,
                "optimize", str(centered), str(DEST / f"{name}.glb"),
                "--compress", "meshopt", "--simplify", "false",
                "--texture-compress", "webp", "--texture-size", "512",
                "--flatten", "false", "--palette", "false", "--join", "false",
            ], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
