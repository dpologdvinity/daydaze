# Skin detail

`fetch_skin.py` downloads the MakeHuman skins01 CC0 pack and extracts bobby_03's
Young Female Hairless texture into `.cache/skin-detail-source.png`. Its SHA256 is
checked before use. The source is a bare face without painted eyebrows, so the
player can select their own brows and makeup.

```sh
python3 art/doll/blender/fetch_skin.py
blender --background --factory-startup --python-exit-code 1 --python art/doll/blender/build_doll.py
DOLL_SEX=male blender --background --factory-startup --python-exit-code 1 --python art/doll/blender/build_doll.py
bash scripts/optimize-doll.sh
```

`skin_detail.py` reprojects the original MakeHuman UVs onto the existing face
atlas, keeping the nearest surface per texel so hidden eye-socket faces
never paint the visible lids (`test_skin_detail.py` checks this in Blender).
It normalizes the source complexion around neutral gray, preserving
relative pigmentation and pores, and fades the projection boundary. The client
uses a soft-light composite underneath its optional makeup, retaining selectable
skin tones and the existing single skin material. Both bodies need their own
atlas because their geometry and face projections differ.

The bake also writes `doll-skin-surface[-m].png`: red contains a small height
variation extracted from fine source texture detail; green contains a roughness
mask with slightly more shine around the nose and cheeks. This is an approximate
surface treatment derived from the CC0 color source, not a scanned height map.
The client loads it as non-color data and shares it between all avatars of that
body. It adds no draw calls and does not bake makeup into the skin.

`SKIN_ONLY=1` refreshes the face masks and skin-detail atlases without exporting
geometry or fitted parts. Run it once for each `DOLL_SEX` after bake-only changes.

`OUTFIT_ONLY=1` skips rebuilding hair while retaining the body and its clothing
occlusion shape keys. Use `ONLY='body($|-)' bash scripts/optimize-doll.sh` when
only the bodies changed. A full hair rebuild additionally needs the existing
Universal Base Characters source pack at the location in `doll_hair.py`.
`OUTFIT_PARTS='puffer|corset'` (with `OUTFIT_ONLY=1`) builds just the shoes and
the garments whose names match, in about a minute: look at the raw files in
`.cache/out`, but never ship that body, which holds only their tuck keys.
A garment-only change is checked in Blender with `test_outfits.py`.

Sources and license: https://static.makehumancommunity.org/assets/assetpacks/skins01.html
(CC0 1.0). Credits are mirrored in `docs/assets.md` and `src/game/credits.ts`.
