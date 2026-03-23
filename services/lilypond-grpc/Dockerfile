# Dockerfile
FROM rust:1.90-slim-trixie AS builder

WORKDIR /app

# Install protobuf compiler
RUN apt-get update && apt-get install -y protobuf-compiler && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock build.rs ./
COPY proto/ proto/
COPY src/ src/

RUN cargo build --release

# Runtime image
FROM debian:trixie-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends lilypond && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/lilypond-grpc /usr/local/bin/

ENV LILYPOND_POOL_SIZE=8
ENV LISTEN_ADDR=0.0.0.0:50051
ENV RUST_LOG=lilypond_grpc=info

EXPOSE 50051

CMD ["lilypond-grpc"]
