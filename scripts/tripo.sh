#!/bin/sh
# Tripo CLI (text/image to 3D), scoped to this repo: its API key and config
# live in .tripo-home/ (git-ignored) instead of ~/.tripo, and it runs on demand
# through npx rather than as a global install or a package.json dependency.
# Usage: scripts/tripo.sh <command> (for example: whoami, make, balance).
TRIPO_HOME="$(cd "$(dirname "$0")/.." && pwd)/.tripo-home" exec npx -y tripo-cli@0.7.3 "$@"
