#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pillow==12.2.0"]
# ///
"""Pack MakeHuman's CC0 fishnet textile into a full-length tights mask."""

from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

from PIL import Image

SOURCE = "https://files.makehumancommunity.org/sites/default/files/clothes/1340/103687227/stockings_fishnet_medium.png"
SHA256 = "3d4f03e7aaab7f679dfe08b6ea6317648aa2d9edb37ed885bf1a4370822a2579"
OUT = Path(__file__).resolve().parents[3] / "public" / "models" / "doll" / "fishnet-mask.webp"


def main():
    with urlopen(SOURCE, timeout=90) as response:
        source = response.read()
    if sha256(source).hexdigest() != SHA256:
        raise ValueError("Unexpected checksum for the source fishnet textile")
    with Image.open(BytesIO(source)) as image:
        # The center band contains plain netting, clear of the cuffs and toes.
        mask = image.getchannel("A")
        mask.crop((0, mask.height // 4, mask.width, 3 * mask.height // 4)).resize(
            (720, 720), Image.Resampling.LANCZOS
        ).save(OUT, lossless=True)


if __name__ == "__main__":
    main()
