"""Makes the garden crop GLBs opaque.

The Nature Crops FBX files import into Blender with a base color alpha of 0, so
the optimized GLBs in public/models/garden/*-[1-4].glb draw nothing. This sets
every material's base color alpha to 1 by rewriting only the GLB's JSON chunk
(the meshopt buffers are untouched). Run it after scripts/import-garden.sh:
    python3 -I scripts/fix-garden-crop-alpha.py
"""
import glob
import json
import struct

for f in sorted(glob.glob("public/models/garden/*-[1-4].glb")):
    d = open(f, "rb").read()
    jl = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20 : 20 + jl])
    rest = d[20 + jl :]
    changed = False
    for m in j.get("materials", []):
        p = m.setdefault("pbrMetallicRoughness", {})
        bc = p.get("baseColorFactor", [1, 1, 1, 1])
        if bc[3] != 1 or m.get("alphaMode") not in (None, "OPAQUE"):
            p["baseColorFactor"] = bc[:3] + [1.0]
            m.pop("alphaMode", None)
            changed = True
    if not changed:
        continue
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    out = d[:12] + struct.pack("<I", len(js)) + b"JSON" + js + rest
    out = out[:8] + struct.pack("<I", len(out)) + out[12:]
    open(f, "wb").write(out)
    print("fixed", f)
