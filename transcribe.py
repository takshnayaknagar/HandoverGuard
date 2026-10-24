
import sys
from faster_whisper import WhisperModel

# Load a small model that can run locally
model = WhisperModel("base", device="cpu", compute_type="int8")

audio_path = sys.argv[1]

segments, info = model.transcribe(audio_path)

transcript = " ".join(segment.text.strip() for segment in segments)

print(transcript)
