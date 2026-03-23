# Music Theory Microservices

A suite of gRPC microservices for music theory analysis and score rendering, orchestrated with Docker Compose and unified behind an Envoy proxy.

## Architecture

```
                         ┌─────────────────────┐
                         │     Envoy Proxy     │
                         │    localhost:8080   │
                         └──┬───────┬───────┬──┘
                            │       │       │
            ┌───────────────┘       │       └───────────────┐
            ▼                       ▼                       ▼
  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────────┐
  │  lilypond-grpc   │  │ music-theory-grpc  │  │  schema-registry   │
  │  (Rust/Tonic)    │  │ (Python)           │  │  (Python)          │
  │  :50051          │  │ :50051             │  │  :50052            │
  └──────────────────┘  └────────────────────┘  └────────────────────┘
```

| Service | Language | Port (internal) | Description |
|---|---|---|---|
| **lilypond-grpc** | Rust | 50051 | Renders LilyPond notation to PNG via gRPC |
| **music-theory-grpc** | Python | 50051 | Analyzes Roman numeral chords (inversions, pitch classes, figured bass, etc.) |
| **schema-registry** | Python | 50052 | Aggregates all proto definitions and serves unified gRPC reflection |
| **envoy** | — | 8080 (exposed) | Routes gRPC traffic to the correct backend by service name |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [grpc_cli](https://github.com/grpc/grpc/blob/master/doc/command_line_tool.md) (optional, for testing)

### Installing grpc_cli

```bash
# macOS
brew install grpc

# Linux (build from source)
# See https://github.com/grpc/grpc/blob/master/doc/command_line_tool.md
```

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd music-theory

# Start all services
docker compose up --build -d

# Verify everything is running
docker compose ps
```

Expected output:

```
NAME                                IMAGE                            STATUS              PORTS
music-theory-envoy-1               envoyproxy/envoy:v1.31-latest    Up                  0.0.0.0:8080->8080/tcp
music-theory-lilypond-grpc-1       music-theory-lilypond-grpc       Up (healthy)        50051/tcp
music-theory-music-theory-grpc-1   music-theory-music-theory-grpc   Up (healthy)        50051/tcp
music-theory-schema-registry-1     music-theory-schema-registry     Up (healthy)        50052/tcp
```

## Usage

All requests go through the Envoy proxy at **`localhost:8080`**. The schema registry provides unified reflection, so discovery tools work without specifying proto files.

### List Available Services

```bash
grpc_cli ls localhost:8080
```

```
grpc.reflection.v1alpha.ServerReflection
lilypond.LilyPondService
musictheory.MusicTheoryService
```

### List Methods on a Service

```bash
grpc_cli ls localhost:8080 musictheory.MusicTheoryService -l
```

```
filename: music_theory.proto
package: musictheory
service MusicTheoryService {
  rpc AnalyzeRomanNumeral(musictheory.RomanNumeralRequest) returns (musictheory.RomanNumeralResponse) {}
}
```

```bash
grpc_cli ls localhost:8080 lilypond.LilyPondService -l
```

```
filename: lilypond.proto
package: lilypond
service LilyPondService {
  rpc Render(lilypond.RenderRequest) returns (lilypond.RenderResponse) {}
}
```

### Analyze a Roman Numeral

```bash
grpc_cli call localhost:8080 musictheory.MusicTheoryService.AnalyzeRomanNumeral \
  'roman_numeral: "V" key: "C"'
```

```bash
# First inversion dominant chord in E major
grpc_cli call localhost:8080 musictheory.MusicTheoryService.AnalyzeRomanNumeral \
  'roman_numeral: "V6" key: "E"'
```

```bash
# Minor subdominant (ii) in D minor
grpc_cli call localhost:8080 musictheory.MusicTheoryService.AnalyzeRomanNumeral \
  'roman_numeral: "ii" key: "d"'
```

### Render LilyPond Notation

```bash
# Simple C major chord
grpc_cli call localhost:8080 lilypond.LilyPondService.Render \
  'clef: TREBLE key: "c \\major" notes: "<c e g>1"'
```

```bash
# C# minor triad
grpc_cli call localhost:8080 lilypond.LilyPondService.Render \
  'clef: TREBLE key: "c \\major" notes: "<cis e g>1"'
```

```bash
# Bass clef with a scale passage
grpc_cli call localhost:8080 lilypond.LilyPondService.Render \
  'clef: BASS key: "g \\major" notes: "g,4 a, b, c"'
```

The response contains a base64-encoded PNG in the `png_base64` field. To decode and view it:

```bash
grpc_cli call localhost:8080 lilypond.LilyPondService.Render \
  'clef: TREBLE key: "c \\major" notes: "<c e g>1"' \
  2>&1 | grep png_base64 | sed 's/.*: "\(.*\)"/\1/' | base64 -d > chord.png

open chord.png  # macOS
```

## Project Structure

```
music-theory/
├── docker-compose.yml              # Orchestrates all services
├── envoy.yaml                      # Envoy proxy routing config
├── README.md
├── lilypond-grpc/                  # Rust/Tonic gRPC service
│   ├── Dockerfile
│   ├── Cargo.toml
│   ├── proto/
│   │   └── lilypond.proto
│   └── src/
├── music-theory-grpc/              # Python gRPC service
│   ├── Dockerfile
│   ├── proto/
│   │   └── music_theory.proto
│   └── server.py
└── schema-registry/                # Reflection aggregator
    ├── Dockerfile
    ├── requirements.txt
    ├── server.py
    ├── protos.toml                 # Declares proto sources
    └── sync_protos.py              # Copies protos at build time
```

## Adding a New Service

1. Create your service directory with a `proto/` folder and `Dockerfile`.

2. Register the proto in `schema-registry/protos.toml`:

    ```toml
    [[source]]
    path = "my-new-service/proto/my_service.proto"
    ```

3. Add the `COPY` line in `schema-registry/Dockerfile`:

    ```dockerfile
    COPY my-new-service/proto/ /tmp/sources/my-new-service/proto/
    ```

4. Add the service and Envoy route:

    ```yaml
    # docker-compose.yml
    my-new-service:
      build: ./my-new-service
      restart: unless-stopped
    ```

    ```yaml
    # envoy.yaml — add a new route and cluster
    - match:
        prefix: "/mypackage.MyService/"
      route:
        cluster: my_new_service_cluster
    ```

5. Rebuild:

    ```bash
    docker compose up --build -d
    ```

## Useful Commands

```bash
# Start all services
docker compose up --build -d

# Stop all services
docker compose down

# View logs for a specific service
docker compose logs -f lilypond-grpc
docker compose logs -f music-theory-grpc
docker compose logs -f schema-registry
docker compose logs -f envoy

# Restart a single service
docker compose restart music-theory-grpc

# Check service health
docker compose ps

# List all gRPC services via reflection
grpc_cli ls localhost:8080

# Describe a message type
grpc_cli type localhost:8080 musictheory.RomanNumeralResponse
```

## Environment Variables

### lilypond-grpc

| Variable | Default | Description |
|---|---|---|
| `LISTEN_ADDR` | `0.0.0.0:50051` | gRPC listen address |
| `LILYPOND_POOL_SIZE` | `4` | Max concurrent LilyPond render processes |
| `RUST_LOG` | `lilypond_grpc=info` | Log level |

### schema-registry

| Variable | Default | Description |
|---|---|---|
| `LISTEN_ADDR` | `0.0.0.0:50052` | gRPC listen address |
| `PROTOS_DIR` | `/app/protos` | Directory containing proto files |
| `MAX_WORKERS` | `4` | Thread pool size |
