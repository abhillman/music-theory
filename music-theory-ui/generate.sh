#!/bin/bash
set -euo pipefail

PROTO_DIR="../services/proto"
OUT_DIR="./src/gen"

mkdir -p "$OUT_DIR"

# You need protoc and protoc-gen-grpc-web installed:
#   brew install protobuf
#   brew install protoc-gen-grpc-web
# OR download from https://github.com/nicholasgasior/gRPC-Web/releases

protoc -I="$PROTO_DIR" \
  --js_out=import_style=commonjs,binary:"$OUT_DIR" \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUT_DIR" \
  "$PROTO_DIR"/musictheory.proto \
  "$PROTO_DIR"/chordimage.proto

# ── Convert generated CJS _pb.js files to ESM for Vite ───────────
for f in "$OUT_DIR"/*_pb.js; do
  [ -f "$f" ] || continue

  # require('...') → import ... from '...'
  sed -i '' \
    "s/var jspb = require('google-protobuf');/import * as jspb from 'google-protobuf';/" \
    "$f"

  # Remove the goog.object.extend(exports, ...) line (CJS export)
  sed -i '' '/^goog\.object\.extend(exports,/d' "$f"

  # Extract the proto package name (e.g. "chordimage" or "musictheory")
  # from lines like: goog.exportSymbol('proto.chordimage.SomeClass', ...)
  pkg=$(grep -m1 "goog.exportSymbol('proto\." "$f" | sed "s/.*proto\.\([^.]*\)\..*/\1/")

  # Extract all exported class names from the matching .d.ts file
  dts="${f%.js}.d.ts"
  if [ -f "$dts" ] && [ -n "$pkg" ]; then
    # Collect all top-level "export class Foo" names from the .d.ts
    classes=$(grep '^export class ' "$dts" | sed 's/export class \([^ ]*\).*/\1/')

    # Build named exports that map each class to its proto.pkg.Class
    {
      echo ''
      for cls in $classes; do
        echo "export const ${cls} = proto.${pkg}.${cls};"
      done
    } >> "$f"
  fi
done
