#!/usr/bin/env bash
# Saves an editor checkout's FileFlowHQ changes as studio/patches/<repo>.patch (binary-safe, new
# files included). The shared brand component (studio/brand/ffhq_brand/, copied into the UI crate
# by build-branded-studio-app.sh) stays out of the patch: it lives only in this repo.
#
#   scripts/save-studio-patch.sh photocraft
set -euo pipefail
REPO=$1
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC=${CRAFT_SRC:-$HOME/Developer/craft-apps}/$REPO
git -C "$SRC" add -A -N .
git -C "$SRC" diff HEAD --binary -- . ":(exclude)${UI_CRATE:-crates/ui-egui}/src/ffhq_brand" > "$ROOT/studio/patches/$REPO.patch"
git -C "$SRC" reset -q
echo "Saved studio/patches/$REPO.patch ($(grep -c '^diff --git' "$ROOT/studio/patches/$REPO.patch") files)"
