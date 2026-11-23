#!/usr/bin/env bash
# Downloads the Sketchfab hair refit_hair.py refits (every one CC-BY 4.0,
# credited in docs/assets.md) into the git-ignored local-assets/downloads/,
# one folder per model as refit_hair.py's STYLES name them. Needs the
# Sketchfab token, so run it through the env wrapper:
#   bash scripts/with-env.sh bash art/doll/blender/fetch_hair.sh
# Models already on disk are skipped.
set -euo pipefail
OUT="${HAIR_DOWNLOADS:-$(dirname "$0")/../../../local-assets/downloads}"
: "${SKETCHFAB_API_TOKEN:?run through scripts/with-env.sh}"
# folder (refit_hair.py "src") and Sketchfab model uid
MODELS=(
  "hair-sketchfab-summer66-twintail-19984 199844b5b2d94e0fb75b0a9e11f2a7b4"
  "hair-sketchfab-greedyengine-hair-double-buns-f77fc f77fc793db8c40e09781dccd629b7f1b"
  "hair-sketchfab-marvibun-bantu-knot-hairstyle-game-read-cb069 cb0690a6891d4d528dc1a6b49702dbd3"
  "hair-sketchfab-witmerad-hijab-1-6e176 6e176f7f54e2429d939db26e90d03396"
  "hair-sketchfab-harsh4756-sikh-turban-30cdd 30cddcf08c2e4f0fbdc19eb3ced5ed75"
  "hair-sketchfab-dlm96-stylised-pixie-haircut-24737 247375418ba645a3ab98e62737a47e24"
  "hair-sketchfab-alexm777-female-hair-ponytail-bb4d9 bb4d9bb056d34391b5a9aec8210c38c7"
  "hair-sketchfab-continuumreed-curly-hair-1-beatrice-characte-89ed2 89ed2c07a0d9418d9d6b231bedf2772a"
  "hair-sketchfab-pocolov-pocolov-hair-17-605ea 605ea5ffc77845cd8b5ffd32b6ef9e77"
)
for entry in "${MODELS[@]}"; do
  read -r folder uid <<<"$entry"
  dest="$OUT/$folder/extracted"
  [ -f "$dest/scene.gltf" ] && continue
  # the download endpoint answers with a short-lived link to the glTF zip
  url="$(curl -fsSL -H "Authorization: Token $SKETCHFAB_API_TOKEN" \
    "https://api.sketchfab.com/v3/models/$uid/download" |
    python3 -I -c 'import json, sys; print(json.load(sys.stdin)["gltf"]["url"])')"
  tmp="$(mktemp -d)"
  curl -fsSL "$url" -o "$tmp/model.zip"
  mkdir -p "$dest"
  unzip -q -o "$tmp/model.zip" -d "$dest"
  rm -r "$tmp"
  echo "fetched $folder"
done
