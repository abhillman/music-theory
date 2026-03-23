# server.py

import logging
from concurrent import futures
from types import NoneType

import grpc
import music_theory_pb2
import music_theory_pb2_grpc
from music21 import chord as m21chord
from music21 import duration as m21duration
from music21 import key as m21key
from music21 import lily, roman

logger = logging.getLogger(__name__)


def chord_to_lilypond(c: m21chord.Chord) -> str:
    """Convert a music21 Chord to its LilyPond string representation.

    Uses music21's built-in LilyPond translation pipeline:
      1. Create a LilypondConverter and a LyMusicList context.
      2. Append the chord into that context.
      3. Return the string rendering of the music list.

    Returns an empty string if the conversion fails for any reason.
    """
    try:
        lpc = lily.translate.LilypondConverter()
        lp_music_list = lily.lilyObjects.LyMusicList()
        lpc.context = lp_music_list
        logger.warning("chord: %s", c)
        lpc.appendContextFromChord(c)
        return str(lp_music_list).strip()
    except Exception as e:
        logger.warning("LilyPond conversion failed: %s", e)
        return ""


def key_to_lilypond(k: m21key.Key) -> str:
    """Convert a music21 Key to its LilyPond equivalent."""
    # Map music21 pitch names to LilyPond pitch names
    pitch_name_map = {
        "C": "c",
        "D": "d",
        "E": "e",
        "F": "f",
        "G": "g",
        "A": "a",
        "B": "b",
    }

    # Map accidentals to LilyPond suffixes
    accidental_map = {
        "#": "is",
        "##": "isis",
        "-": "es",
        "--": "eses",
    }

    # Get the tonic pitch name (e.g., 'C', 'F', 'B')
    tonic_name = k.tonic.name  # e.g., 'C', 'F#', 'B-'

    # Separate the letter from the accidental
    letter = tonic_name[0]
    accidental = tonic_name[1:] if len(tonic_name) > 1 else ""

    # Build the LilyPond pitch name
    lily_pitch = pitch_name_map[letter]
    if accidental in accidental_map:
        lily_pitch += accidental_map[accidental]

    # Determine mode
    mode = k.mode  # 'major' or 'minor' (or other modes)

    # LilyPond uses \key <pitch> \<mode>
    # e.g., \key c \major, \key fis \minor
    return f"\\key {lily_pitch} \\{mode}"


class MusicTheoryServicer(music_theory_pb2_grpc.MusicTheoryServiceServicer):
    """Implements the MusicTheoryService RPC methods."""

    # Mapping of scale degrees to conventional names
    DEGREE_NAMES = {
        1: "Tonic",
        2: "Supertonic",
        3: "Mediant",
        4: "Subdominant",
        5: "Dominant",
        6: "Submediant",
        7: "Leading Tone",
    }

    def AnalyzeRomanNumeral(self, request, context):
        rn_string = request.roman_numeral.strip()
        key_string = request.key.strip() if request.key else "C"

        if not rn_string:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details("roman_numeral must not be empty")
            return music_theory_pb2.RomanNumeralResponse()

        try:
            k = m21key.Key(key_string)
            rn = roman.RomanNumeral(rn_string, k)
        except Exception as e:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(f"music21 could not parse input: {e}")
            return music_theory_pb2.RomanNumeralResponse()

        # --- Build the response ---
        resp = music_theory_pb2.RomanNumeralResponse()

        resp.input_roman_numeral = rn_string
        resp.key = str(k)

        # Inversion
        try:
            resp.inversion_text = rn.inversionText() or ""
        except Exception:
            resp.inversion_text = ""
        resp.inversion_number = rn.inversion()

        # Common name
        resp.common_name = rn.commonName or ""

        # Figured bass
        try:
            numbers = rn.figuresNotationObj.numbers
            resp.figured_bass_numbers.extend(int(n) for n in numbers)
            resp.figured_bass_string = ",".join(str(n) for n in numbers)
        except Exception:
            pass

        # Pitches
        resp.pitch_names.extend(p.name for p in rn.pitches)
        if rn.bass():
            resp.bass_pitch = rn.bass().name
        if rn.root():
            resp.root_pitch = rn.root().name

        # Quality flags
        resp.quality = rn.quality or ""
        resp.is_major_triad = rn.isMajorTriad()
        resp.is_minor_triad = rn.isMinorTriad()
        resp.is_dominant_seventh = rn.isDominantSeventh()
        resp.is_diminished_seventh = rn.isDiminishedSeventh()
        resp.is_augmented_sixth = rn.isAugmentedSixth()

        # Scale degree
        resp.scale_degree = rn.scaleDegree
        resp.scale_degree_name = self.DEGREE_NAMES.get(rn.scaleDegree, "")

        # Pitch classes & forte class
        resp.pitch_classes.extend(p.pitchClass for p in rn.pitches)
        try:
            c = m21chord.Chord(rn.pitches)
            resp.forte_class = c.forteClass or ""
        except Exception:
            resp.forte_class = ""

        # LilyPond chord representation
        try:
            c = m21chord.Chord(rn.pitches)
            c.duration = m21duration.Duration(type="whole")

            resp.lilypond_chord = chord_to_lilypond(c)
            if not resp.lilypond_chord:
                logger.warning("LilyPond chord is empty.")
        except Exception as e:
            logger.warning("Could not produce LilyPond chord: %s", e)
            resp.lilypond_chord = ""

        resp.lilypond_key = key_to_lilypond(k)

        return resp


def serve(port: int = 50051):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    music_theory_pb2_grpc.add_MusicTheoryServiceServicer_to_server(
        MusicTheoryServicer(), server
    )
    listen_addr = f"[::]:{port}"
    server.add_insecure_port(listen_addr)
    server.start()
    logger.info("MusicTheory gRPC server listening on %s", listen_addr)
    print(f"✓ Server started on port {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    serve()
