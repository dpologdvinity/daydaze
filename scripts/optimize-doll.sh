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
# ONLY="hair-locs*" rebuilds just the parts that match (default: every part)
for src in "$IN"/*.glb; do
  name="$(basename "$src" .glb)"
  # ONLY='hair-(buzz|edges)' rebuilds just the parts whose names match
  if [ -n "${ONLY:-}" ] && ! echo "$name" | grep -Eq "^($ONLY)"; then continue; fi
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
  node --experimental-strip-types "$(dirname "$0")/pruneMorphs.ts" "$src" "$f" $flag
  near_opts=("${OPTS[@]}")
  npx -y @gltf-transform/cli@4.5.1 optimize "$f" "$OUT/$name.glb" "${near_opts[@]}"
  # worn parts get a low-poly twin for far-off dolls: the same vertices'
  # attributes (skin weights, shape keys) on about a fifth of the triangles
  case "$name" in
    hair-* | outfit-* | shoes-* | swim-*)
      # hair cards only reach a fifth of their triangles at a looser error
      err=0.02
      [ -n "$flag" ] && err=0.1
      npx -y @gltf-transform/cli@4.5.1 simplify "$f" "$LO/$name.glb" --ratio 0.2 --error "$err"
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
rm -rf "$LO"
ls -la "$OUT"
