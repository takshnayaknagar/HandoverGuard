# Offline STT evaluation

This directory is intentionally empty of recordings. Add only synthetic or properly de-identified clips recorded by project volunteers; never add real patient audio.

## Manifest

Add one JSON object per line to `manifest.jsonl`:

```json
{"id":"medication-001","audio":"audio/medication-001.wav","reference":"No fever. Give amoxicillin 500 milligrams at 08:00; dose not confirmed.","critical_terms":{"medications":["amoxicillin"],"numbers":["500","08:00"],"units":["milligrams"],"negations":["No fever","not confirmed"]}}
```

Cover medication names and similar-sounding terms, doses/decimals/units/frequencies/times, negation and uncertainty, abbreviations, Indian English accents where volunteers are available, pauses, background noise, and realistic speaking rates. Keep the reference transcript exactly as spoken.

## Run

From the repository root, after the existing backend environment is available:

```powershell
.venv\Scripts\python.exe tools\stt_benchmark.py --manifest evaluation\stt\manifest.jsonl --model base --device cpu --compute-type int8 --limit 5 --output evaluation\stt\base.json
```

Compare candidates on the same clips by repeating `--model`:

```powershell
.venv\Scripts\python.exe tools\stt_benchmark.py --manifest evaluation\stt\manifest.jsonl --model base --model small --device cpu --compute-type int8 --output evaluation\stt\comparison.json
```

The report records per-clip WER/CER, duration, detected language when available, errors, and annotated critical-term omissions. It does not rewrite transcripts or call a cloud service. A missing critical term is a review signal, not an automatic correction.

Manifest validation requires unique non-empty IDs, non-empty reference transcripts, existing audio paths, and `critical_terms` as an object whose values are lists of non-empty strings. Errors identify the manifest line and clip ID where possible. Critical-term matching is case-insensitive and word-boundary-aware, so `500` does not match `50` and phrases such as `No fever` remain phrases. These are review flags only, not clinical validation.

Each model report includes `successful_clips`, `failed_clips`, effective device/compute settings, and per-clip failures. Aggregate WER/CER are explicitly calculated from successful clips only and are `null` when no clips succeed; failed clips are never silently omitted.

The script uses a small standard-library Levenshtein implementation, so no new dependency is required. Model downloads and RAM/CPU usage are determined by Faster-Whisper and the selected model; benchmark each candidate on the intended deployment host before changing production settings.
