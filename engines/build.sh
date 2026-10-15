#!/usr/bin/env bash
# Builds a converter engine (engines/<name>/) to WebAssembly and installs it into
# public/engines/<name>/<version>/ for the tools to load on demand.
#
#   engines/build.sh pdf
#
# Needs: rustup's wasm32-unknown-unknown target; wasm-bindgen 0.2.129 and wasm-opt (trunk's
# cache has both after any `trunk build`), and the editor sources in ~/Developer/craft-apps.
set -euo pipefail
NAME=$1
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=$ROOT/engines/$NAME
TRUNK=$HOME/Library/Caches/dev.trunkrs.trunk
BINDGEN=${WASM_BINDGEN:-$TRUNK/wasm-bindgen-0.2.129/wasm-bindgen}
OPT=${WASM_OPT:-$TRUNK/wasm-opt-version_123/bin/wasm-opt}
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

VERSION=$(grep -m1 '^version' "$DIR/Cargo.toml" | cut -d'"' -f2)
CRATE=$(grep -m1 '^name' "$DIR/Cargo.toml" | cut -d'"' -f2 | tr - _)
OUT=$ROOT/public/engines/$NAME/$VERSION

(cd "$DIR" && cargo build --release --target wasm32-unknown-unknown)
rm -rf "$OUT" && mkdir -p "$OUT"
"$BINDGEN" --target web --no-typescript --out-dir "$OUT" --out-name engine "$DIR/target/wasm32-unknown-unknown/release/$CRATE.wasm"
"$OPT" -Oz --enable-bulk-memory --enable-nontrapping-float-to-int --enable-sign-ext --enable-mutable-globals "$OUT/engine_bg.wasm" -o "$OUT/engine_bg.wasm"
ls -lh "$OUT"
echo "Installed $NAME engine v$VERSION into public/engines/$NAME/$VERSION"
