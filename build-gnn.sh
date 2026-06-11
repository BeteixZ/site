#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GNN_DIR="$SCRIPT_DIR/src/assets/gnn-article"
cd "$GNN_DIR"
rm -rf node_modules
env -i HOME="$HOME" PATH="$PATH" npm install --install-strategy=nested
npx svelte-kit sync
npx vite build
