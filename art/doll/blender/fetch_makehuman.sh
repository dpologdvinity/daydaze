#!/usr/bin/env bash
# Downloads the MakeHuman base mesh and the morph targets build_doll.py uses.
# MakeHuman's assets are CC0 1.0 (see LICENSE.ASSETS.md in their repo); the
# commit is pinned so the export is reproducible.
set -euo pipefail
SHA=a8bc2d54ff0ac92e78ff71431b1023eda42bf482
BASE="https://raw.githubusercontent.com/makehumancommunity/makehuman/$SHA/makehuman/data"
OUT="$(dirname "$0")/.cache/mh"
T=targets
FILES=(
  3dobjs/base.obj
  rigs/default.mhskel
  rigs/default_weights.mhw
  $T/macrodetails/universal-female-young-averagemuscle-averageweight.target
  $T/macrodetails/universal-female-young-averagemuscle-maxweight.target
  $T/macrodetails/universal-female-young-averagemuscle-minweight.target
  $T/macrodetails/universal-female-young-maxmuscle-averageweight.target
  $T/macrodetails/african-female-young.target
  $T/macrodetails/asian-female-young.target
  $T/macrodetails/caucasian-female-young.target
  $T/macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions.target
  $T/macrodetails/height/female-young-averagemuscle-averageweight-maxheight.target
  $T/breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target
  $T/breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target
  $T/bodyshapes/bodyshapes-elvs-fem-full-hourglass.target
  $T/bodyshapes/bodyshapes-elvs-fem-neat-hourglass.target
  $T/bodyshapes/bodyshapes-elvs-fem-triangle.target
  $T/bodyshapes/bodyshapes-elvs-fem-lean-column.target
  $T/hip/hip-scale-horiz-incr.target
  $T/hip/hip-waist-up.target
  $T/buttocks/buttocks-volume-incr.target
  $T/stomach/stomach-tone-incr.target
  $T/eyes/l-eye-scale-incr.target
  $T/eyes/r-eye-scale-incr.target
  $T/eyes/l-eye-corner1-up.target
  $T/eyes/r-eye-corner1-up.target
  $T/eyes/l-eye-corner2-up.target
  $T/eyes/r-eye-corner2-up.target
  $T/eyes/l-eye-height2-incr.target
  $T/eyes/r-eye-height2-incr.target
  $T/eyes/l-eye-bag-decr.target
  $T/eyes/r-eye-bag-decr.target
  $T/nose/nose-scale-horiz-incr.target
  $T/nose/nose-volume-decr.target
  $T/nose/nose-point-width-decr.target
  $T/nose/nose-point-up.target
  $T/mouth/mouth-upperlip-volume-incr.target
  $T/mouth/mouth-lowerlip-volume-incr.target
  $T/mouth/mouth-cupidsbow-incr.target
  $T/mouth/mouth-scale-horiz-decr.target
  $T/cheek/l-cheek-bones-incr.target
  $T/cheek/r-cheek-bones-incr.target
  $T/cheek/l-cheek-volume-decr.target
  $T/cheek/r-cheek-volume-decr.target
  $T/chin/chin-width-incr.target
  $T/chin/chin-width-decr.target
  $T/chin/chin-prominent-decr.target
  $T/chin/chin-bones-incr.target
  $T/head/head-oval.target
  $T/head/head-scale-horiz-decr.target
  $T/eyebrows/eyebrows-trans-up.target
  $T/nose/nose-scale-horiz-decr.target
  $T/nose/nose-width1-decr.target
  $T/nose/nose-trans-up.target
  $T/eyes/l-eye-trans-up.target
  $T/eyes/r-eye-trans-up.target
  $T/forehead/forehead-scale-vert-decr.target
  $T/chin/chin-height-decr.target
  $T/head/head-fat-decr.target
  $T/neck/neck-scale-horiz-decr.target
  $T/nose/nose-scale-horiz-decr.target
  $T/nose/nose-scale-vert-decr.target
  $T/nose/nose-scale-depth-decr.target
  $T/nose/nose-nostrils-width-decr.target
  $T/nose/nose-width1-decr.target
  $T/nose/nose-width2-decr.target
  $T/chin/chin-width-decr.target
  $T/chin/chin-height-decr.target
  $T/chin/chin-triangle.target
  $T/head/head-invertedtriangular.target
  $T/head/head-age-decr.target
  $T/cheek/l-cheek-volume-decr.target
  $T/cheek/r-cheek-volume-decr.target
  $T/cheek/l-cheek-inner-decr.target
  $T/cheek/r-cheek-inner-decr.target
  $T/mouth/mouth-upperlip-ext-up.target
  $T/mouth/mouth-lowerlip-height-incr.target
  $T/mouth/mouth-angles-up.target
  $T/eyes/l-eye-height1-incr.target
  $T/eyes/r-eye-height1-incr.target
  $T/eyes/l-eye-eyefold-up.target
  $T/eyes/r-eye-eyefold-up.target
  $T/expression/units/caucasian/eye-left-closure.target
  $T/expression/units/caucasian/eye-right-closure.target
  $T/expression/units/caucasian/mouth-corner-puller.target
  $T/expression/units/caucasian/eyebrows-left-up.target
  $T/expression/units/caucasian/eyebrows-right-up.target
  $T/expression/units/caucasian/eyebrows-left-down.target
  $T/expression/units/caucasian/eyebrows-right-down.target
)
for f in "${FILES[@]}"; do
  [ -s "$OUT/$f" ] && continue
  mkdir -p "$OUT/$(dirname "$f")"
  curl -fsSL "$BASE/$f" -o "$OUT/$f"
done
echo "MakeHuman assets in $OUT"

# Hair, clothes and shoe proxies from MakeHuman's CC0 system asset pack
# (280 MB zip; only the folders proxies.py uses are kept).
PACK="$(dirname "$0")/.cache/mhassets"
if [ ! -d "$PACK/hair/long01" ]; then
  tmp="$(mktemp -d)"
  curl -fsSL https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip -o "$tmp/cc0.zip"
  unzip -q -o "$tmp/cc0.zip" '*hair/afro01/*' '*hair/bob01/*' '*hair/braid01/*' \
    '*hair/long01/*' '*hair/ponytail01/*' '*clothes/shoes06/*' \
    '*clothes/female_sportsuit01/*' -d "$PACK"
  rm -r "$tmp"
fi
echo "MakeHuman proxies in $PACK"
