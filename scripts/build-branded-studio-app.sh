#!/usr/bin/env bash
# Builds a rebranded Studio editor from source and installs it into studio-builds/<id>/.
#
#   scripts/build-branded-studio-app.sh <id> <repo> <tag>
#   e.g. scripts/build-branded-studio-app.sh pdf-editor pdfcraft v0.7.1
#
# Expects the upstream source at ~/Developer/craft-apps/<repo> (override with CRAFT_SRC).
# Checks out <tag>, applies studio/patches/<repo>.patch, adds the shared brand component
# (studio/brand/ffhq_brand/ into the UI crate, UI_CRATE=crates/ui-egui by default), builds the web app with trunk,
# and copies the result (index.html renamed to app.html, plus the upstream LICENSE/NOTICE
# files the licenses require us to keep) into studio-builds/<id>/.
#
# CJK/Arabic/Thai fonts come from studio/craft-fonts/ (in this repo; override with CRAFT_FONTS_DIR).
#
# Needs: rustup (wasm32-unknown-unknown target) and trunk (`brew install trunk`); FilmCraft
# needs the wasm-bindgen CLI instead (see its docs/web.md).
set -euo pipefail

ID=$1 REPO=$2 TAG=$3
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC=${CRAFT_SRC:-$HOME/Developer/craft-apps}/$REPO
PATCH=$ROOT/studio/patches/$REPO.patch
OUT=$ROOT/studio-builds/$ID

[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
[ -d "$SRC" ] || git clone -q "https://github.com/storytold/$REPO.git" "$SRC"

git -C "$SRC" fetch -q --depth 1 origin tag "$TAG"
# The source checkout is a scratch copy: discard local edits, the patch is the record.
git -C "$SRC" reset -q --hard
# The patch adds files (fonts, logo); drop untracked leftovers so it applies cleanly (ignored build output stays).
git -C "$SRC" clean -fdq
git -C "$SRC" checkout -q -B fileflowhq "$TAG"
git -C "$SRC" apply "$PATCH"
# The shared FileFlowHQ brand component (studio/brand/ffhq_brand/), kept out of the patches.
cp -R "$ROOT/studio/brand/ffhq_brand" "$SRC/${UI_CRATE:-crates/ui-egui}/src/"

rm -rf "$OUT" && mkdir -p "$OUT"
if [ -d "$SRC/xtask" ] && [ -d "$SRC/apps/$REPO-web/web" ]; then
  # Editors with their own web build (FilmCraft: `cargo xtask web`, needs the wasm-bindgen CLI
  # at the crate's exact version) instead of trunk.
  (cd "$SRC" && cargo xtask web)
  cp -R "$SRC/target/web/dist/." "$OUT/"
else
  (cd "$SRC/apps/$REPO-web" && CRAFT_FONTS_DIR=${CRAFT_FONTS_DIR:-$ROOT/studio/craft-fonts} trunk build --release)
  cp -R "$SRC/dist/web/." "$OUT/"
fi
mv "$OUT/index.html" "$OUT/app.html"
cp "$SRC"/LICENSE-* "$OUT/"
[ -f "$SRC/NOTICE" ] && cp "$SRC/NOTICE" "$OUT/"
# Fonts embedded in the app (Poppins, Inter, …) are OFL: their licenses ship with it.
cp "$SRC"/assets/fonts/OFL-*.txt "$OUT/" 2>/dev/null || true
echo "Installed $ID ($REPO $TAG + patch) into studio-builds/$ID"
