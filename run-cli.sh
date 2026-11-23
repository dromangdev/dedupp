#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
if [ ! -f "$DIR/target/debug/dedupp" ]; then
    echo "Compilando Dedupp CLI..."
    cargo build -p dedupp-cli
fi
"$DIR/target/debug/dedupp" "$@"
