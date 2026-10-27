"""Downloads the sea-life and reef models (Poly Pizza, CC0 or CC-BY 3.0) that
Seaside Swim and the reef dive use into art/ocean/.cache/glb/.

    python3 art/ocean/fetch_ocean.py

Each model's page names its GLB (the page's preview id plus .glb). Licenses and
authors are recorded in docs/assets.md and src/game/credits.ts; this script
prints what each page reports so a change of terms shows up on a re-run.
"""

import os
import re
import urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache", "glb")

# poly.pizza model id -> file name (author, license)
MODELS = {
    "74GL45Fvdh": "coral-set1",  # MiniPoly, CC0
    "HdrPoAyuCJ": "coral-set2",  # MiniPoly, CC-BY 3.0
    "UyswwdHFiL": "coral-set3",
    "1mE2eYsGFD": "coral-set4",
    "AKpeJtOxNO": "coral-set5",
    "hOBkCGKjlo": "coral-set6",
    "Q2GNw9TRzF": "grouper",  # Quaternius, CC0
    "4qia78IBmZ": "shipwreck",  # Kenney, CC0
    "ejWQny9Gcz": "anchor",  # Quaternius, CC0
    "oYxUdpyc4u": "seaweed",  # Mohabins, CC0
    "1O5Q4pE8X6e": "crab",  # Poly by Google, CC-BY 3.0
    "fklSEvGm1Q8": "turtle",  # Poly by Google, CC-BY 3.0
    "0WRzrtCIIRp": "seagull",  # Poly by Google, CC-BY 3.0
    "6Tpj_vcWP3f": "seagull-fly",  # Poly by Google, CC-BY 3.0
    "54jZKTAt5p": "rock-large",  # Quaternius, CC0
    "d2VWOdthtR": "rock-large2",  # Quaternius, CC0
    "s1OJ3bBzqc": "rock-medium",  # Quaternius, CC0
    "a52gSEEq8X": "rock-mountains",  # Quaternius, CC0
    "4KUXdtDdgHR": "fan-coral",  # Poly by Google, CC-BY 3.0
    "1FMGb52XdD-": "anemone",  # Poly by Google, CC-BY 3.0
    "dA5osnS0Rzj": "jellyfish",  # Poly by Google, CC-BY 3.0
}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "daydaze-asset-fetch"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for pid, name in MODELS.items():
        page = get(f"https://poly.pizza/m/{pid}").decode("utf-8", "replace").replace("\\u002F", "/")
        glb = re.search(r"https://static\.poly\.pizza/([0-9a-f-]{36})\.glb(?!\.)", page)
        lic = re.search(r'"Licence":"([^"]+)"', page)
        if not glb:
            raise SystemExit(f"{name}: no GLB on https://poly.pizza/m/{pid}")
        with open(os.path.join(OUT, name + ".glb"), "wb") as f:
            f.write(get(glb.group(0)))
        print(name, lic.group(1) if lic else "license not found")


if __name__ == "__main__":
    main()
