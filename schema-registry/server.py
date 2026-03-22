"""
gRPC Schema Registry / Reflection Aggregator

Loads all .proto files from a directory and serves unified gRPC server reflection,
allowing tools like grpcurl and grpcui to discover all services through a single endpoint.
"""

import glob
import logging
import os
import signal
import sys
import threading
from concurrent import futures
from pathlib import Path

import grpc
from google.protobuf import descriptor_pb2
from grpc_reflection.v1alpha import reflection
from grpc_tools import protoc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

PROTOS_DIR = os.environ.get("PROTOS_DIR", "/app/protos")
LISTEN_ADDR = os.environ.get("LISTEN_ADDR", "0.0.0.0:50052")
MAX_WORKERS = int(os.environ.get("MAX_WORKERS", "4"))


def compile_protos(protos_dir: str) -> list[str]:
    proto_files = glob.glob(os.path.join(protos_dir, "**", "*.proto"), recursive=True)

    if not proto_files:
        logger.error(f"No .proto files found in {protos_dir}")
        sys.exit(1)

    logger.info(f"Found {len(proto_files)} proto file(s) in {protos_dir}")

    output_dir = "/tmp/proto_out"
    os.makedirs(output_dir, exist_ok=True)

    generated_files = []

    for proto_file in proto_files:
        proto_name = os.path.basename(proto_file)
        logger.info(f"  Compiling: {proto_name}")

        result = protoc.main(
            [
                "grpc_tools.protoc",
                f"--proto_path={protos_dir}",
                f"--python_out={output_dir}",
                f"--grpc_python_out={output_dir}",
                proto_file,
            ]
        )

        if result != 0:
            logger.error(f"Failed to compile {proto_name} (exit code {result})")
            sys.exit(1)

        stem = Path(proto_file).stem
        pb2_path = os.path.join(output_dir, f"{stem}_pb2.py")
        if os.path.exists(pb2_path):
            generated_files.append(pb2_path)

    sys.path.insert(0, output_dir)
    return generated_files


def load_file_descriptors(protos_dir: str) -> list[descriptor_pb2.FileDescriptorProto]:
    proto_files = glob.glob(os.path.join(protos_dir, "**", "*.proto"), recursive=True)
    descriptor_set = descriptor_pb2.FileDescriptorSet()

    for proto_file in proto_files:
        ds_path = f"/tmp/{Path(proto_file).stem}_descriptor.bin"

        result = protoc.main(
            [
                "grpc_tools.protoc",
                f"--proto_path={protos_dir}",
                f"--descriptor_set_out={ds_path}",
                "--include_imports",
                proto_file,
            ]
        )

        if result != 0:
            logger.error(f"Failed to generate descriptor for {proto_file}")
            continue

        with open(ds_path, "rb") as f:
            ds = descriptor_pb2.FileDescriptorSet()
            ds.ParseFromString(f.read())
            descriptor_set.file.extend(ds.file)

    seen = set()
    unique_files = []
    for fd in descriptor_set.file:
        if fd.name not in seen:
            seen.add(fd.name)
            unique_files.append(fd)

    return unique_files


def collect_service_names(
    file_descriptors: list[descriptor_pb2.FileDescriptorProto],
) -> list[str]:
    service_names = []
    for fd in file_descriptors:
        for service in fd.service:
            if fd.package:
                fqn = f"{fd.package}.{service.name}"
            else:
                fqn = service.name
            service_names.append(fqn)
            logger.info(f"  Registered service: {fqn}")
    return service_names


def serve():
    logger.info("=" * 60)
    logger.info("gRPC Schema Registry / Reflection Aggregator")
    logger.info("=" * 60)

    logger.info(f"Loading protos from: {PROTOS_DIR}")
    compile_protos(PROTOS_DIR)

    file_descriptors = load_file_descriptors(PROTOS_DIR)
    logger.info(f"Loaded {len(file_descriptors)} file descriptor(s)")

    output_dir = "/tmp/proto_out"
    for py_file in glob.glob(os.path.join(output_dir, "*_pb2.py")):
        module_name = Path(py_file).stem
        logger.info(f"  Importing module: {module_name}")
        __import__(module_name)

    service_names = collect_service_names(file_descriptors)

    if not service_names:
        logger.error("No services found in proto files!")
        sys.exit(1)

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=MAX_WORKERS))

    reflection.enable_server_reflection(
        [reflection.SERVICE_NAME] + service_names,
        server,
    )

    server.add_insecure_port(LISTEN_ADDR)
    server.start()

    logger.info(f"Schema registry listening on {LISTEN_ADDR}")
    logger.info(f"Serving reflection for {len(service_names)} service(s):")
    for name in service_names:
        logger.info(f"  - {name}")
    logger.info("=" * 60)

    # Block until SIGTERM/SIGINT
    stop_event = threading.Event()

    def _handle_signal(signum, frame):
        logger.info(f"Received signal {signum}, shutting down...")
        server.stop(grace=5)
        stop_event.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    stop_event.wait()
    logger.info("Server stopped.")


if __name__ == "__main__":
    serve()
