#!/usr/bin/env bash
# Compresses the doll parts Blender wrote to art/doll/blender/.cache/out into
# public/models/doll/ (meshopt geometry, WebP textures), plus a simplified
# -lo twin of every worn part for dolls past the LOD distance. Simplify stays off:
# it would tear the shape keys the sliders and tucks rely on. Flatten and
# palette stay off so node extras and material names survive, and UVs stay
# on the untextured skin and eyes, which the client paints at runtime.
# Each part first loses the shape keys that don't move it (pruneMorphs.ts):
# optimize would otherwise store them as arrays of zeros.
set -euo pipefail
IN="$(dirname "$0")/../art/doll/blender/.cache/out"
OUT="$(dirname "$0")/../public/models/doll"
mkdir -p "$OUT"
OPTS=(--compress meshopt --texture-compress webp --texture-size 1024
  --simplify false --join false --instance false --flatten false --palette false --prune-attributes false)
LO="$(mktemp -d)"
trap 'rm -rf "$LO"' EXIT

shopt -s nullglob
files=("$IN"/*.glb)
if [ ${#files[@]} -eq 0 ]; then
  echo "Error: No .glb files found in $IN. Did the Blender build fail?" >&2
  exit 1
fi

if [ -z "${ONLY:-}" ] && [ -z "${HAIR_ONLY:-}" ] && [ -z "${OUTFIT_ONLY:-}" ]; then
  if [ ! -f "$IN/body.glb" ] && [ ! -f "$IN/body-m.glb" ]; then
    echo "Error: Incomplete doll build: neither body.glb nor body-m.glb found in $IN." >&2
    exit 1
  fi
fi

matched=0
# ONLY="hair-locs*" rebuilds just the parts that match (default: every part)
for src in "${files[@]}"; do
  name="$(basename "$src" .glb)"
  # ONLY='hair-(buzz|edges)' rebuilds just the parts whose names match
  if [ -n "${ONLY:-}" ] && ! echo "$name" | grep -Eq "^($ONLY)"; then continue; fi
  matched=$((matched + 1))
  f="$LO/$name-pruned.glb"
  # the baked clips (art/doll/blender/mocap.py; anims.glb and one anims-<pack>
  # file per pack, each with a -m twin for the man): no meshes to prune; keys
  # that a straight line through their neighbors meets within ~0.2 degrees
  # go, then meshopt packs the rest
  if [[ "$name" == anims || "$name" == anims-* ]]; then
    npx -y @gltf-transform/cli@4.5.1 resample "$src" "$f" --tolerance 0.003
    npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$name.glb" "${OPTS[@]}" --meshopt-level high
    continue
  fi
  # hair also loses face-feature keys and target normals (pruneMorphs.ts)
  flag=""
  case "$name" in hair-*) flag="--hair" ;; esac
  # a hand-made far model (hair_built.py's "@lo" parts) is handled with its
  # near model, below, so selecting the near one alone (ONLY='hair-x$')
  # still rebuilds it
  if [[ "$name" == hair-*-lo ]]; then continue; fi
  node --experimental-strip-types "$(dirname "$0")/pruneMorphs.ts" "$src" "$f" $flag
  near_opts=("${OPTS[@]}")
  npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$name.glb" "${near_opts[@]}"
  # worn parts get a low-poly twin for far-off dolls: the same vertices'
  # attributes (skin weights, shape keys) on about a fifth of the triangles
  # (or the hand-made one that came with it: pruned like the automatic
  # ones, no head-shape keys and a 128 px atlas, never simplified)
  if [ -f "$IN/$name-lo.glb" ]; then
    if [[ "$name" == hair-* ]]; then
      node --experimental-strip-types "$(dirname "$0")/pruneMorphs.ts" "$IN/$name-lo.glb" "$LO/$name-lo-pruned.glb" --hair
      node --experimental-strip-types "$(dirname "$0")/pruneMorphs.ts" "$LO/$name-lo-pruned.glb" "$LO/$name-lo-bare.glb" --bare
      npx -y @gltf-transform/cli@4.5.1 optimize "$LO/$name-lo-bare.glb" "$OUT/$name-lo.glb" "${OPTS[@]}" --texture-size 128
    fi
    continue
  fi
  case "$name" in
    hair-* | top-* | bottom-* | dress-* | outer-* | legwear-* | shoes-* | swim-*)
      # hair cards only reach a fifth of their triangles at a looser error
      err=0.02
      [ -n "$flag" ] && err=0.1
      # clothes keep their hems and openings where they are: a simplified
      # hem that creeps up shows skin the body's tuck left bare (a blouse
      # over jeans) and notches a skirt's edge
      lock=(--lock-border true)
      [ -n "$flag" ] && lock=()
      npx -y @gltf-transform/cli@4.5.1 simplify "$f" "$LO/$name.glb" --ratio 0.2 --error "$err" "${lock[@]}"
      lo_opts=("${OPTS[@]}")
      # far hair: no head-shape keys, a 128 px atlas
      if [ -n "$flag" ]; then
        node --experimental-strip-types "$(dirname "$0")/pruneMorphs.ts" "$LO/$name.glb" "$LO/$name-bare.glb" --bare
        mv "$LO/$name-bare.glb" "$LO/$name.glb"
        lo_opts+=(--texture-size 128)
      fi
      npx -y @gltf-transform/cli@4.5.1 optimize "$LO/$name.glb" "$OUT/$name-lo.glb" "${lo_opts[@]}"
      ;;
  esac
done

if [ "$matched" -eq 0 ]; then
  echo "Error: No .glb files in $IN matched ONLY=${ONLY:-}." >&2
  exit 1
fi

ls -la "$OUT"
