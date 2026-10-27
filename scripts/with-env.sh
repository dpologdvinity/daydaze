#!/usr/bin/env bash
# Runs one command with the API keys from the repo's git-ignored .env loaded
# into its environment, so asset scripts (Sketchfab, Poly Pizza, Freesound,
# ElevenLabs) can use them without anyone reading or printing the file.
#   bash scripts/with-env.sh node scripts/gen-sounds.mjs
set -euo pipefail
ENV_FILE="$(cd "$(dirname "$0")/.." && git rev-parse --path-format=absolute --git-common-dir)/../.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "with-env: no .env at the repo root" >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a
exec "$@"
