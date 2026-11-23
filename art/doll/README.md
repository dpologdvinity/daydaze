# art/doll/

Everything that makes the Daydaze doll, the game's avatar. The shipped 3D doll is built headlessly from MakeHuman's CC0 base by the scripts in `blender/`; the PNG folders here are the older 2D layered doll art. See the [art index](../README.md) for how asset scripts are run in general.

## 3D doll pipeline

All steps run from the repo root. `blender/` writes raw GLBs into the git-ignored `blender/.cache/out/`; the optimize step compresses them into `public/models/doll/`.

1. `bash art/doll/blender/fetch_makehuman.sh` downloads the pinned MakeHuman base mesh and morph targets. `python3 art/doll/blender/fetch_skin.py` fetches the CC0 skin texture (see [`blender/SKIN.md`](blender/SKIN.md)).
2. `blender --background --factory-startup --python-exit-code 1 --python art/doll/blender/build_doll.py` builds the body, rig (Mixamo's 52-bone skeleton), hair, outfits and shoes. Add `DOLL_SEX=male` for the `-m` files. Some hairstyles come from Quaternius's CC0 [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) pack, which `blender/doll_hair.py` reads from `/tmp/ubc/`, and others from rendysix's CC-BY Hair Pack parts 1-3 (Sketchfab, linked in `docs/assets.md`), which `blender/pack_hair.py` reads from `/tmp/hair/` (`hair-pack-part-1/source/HairPackPT1.glb`, and the same for parts 2 and 3; set `HAIR_PACKS` to use another folder). Download and unpack all four packs there first.
3. `art/doll/blender/mocap.py` bakes Mixamo and Universal Animation Library clips onto the doll's skeleton and writes the clip catalog `src/game/dance/mocap.ts` (and `mocapSources.ts`). Run it again with `DOLL_SEX=male` for the male clip files (`anims*-m.glb`); that run opens `blender/.cache/rig-m.blend`, so do the `DOLL_SEX=male` run of step 2 first. Mixamo FBX files live in the git-ignored `mixamo/` at the repo root.
4. `bash scripts/optimize-doll.sh` compresses everything into `public/models/doll/`, with a simplified `-lo` twin of each worn part.

## Folders

| Folder or file | What it holds |
| --- | --- |
| `blender/` | The 3D build: scripts below. |
| `bases/` | Eight 2D skin-tone base images (`base-porcelain` to `base-midnight`). |
| `modular/` | 2D layer art: brows, lips, hair, jewelry and outfit images, each also as a `full-*` variant. |
| `reference/` | Full-avatar and brow-and-lip combo reference images of the 2D look. |
| `traits/` | 2D trait images and sheets; see its [README](traits/README.md). |
| `compositor.html` | Standalone browser page that stacks the 2D layers (`bases/`, `modular/`, `traits/transparent/`) on `template-doll-golden.png`. |
| `template-doll-golden.png` | The golden 2D base doll that the other layers register to. |

No code under `src/` loads the 2D folders; they feed `compositor.html` and the [2D lounge prototype](../../prototypes/2d-lounge/README.md).

## Scripts in `blender/`

| Script | Role |
| --- | --- |
| `build_doll.py` | Main build: body, rig, face UV projection, shape keys. |
| `proxies.py` | Fits MakeHuman `.mhclo` hair and clothes to the shaped body. |
| `doll_outfits.py` | Garments, swimsuits and shoes, with tuck shape keys. |
| `doll_hair.py`, `strands.py`, `pack_hair.py` | Hair styles: strand cards, sculpted styles, and refits from downloaded hair packs. |
| `skin_detail.py`, `fetch_skin.py` | Bake CC0 skin detail into the face atlas. |
| `prosthesis.py`, `wheelchair.py` | Fit the downloaded prosthetic leg and wheelchair to the doll. |
| `mocap.py`, `mocap_clips.py` | Bake clips onto the rig; `mocap_clips.py` is the clip tables. |
| `thumbs.py` | Renders the character creator's picture tiles into `public/closet/`. |
| `preview.py`, `anim_strip.py`, `source_strip.py`, `walk_strip.py`, `walk_check.py` | Dev-only renders and gait checks. |
| `skin_check.py`, `test_outfits.py`, `test_skin_detail.py` | Dev-only self-checks, run in Blender. |
| `src/` | Downloaded source model (`hijab-sketchfab.glb`). |

## Subfolders

- [`blender/SKIN.md`](blender/SKIN.md): skin detail notes.
- [`blender/src/`](blender/src/README.md): downloaded source models.
- [`traits/`](traits/README.md): 2D trait images.

## Notes

- Set Blender shape keys to `value = 0` before export.
- Dev-only helpers read the raw build in `blender/.cache/out`, not `public/`.
- Credit every downloaded source (hijab, prosthesis, wheelchair, hair packs, Mixamo) in `docs/assets.md` and `src/game/credits.ts`.
