# art/doll/blender/src/

Source files for the doll's wearable parts.

| File | What it is |
| --- | --- |
| `braid-strips.png`, `braid-strips.json` | The braid, twist and curl strips `../braid_strip.py` renders from Blender's own hair node groups, shared by every style in `../hair_built.py`. |

`footwear.json` selects the downloadable MakeHuman shoe, sock and hat proxies,
with separate masculine source meshes and simplification ratios where needed.
`footwear-community.json` pins individual files from the MakeHuman asset index.
`../fetch_makehuman.sh` downloads the source files and checks their hashes.
`uv run --script art/doll/blender/pack_fishnet.py` rebuilds the tights mask.

## Notes

- Part of the [doll pipeline](../../README.md).
