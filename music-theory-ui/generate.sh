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
