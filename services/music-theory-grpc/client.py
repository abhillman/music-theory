# client.py

import sys

import grpc
import musictheory_pb2
import musictheory_pb2_grpc


def run(rn_input: str = "V6", key_input: str = "C"):
    with grpc.insecure_channel("localhost:8080") as channel:
        stub = musictheory_pb2_grpc.MusicTheoryServiceStub(channel)

        request = musictheory_pb2.RomanNumeralRequest(
            roman_numeral=rn_input,
            key=key_input,
        )

        print(f"→ Requesting analysis of '{rn_input}' in key of {key_input}\n")
        resp = stub.AnalyzeRomanNumeral(request)

        print(f"  Input:                {resp.input_roman_numeral}")
        print(f"  Key:                  {resp.key}")
        print(f"  Common Name:          {resp.common_name}")
        print(f"  Quality:              {resp.quality}")
        print(f"  Root:                 {resp.root_pitch}")
        print(f"  Bass:                 {resp.bass_pitch}")
        print(f"  Pitches:              {list(resp.pitch_names)}")
        print(
            f"  Inversion:            {resp.inversion_number} ({resp.inversion_text})"
        )
        print(f"  Figured Bass:         ({resp.figured_bass_string})")
        print(f"  Scale Degree:         {resp.scale_degree} — {resp.scale_degree_name}")
        print(f"  Pitch Classes:        {list(resp.pitch_classes)}")
        print(f"  Forte Class:          {resp.forte_class}")
        print(f"  Is Major Triad:       {resp.is_major_triad}")
        print(f"  Is Minor Triad:       {resp.is_minor_triad}")
        print(f"  Is Dom 7th:           {resp.is_dominant_seventh}")
        print(f"  Is Dim 7th:           {resp.is_diminished_seventh}")
        print(f"  Is Aug 6th:           {resp.is_augmented_sixth}")


if __name__ == "__main__":
    rn = sys.argv[1] if len(sys.argv) > 1 else "V6"
    k = sys.argv[2] if len(sys.argv) > 2 else "C"
    run(rn, k)
