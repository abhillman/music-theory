# Music Theory

A web app for analyzing Roman numeral chords. Enter a Roman numeral and key, and get back detailed chord analysis (pitches, inversions, figured bass, quality, etc.) along with a rendered score.

<img src="screenshot.png" style="width: 75%">

## Technologies

| Layer | Tool | Role |
|-------|------|------|
| **Music Engine** | [music21](https://web.mit.edu/music21/) | Computer-aided musicology & theory analysis |
| | [LilyPond](https://lilypond.org/) | Sheet-music engraving |
| **Infrastructure** | [Rust](https://www.rust-lang.org/) | LilyPond rendering service |
| | [gRPC](https://grpc.io/) | Service-to-service communication |
| | [Envoy](https://www.envoyproxy.io/) | gRPC-Web gateway / edge proxy |
| **Frontend** | [React](https://react.dev/) | UI components & state management |
| | [grpc-web](https://github.com/grpc/grpc-web) | Browser client for gRPC services |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) (for the front-end)

## Quick Start

The `start.sh` script launches the entire application (back-end services + front-end) in a single command:

```sh
# Production mode — builds the front-end and serves it via Vite preview
./start.sh

# Development mode — starts the Vite dev server with hot module replacement
./start.sh --dev
```

Press **Ctrl+C** to gracefully shut everything down (front-end process + `docker compose down`).

| Flag | Description |
|------|-------------|
| `--dev` | Start the front-end in development mode (Vite dev server with HMR on port 3000) |
| `--prod` | Build and serve the front-end in production/preview mode (port 4173, default) |
| `--skip-build` | Reuse existing Docker images and build artifacts for faster restarts |

## Getting Started (manual)

### 1. Start the back-end services

```sh
cd services
docker compose up --build -d
```

This brings up the gRPC microservices (music theory analysis, LilyPond rendering, schema registry) behind an Envoy proxy on **localhost:8080**. See [`services/README.md`](services/README.md) for more detail.

### 2. Start the front-end

```sh
cd music-theory-ui
npm install
npm start
```

The React app will open at **http://localhost:3000**.

### 3. Use it

1. Type a Roman numeral (e.g. `V`, `viio`, `IV6`, `bII`)
2. Pick a key from the dropdown
3. Click **Analyze** (or press Enter)

The app displays the rendered chord on a staff along with a detail table showing pitches, root, bass, quality, inversion, scale degree, pitch classes, Forte class, and LilyPond notation.
