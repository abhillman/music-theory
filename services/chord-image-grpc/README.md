# chord-image-grpc

A gRPC orchestrator service that takes a Roman numeral (and optional key), analyzes it via `music-theory-grpc`, renders the resulting chord as a PNG via `lilypond-grpc`, and returns the image.

## How It Works

```
Client
  │
  │  RenderRomanNumeral("vii64", "c")
  ▼
chord-image-grpc
  │
  ├──► music-theory-grpc  AnalyzeRomanNumeral  →  lilypond_chord, key
  │
  └──► lilypond-grpc      Render(chord, key)   →  png_base64
  │
  ▼
Client receives png_base64
```

## Proto Definition

```protobuf
service ChordImageService {
  rpc RenderRomanNumeral (RenderRomanNumeralRequest) returns (RenderRomanNumeralResponse);
}

message RenderRomanNumeralRequest {
  string roman_numeral = 1;  // e.g. "V", "vii64", "IV6"
  string key = 2;            // e.g. "c", "F#", "bes" — optional, defaults to "C"
}

message RenderRomanNumeralResponse {
  string png_base64 = 1;
  string error = 2;
}
```

## Project Structure

```
chord-image-grpc/
├── Dockerfile
├── README.md
├── requirements.txt
├── server.py
└── proto/
    ├── chordimage.proto
    ├── lilypond.proto
    └── music_theory.proto
```

## Prerequisites

- Python 3.12+
- `grpcio` and `grpcio-tools`

Install dependencies:

```bash
pip install -r requirements.txt
```

## Generating Python Proto Bindings

From the `chord-image-grpc/` directory:

```bash
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=. \
  --grpc_python_out=. \
  ./proto/chordimage.proto \
  ./proto/lilypond.proto \
  ./proto/musict_heory.proto
```

This produces six files in the project root:

| Generated file                   | Contents                          |
|----------------------------------|-----------------------------------|
| `chordimage_pb2.py`             | Message classes for chordimage    |
| `chordimage_pb2_grpc.py`        | Stub and servicer for chordimage  |
| `lilypond_pb2.py`               | Message classes for lilypond      |
| `lilypond_pb2_grpc.py`          | Stub and servicer for lilypond    |
| `musictheory_pb2.py`            | Message classes for musictheory   |
| `musictheory_pb2_grpc.py`       | Stub and servicer for musictheory |

> **Note:** The Dockerfile runs this step automatically at build time. You only need to run it manually for local development or IDE support.

## Running Locally

Make sure `music-theory-grpc` and `lilypond-grpc` are reachable (either directly or through Envoy).

```bash
# Generate bindings (if not already done)
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=. \
  --grpc_python_out=. \
  ./proto/chordimage.proto \
  ./proto/lilypond.proto \
  ./proto/music_theory.proto

# Point at Envoy (or adjust to direct addresses)
export ENVOY_ADDRESS=localhost:8080
export LISTEN_ADDR=0.0.0.0:50051

python server.py
```

## Running with Docker Compose

From the project root (one level above this directory):

```bash
docker compose up --build
```

The service is exposed through Envoy at `localhost:8080`.

## Testing with grpcurl

```bash
# Basic — just a roman numeral (key defaults to C)
grpcurl -plaintext \
  -d '{"roman_numeral": "V"}' \
  localhost:8080 chordimage.ChordImageService/RenderRomanNumeral

# With a key
grpcurl -plaintext \
  -d '{"roman_numeral": "vii64", "key": "c"}' \
  localhost:8080 chordimage.ChordImageService/RenderRomanNumeral
```

A successful response looks like:

```json
{
  "pngBase64": "/9j/4AAQSkZJRg..."
}
```

An error response looks like:

```json
{
  "error": "Analysis failed: ..."
}
```

## Environment Variables

| Variable        | Default            | Description                                |
|-----------------|--------------------|--------------------------------------------|
| `ENVOY_ADDRESS` | `envoy:8080`      | Address of the Envoy proxy                 |
| `LISTEN_ADDR`   | `0.0.0.0:50051`   | Address this service listens on            |
