FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY protos/ /app/protos/

ENV PROTOS_DIR=/app/protos
ENV LISTEN_ADDR=0.0.0.0:50052
ENV MAX_WORKERS=4

EXPOSE 50052

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD python -c "import grpc; ch = grpc.insecure_channel('localhost:50052'); grpc.channel_ready_future(ch).result(timeout=5)"

CMD ["python", "server.py"]
