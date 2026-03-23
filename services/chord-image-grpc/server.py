import logging
import os
from concurrent import futures

# These will be generated at build time
import chordimage_pb2
import chordimage_pb2_grpc
import grpc
import lilypond_pb2
import lilypond_pb2_grpc
import music_theory_pb2
import music_theory_pb2_grpc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENVOY_ADDRESS = os.environ.get("ENVOY_ADDRESS", "envoy:8080")
LISTEN_ADDR = os.environ.get("LISTEN_ADDR", "0.0.0.0:50051")


class ChordImageServicer(chordimage_pb2_grpc.ChordImageServiceServicer):
    def __init__(self):
        self.channel = grpc.insecure_channel(ENVOY_ADDRESS)
        self.theory_stub = music_theory_pb2_grpc.MusicTheoryServiceStub(self.channel)
        self.lilypond_stub = lilypond_pb2_grpc.LilyPondServiceStub(self.channel)
        logger.info(f"Connected to envoy at {ENVOY_ADDRESS}")

    def RenderRomanNumeral(self, request, context):
        # 1. Analyze the roman numeral
        try:
            analysis = self.theory_stub.AnalyzeRomanNumeral(
                music_theory_pb2.RomanNumeralRequest(
                    roman_numeral=request.roman_numeral,
                    key=request.key,
                )
            )
        except grpc.RpcError as e:
            logger.error(f"AnalyzeRomanNumeral failed: {e.details()}")
            return chordimage_pb2.RenderRomanNumeralResponse(
                error=f"Analysis failed: {e.details()}"
            )

        logger.info(
            f"Analyzed '{request.roman_numeral}' in key '{analysis.key}': "
            f"lilypond_chord='{analysis.lilypond_chord}'"
        )

        # 2. Render the chord via LilyPond
        try:
            render = self.lilypond_stub.Render(
                lilypond_pb2.RenderRequest(
                    clef=lilypond_pb2.TREBLE,
                    key=analysis.lilypond_key,
                    notes=analysis.lilypond_chord,
                )
            )
        except grpc.RpcError as e:
            logger.error(f"Render failed: {e.details()}")
            return chordimage_pb2.RenderRomanNumeralResponse(
                error=f"Render failed: {e.details()}"
            )

        if render.error:
            return chordimage_pb2.RenderRomanNumeralResponse(error=render.error)

        return chordimage_pb2.RenderRomanNumeralResponse(png_base64=render.png_base64)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    chordimage_pb2_grpc.add_ChordImageServiceServicer_to_server(
        ChordImageServicer(), server
    )
    server.add_insecure_port(LISTEN_ADDR)
    server.start()
    logger.info(f"chord-image-grpc listening on {LISTEN_ADDR}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
