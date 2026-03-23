# Dockerfile

FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ── Install system deps needed by music21 ────────────────────────────
# music21 has no hard native deps for headless use, but we need
# protobuf compiler for the build stage.
# TODO(@aryehh): there is (possibly) a bug in music21 which requires lilypond
# ... to be installed merely to compute the lilypond represenation of a chord
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        protobuf-compiler lilypond \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ──────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy proto and generate stubs ────────────────────────────────────
COPY proto/ proto/

RUN python -m grpc_tools.protoc \
    -I proto \
    --python_out=. \
    --pyi_out=. \
    --grpc_python_out=. \
    proto/musictheory.proto

# ── Copy application code ────────────────────────────────────────────
COPY server.py .
COPY client.py .

# ── Pre-warm music21 environment config ──────────────────────────────
# music21 tries to create a user environment file on first import.
# We set a writable home and do a quick import so startup is faster.
ENV HOME=/app
RUN python -c "import music21; print('music21 ready:', music21.VERSION_STR)"

# ── Runtime ──────────────────────────────────────────────────────────
EXPOSE 50051

# Run as non-root
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --home-dir /app appuser && \
    chown -R appuser:appuser /app
USER appuser

ENTRYPOINT ["python", "server.py"]
