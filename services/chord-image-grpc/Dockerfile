FROM python:3.12-slim

WORKDIR /app

COPY chord-image-grpc/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY proto/ ./proto/
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=. \
    --grpc_python_out=. \
    ./proto/chordimage.proto \
    ./proto/lilypond.proto \
    ./proto/musictheory.proto

COPY chord-image-grpc/server.py .

CMD ["python", "server.py"]
