# 🎵 Music Theory gRPC Service

A lightweight gRPC microservice that analyzes Roman numeral chord symbols using
[music21](https://web.mit.edu/music21/). Pass in a Roman numeral like `V6`, `viio7`,
or `It6` and get back structured data about the chord — inversion, quality, figured bass,
pitch content, and more.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Installation](#installation)
  - [Local](#local)
  - [Docker](#docker)
- [Usage](#usage)
  - [Starting the Server](#starting-the-server)
  - [Running the Client](#running-the-client)
  - [Example Output](#example-output)
- [API Reference](#api-reference)
  - [RPC: AnalyzeRomanNumeral](#rpc-analyzenumeral)
  - [RomanNumeralRequest](#romannumeralrequest)
  - [RomanNumeralResponse](#romannumeralresponse)
- [Supported Roman Numeral Formats](#supported-roman-numeral-formats)
- [Development](#development)
  - [Regenerating Proto Stubs](#regenerating-proto-stubs)
  - [Running Without Docker](#running-without-docker)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **Single RPC endpoint** — send a Roman numeral string, receive rich chord metadata.
- **Key-aware analysis** — optionally specify a key (major or minor) for correct pitch spelling.
- **Comprehensive response** including:
  - Common chord name and quality
  - Inversion number and text
  - Figured bass numbers
  - Pitch names, root, and bass note
  - Scale degree and degree name
  - Boolean flags for major/minor triad, dominant 7th, diminished 7th, augmented 6th
  - Pitch-class set and Forte class
- **Dockerized** — one command to build and run.
- **Powered by music21** — battle-tested music theory library from MIT.

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/youruser/music-theory-grpc.git
cd music-theory-grpc

# Run with Docker Compose
docker compose up --build

# In another terminal, test it
python client.py "V65" "C"
```

---

## Project Structure

```
music-theory-grpc/
├── proto/
│   └── music_theory.proto   # Protobuf service & message definitions
├── server.py                # gRPC server implementation
├── client.py                # Example Python client
├── requirements.txt         # Python dependencies
├── Dockerfile               # Container build
├── docker-compose.yml       # Compose convenience file
├── .dockerignore
└── README.md
```

---

## Installation

### Local

**Prerequisites:**

- Python 3.10+
- pip

```bash
# 1. Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Generate gRPC stubs from the proto file
python -m grpc_tools.protoc \
  -I proto \
  --python_out=. \
  --pyi_out=. \
  --grpc_python_out=. \
  proto/music_theory.proto
```

### Docker

```bash
# Build
docker build -t music-theory-grpc .

# Run
docker run -d --name music-theory -p 50051:50051 music-theory-grpc
```

Or with Docker Compose:

```bash
docker compose up --build
```

---

## Usage

### Starting the Server

```bash
# Local
python server.py

# Docker
docker run -d -p 50051:50051 music-theory-grpc
```

The server listens on port **50051** by default.

### Running the Client

```bash
# Default: V6 in C major
python client.py

# Specify a Roman numeral
python client.py "viio7"

# Specify a Roman numeral AND a key
python client.py "V65" "G"

# Minor key — use lowercase letter
python client.py "It6" "c"
```

### Example Output

```
→ Requesting analysis of 'V6' in key of C

  Input:                V6
  Key:                  C major
  Common Name:          major triad
  Quality:              major
  Root:                 G
  Bass:                 B
  Pitches:              ['B', 'D', 'G']
  Inversion:            1 (First Inversion)
  Figured Bass:         (6,3)
  Scale Degree:         5 — Dominant
  Pitch Classes:        [11, 2, 7]
  Forte Class:          3-11B
  Is Major Triad:       True
  Is Minor Triad:       False
  Is Dom 7th:           False
  Is Dim 7th:           False
  Is Aug 6th:           False
```

---

## API Reference

### RPC: AnalyzeRomanNumeral

| Field     | Type                     | Direction |
|-----------|--------------------------|-----------|
| Request   | `RomanNumeralRequest`    | →         |
| Response  | `RomanNumeralResponse`   | ←         |

---

### RomanNumeralRequest

| Field            | Type     | Required | Description                                                        |
|------------------|----------|----------|--------------------------------------------------------------------|
| `roman_numeral`  | `string` | Yes      | Roman numeral to analyze, e.g. `"V6"`, `"viio7"`, `"It6"`         |
| `key`            | `string` | No       | Key context. Uppercase = major, lowercase = minor. Default: `"C"`. |

---

### RomanNumeralResponse

| Field                   | Type              | Description                                          |
|-------------------------|-------------------|------------------------------------------------------|
| `input_roman_numeral`   | `string`          | Echo of the input                                    |
| `key`                   | `string`          | Resolved key, e.g. `"C major"`                       |
| `inversion_text`        | `string`          | e.g. `"First Inversion"`                             |
| `inversion_number`      | `int32`           | `0` = root position, `1` = first, `2` = second, etc.|
| `common_name`           | `string`          | e.g. `"major triad"`, `"dominant seventh chord"`     |
| `figured_bass_numbers`  | `repeated int32`  | e.g. `[6, 3]`                                       |
| `figured_bass_string`   | `string`          | e.g. `"6,3"`                                        |
| `pitch_names`           | `repeated string` | e.g. `["B", "D", "G"]`                              |
| `bass_pitch`            | `string`          | Lowest pitch name                                    |
| `root_pitch`            | `string`          | Root of the chord                                    |
| `quality`               | `string`          | e.g. `"major"`, `"minor"`, `"diminished"`            |
| `is_major_triad`        | `bool`            | —                                                    |
| `is_minor_triad`        | `bool`            | —                                                    |
| `is_dominant_seventh`   | `bool`            | —                                                    |
| `is_diminished_seventh` | `bool`            | —                                                    |
| `is_augmented_sixth`    | `bool`            | —                                                    |
| `scale_degree`          | `int32`           | e.g. `5` for V                                       |
| `scale_degree_name`     | `string`          | e.g. `"Dominant"`                                    |
| `pitch_classes`         | `repeated int32`  | e.g. `[11, 2, 7]`                                   |
| `forte_class`           | `string`          | e.g. `"3-11B"`                                       |

---

## Supported Roman Numeral Formats

music21 supports a wide range of Roman numeral notation. Here are some examples:

| Input     | Description                              |
|-----------|------------------------------------------|
| `I`       | Major tonic triad, root position         |
| `ii`      | Minor supertonic triad                   |
| `V6`      | Major dominant triad, first inversion    |
| `V65`     | Dominant seventh, first inversion        |
| `V43`     | Dominant seventh, second inversion       |
| `V42`     | Dominant seventh, third inversion        |
| `viio`    | Diminished leading-tone triad            |
| `viio7`   | Fully diminished seventh                 |
| `viiø7`   | Half-diminished seventh                  |
| `It6`     | Italian augmented sixth                  |
| `Fr43`    | French augmented sixth                   |
| `Ger65`   | German augmented sixth                   |
| `N6`      | Neapolitan sixth                         |
| `#ivo7`   | Raised-4 diminished seventh              |
| `bVI`     | Flat-six major triad                     |

For the full list, see the
[music21 Roman Numeral documentation](https://web.mit.edu/music21/doc/moduleReference/moduleRoman.html).

---

## Development

### Regenerating Proto Stubs

After editing `proto/music_theory.proto`:

```bash
python -m grpc_tools.protoc \
  -I proto \
  --python_out=. \
  --pyi_out=. \
  --grpc_python_out=. \
  proto/music_theory.proto
```

The generated files (`music_theory_pb2.py`, `music_theory_pb2.pyi`,
`music_theory_pb2_grpc.py`) are **git-ignored** — they are regenerated at build time
in Docker and should be regenerated locally after any proto change.

### Running Without Docker

```bash
source .venv/bin/activate
python server.py &
python client.py "V43" "Bb"
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: music_theory_pb2` | You need to generate the stubs first. See [Regenerating Proto Stubs](#regenerating-proto-stubs). |
| `music21` first-import is slow | Normal on first run — it creates a user environment config. Subsequent imports are fast. The Docker image pre-warms this at build time. |
| Connection refused on `localhost:50051` | Make sure the server is running and the port is mapped (`-p 50051:50051` in Docker). |
| `UNAVAILABLE` gRPC error from inside Docker | If the client is also in Docker, use `--network host` or the container's service name instead of `localhost`. |
| Minor key not working | Use a **lowercase** letter for the key, e.g. `"a"` for A minor, `"c"` for C minor. |

---

## License

MIT
