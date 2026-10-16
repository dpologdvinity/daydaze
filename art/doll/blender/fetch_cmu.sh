#!/usr/bin/env bash
# Downloads the CMU Graphics Lab Motion Capture takes mocap.py retargets.
# CMU: "The motion capture data may be copied, modified, or redistributed
# without permission." BVH conversions from github.com/una-dinosauria/cmu-mocap.
set -euo pipefail
OUT="$(dirname "$0")/.cache/cmu"
mkdir -p "$OUT"
for c in 07_01 07_04 07_12 08_07 55_02 60_01 61_01 05_02; do
  [ -s "$OUT/$c.bvh" ] && continue
  s=$(printf "%03d" $((10#${c%_*})))
  curl -fsSL "https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/$s/$c.bvh" -o "$OUT/$c.bvh"
done
echo "CMU takes in $OUT"
