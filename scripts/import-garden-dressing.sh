#!/usr/bin/env bash
# Downloads the community garden's dressing props from Poly Pizza (all CC0 1.0):
# picket fence, bench, shovel and hand rake, and hedge, then optimizes them into
# public/models/garden/. Needs POLYPIZZA_API_KEY: run it as
#   bash scripts/with-env.sh bash scripts/import-garden-dressing.sh
set -euo pipefail
OUT="$(dirname "$0")/../public/models/garden"
TMP="$(mktemp -d)"
mkdir -p "$OUT"
# name:poly.pizza id
for pair in picket:U7g0Wxpt63 bench:jLxjFxFRpw shovel:oNBQSf87ZJ rake:svzOLCZ74s hedge:df8uCl1YpK; do
  name="${pair%%:*}"; id="${pair##*:}"
  url="$(curl -s -H "x-auth-token: $POLYPIZZA_API_KEY" "https://api.poly.pizza/v1.1/model/$id" |
    python3 -I -c 'import json,sys;print(json.load(sys.stdin)["Download"])')"
  curl -sL "$url" -o "$TMP/$name.glb"
  npx -y @gltf-transform/cli@4.5.1 optimize "$TMP/$name.glb" "$OUT/$name.glb" \
    --compress meshopt --texture-compress webp --texture-size 256 \
    --flatten false --palette false --prune-attributes false > /dev/null
done
rm -r "$TMP"
ls -lh "$OUT"
