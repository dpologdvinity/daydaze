#!/usr/bin/env bash
# Compresses the Meshy models in art/meshy/raw/<group>/<name>.glb into
# public/models/meshy/<group>/<name>.glb: meshopt geometry and WebP textures,
# 512 px for table-top props (food, mangos), 1024 px for everything else.
# Re-run after downloading new raws; ONLY='<regex>' limits it to matching names.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
for src in "$ROOT"/art/meshy/raw/*/*.glb; do
  group="$(basename "$(dirname "$src")")"
  name="$(basename "$src" .glb)"
  if [ -n "${ONLY:-}" ] && ! echo "$name" | grep -Eq "^($ONLY)$"; then continue; fi
  out="$ROOT/public/models/meshy/$group/$name.glb"
  size=1024
  case "$group" in food | mango) size=512 ;; esac
  mkdir -p "$(dirname "$out")"
  npx -y @gltf-transform/cli@4.5.1 optimize "$src" "$out" \
    --compress meshopt --texture-compress webp --texture-size "$size" >/dev/null
  echo "$group/$name $(du -k "$out" | cut -f1) KB"
done
