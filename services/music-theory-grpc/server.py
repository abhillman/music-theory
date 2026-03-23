# server.py

import logging
from concurrent import futures
from types import NoneType

import grpc
import musictheory_pb2
import musictheory_pb2_grpc
from music21 import chord as m21chord
from music21 import duration as m21duration
from music21 import key as m21key
from music21 import lily, roman
from music21 import pitch as m21pitch

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


# Target range for comfortable treble-clef rendering.
# We want the lowest note of the chord to sit near middle-C (C4) so
# the chord straddles the staff rather than floating above it.
# B3–B4 is roughly the middle of the treble staff.
TARGET_LOWEST_MIDI = m21pitch.Pitch("B3").midi  # 59
TARGET_HIGHEST_MIDI = m21pitch.Pitch("B4").midi  # 71


def normalize_chord_octave(pitches: list[m21pitch.Pitch]) -> list[m21pitch.Pitch]:
    """Return a new list of pitches shifted so the chord sits comfortably
    on the treble-clef staff.

    Strategy:
      1. Place all pitches in close position above the bass.
      2. Shift the whole chord up or down in octaves so its lowest note
         falls inside the target band (B3–B4).  This keeps the chord
         nicely centred on the staff.
    """
    if not pitches:
        return pitches

    # Work on copies so we don't mutate the originals.
    notes = [m21pitch.Pitch(p.nameWithOctave) for p in pitches]

    # --- 1. Close-position the chord above the bass note ---------------
    # Put every note in the same octave as the first note, then bump up
    # any note that would sit below the previous one.
    base = notes[0]
    for i in range(1, len(notes)):
        notes[i].octave = base.octave
        while notes[i].midi < notes[i - 1].midi:
            notes[i].octave += 1

    # --- 2. Shift whole chord so the lowest note is in target band -----
    lowest_midi = notes[0].midi
    # How many semitones to shift (in whole octaves)
    shift = 0
    while lowest_midi + shift < TARGET_LOWEST_MIDI:
        shift += 12
    while lowest_midi + shift > TARGET_HIGHEST_MIDI:
        shift -= 12

    if shift:
        octave_delta = shift // 12
        for n in notes:
            n.octave += octave_delta

    return notes


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


class MusicTheoryServicer(musictheory_pb2_grpc.MusicTheoryServiceServicer):
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
            return musictheory_pb2.RomanNumeralResponse()

        try:
            k = m21key.Key(key_string)
            rn = roman.RomanNumeral(rn_string, k)
        except Exception as e:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(f"music21 could not parse input: {e}")
            return musictheory_pb2.RomanNumeralResponse()

        # --- Build the response ---
        resp = musictheory_pb2.RomanNumeralResponse()

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
            normalized = normalize_chord_octave(list(rn.pitches))
            c = m21chord.Chord(normalized)
            c.duration = m21duration.Duration(type="whole")

            resp.lilypond_chord = chord_to_lilypond(c)
            if not resp.lilypond_chord:
                logger.warning("LilyPond chord is empty.")
        except Exception as e:
            logger.warning("Could not produce LilyPond chord: %s", e)
            resp.lilypond_chord = ""

        resp.lilypond_key = key_to_lilypond(k)

        # Intervals from bass
        try:
            intervals = rn.annotateIntervals(stripSpecifiers=False, returnList=True)
            if intervals:
                resp.intervals_from_bass.extend(str(i) for i in intervals)
        except Exception:
            pass

        # Pitched common name (e.g. "G-major triad")
        try:
            resp.pitched_common_name = rn.pitchedCommonName or ""
        except Exception:
            resp.pitched_common_name = ""

        # Prime form (set theory)
        try:
            pf = rn.primeForm
            if pf:
                resp.prime_form.extend(int(x) for x in pf)
        except Exception:
            pass

        # Interval vector (6-element)
        try:
            iv = rn.intervalVector
            if iv:
                resp.interval_vector.extend(int(x) for x in iv)
        except Exception:
            pass

        # Figure and key string
        try:
            resp.figure_and_key = rn.figureAndKey or ""
        except Exception:
            resp.figure_and_key = ""

        # Functionality score
        try:
            resp.functionality_score = rn.functionalityScore or 0
        except Exception:
            resp.functionality_score = 0

        # Additional chord-type flags
        try:
            resp.is_neapolitan = rn.isNeapolitan()
        except Exception:
            resp.is_neapolitan = False

        try:
            resp.is_half_diminished_seventh = rn.isHalfDiminishedSeventh()
        except Exception:
            resp.is_half_diminished_seventh = False

        try:
            resp.is_augmented_triad = rn.isAugmentedTriad()
        except Exception:
            resp.is_augmented_triad = False

        try:
            resp.is_diminished_triad = rn.isDiminishedTriad()
        except Exception:
            resp.is_diminished_triad = False

        try:
            resp.is_consonant = rn.isConsonant()
        except Exception:
            resp.is_consonant = False

        try:
            resp.is_triad = rn.isTriad()
        except Exception:
            resp.is_triad = False

        try:
            resp.is_seventh = rn.isSeventh()
        except Exception:
            resp.is_seventh = False

        # Implied quality from figure
        try:
            resp.implied_quality = rn.impliedQuality or ""
        except Exception:
            resp.implied_quality = ""

        # Semitones from root for each chord step
        try:
            semitones = []
            for step in [1, 3, 5, 7, 9, 11, 13]:
                s = rn.semitonesFromChordStep(step)
                if s is not None:
                    semitones.append(int(s))
            resp.semitones_from_root.extend(semitones)
        except Exception:
            pass

        # Named chord tones (third, fifth, seventh)
        try:
            third = rn.third
            resp.third_pitch = third.name if third else ""
        except Exception:
            resp.third_pitch = ""

        try:
            fifth = rn.fifth
            resp.fifth_pitch = fifth.name if fifth else ""
        except Exception:
            resp.fifth_pitch = ""

        try:
            seventh = rn.seventh
            resp.seventh_pitch = seventh.name if seventh else ""
        except Exception:
            resp.seventh_pitch = ""

        return resp


def serve(port: int = 50051):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    musictheory_pb2_grpc.add_MusicTheoryServiceServicer_to_server(
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
