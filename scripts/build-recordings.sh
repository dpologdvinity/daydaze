#!/usr/bin/env bash
# Builds the recorded sounds in public/audio/ from Freesound previews fetched
# into $SRC (default /tmp/fs) with scripts/freesound.mjs. Each line is
# <out id> <freesound id> <kbps> <ffmpeg options>; sources and licenses are in
# docs/assets.md. Mono Opus keeps every file small.
set -euo pipefail
SRC="${SRC:-/tmp/fs}"
OUT="$(dirname "$0")/../public/audio"
mk() { # id source kbps [ffmpeg input/filter options...]
  local id="$1" src="$2" kbps="$3"; shift 3
  ffmpeg -v error -y "$@" -i "$SRC/$src.ogg" -ac 1 -c:a libopus -b:a "${kbps}k" "$OUT/$id.ogg"
}
mkf() { # id source kbps filter [ffmpeg input options...]
  local id="$1" src="$2" kbps="$3" filter="$4"; shift 4
  ffmpeg -v error -y "$@" -i "$SRC/$src.ogg" -af "$filter" -ac 1 -c:a libopus -b:a "${kbps}k" "$OUT/$id.ogg"
}
mk   step-pavement 690006 24
mkf  step-wood     405115 24 "afade=t=out:st=0.3:d=0.15" -ss 0.22 -t 0.45
mk   step-sand     778568 24
mk   car-engine    522218 24
mkf  tire-hum      785698 24 "lowpass=f=700,volume=2.5"
mkf  bus-engine    451666 24 "afade=t=in:d=0.3,afade=t=out:st=7.5:d=0.5" -ss 2 -t 8
mk   bus-door      379372 24
mkf  boardwalk     479528 32 "afade=t=in:d=0.6,afade=t=out:st=19.4:d=0.6" -t 20
mk   zebra         850661 24
mk   cow           847404 24
mkf  donkey        787564 24 "afade=t=out:st=3:d=0.5" -t 3.5
mkf  penguin       463033 24 "afade=t=out:st=3:d=0.5" -t 3.5
mk   splash        469608 32
mkf  underwater    862788 32 "afade=t=in:d=0.6,afade=t=out:st=11.4:d=0.6" -t 12
mk   fountain      676173 32
