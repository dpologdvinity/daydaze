#!/bin/bash
# keepboth.sh <files...>: resolve additive conflicts by keeping both sides (ours then theirs)
for f in "$@"; do sed -i -E '/^(<<<<<<< |=======$|>>>>>>> )/d' "$f"; done
