#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
if [ ! -f "$DIR/target/debug/dedupp-gui" ]; then
    echo "Compilando Dedupp Desktop GUI..."
    cargo build -p dedupp-gui
fi
"$DIR/target/debug/dedupp-gui" "$@"
