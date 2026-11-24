#!/usr/bin/env python3
"""Download the MakeHuman proxy sources selected for the Daydaze closet."""

from hashlib import file_digest
import json
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlopen
from zipfile import ZipFile

HERE = Path(__file__).resolve().parent
DESTINATION = HERE / ".cache" / "mhassets"
CHECKSUMS = {
    "hats01_cc0": "97b70d7bd90e74ee87a49faeb7c4a1b2762b311902974db575851daaae05b50e",
    "hats03_cc-by": "2702d58fa04e57235881551c45adcda36a6eafde8043c2695375bc0b4b79f550",
    "shoes01_cc0": "ded3f70428505eabbf1f6d7b5f61196a7366ef20757103d276ad0ed336c35ada",
    "shoes02_ccby": "1b544d87dd8b3d3a9c8317e4f059be456491be979cbc9984fc53f403046f5061",
    "shoes03_ccby": "7818b43a520a90bb0286aaa1e137ddb9bbe59640c3edbdf4d9d849064ec2761b",
    "underwear04_cc0": "ea033122a9e43fb145760f7c399d2c8632a281d4ece948d5685c58301aef142c",
}


def verify(path, checksum):
    with path.open("rb") as content:
        return file_digest(content, "sha256").hexdigest() == checksum


def download_verified(url, path, checksum):
    with urlopen(url, timeout=90) as source, path.open("wb") as dest:
        shutil.copyfileobj(source, dest)
    if not verify(path, checksum):
        raise ValueError(f"Unexpected checksum for {url}")


def fetch_community():
    sources = json.loads((HERE / "src" / "footwear-community.json").read_text())
    for folder, files in sources.items():
        target = DESTINATION / "clothes" / folder
        target.mkdir(parents=True, exist_ok=True)
        for name, (url, checksum) in files.items():
            dest = target / name
            if dest.is_file() and verify(dest, checksum):
                continue
            temp = dest.with_suffix(dest.suffix + ".part")
            download_verified(url, temp, checksum)
            temp.replace(dest)


def main():
    fetch_community()
    packs = json.loads((HERE / "src" / "footwear.json").read_text())
    for archive, styles in packs.items():
        if archive.endswith("-community"):
            continue
        pack, _license = archive.split("_", 1)
        folders = {entry for spec in styles.values() for entry in spec if isinstance(entry, str)}
        marker = DESTINATION / f".{archive}-wardrobe"
        names = "\n".join([CHECKSUMS[archive], *sorted(folders)])
        if marker.is_file() and marker.read_text() == names:
            continue
        with TemporaryDirectory() as temp:
            download = Path(temp) / f"{archive}.zip"
            url = f"https://files.makehumancommunity.org/asset_packs/{pack}/{archive}.zip"
            download_verified(url, download, CHECKSUMS[archive])
            with ZipFile(download) as assets:
                extracted = set()
                for info in assets.infolist():
                    path = Path(info.filename)
                    if len(path.parts) != 3 or path.parts[0] != "clothes" or path.parts[1] not in folders:
                        continue
                    if info.is_dir() or path.name in ("..", "."):
                        continue
                    target = DESTINATION / path
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with assets.open(info) as source, target.open("wb") as dest:
                        shutil.copyfileobj(source, dest)
                    if path.suffix == ".mhclo":
                        extracted.add(path.parts[1])
                if folders != extracted:
                    raise ValueError(f"Missing clothing definitions in {archive}: {sorted(folders - extracted)}")
        marker.write_text(names)


if __name__ == "__main__":
    main()
