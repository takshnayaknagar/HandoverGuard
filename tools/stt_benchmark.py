"""Offline Faster-Whisper benchmark for synthetic/de-identified audio.

This tool does not call the FastAPI endpoint and does not alter production
settings. It uses a JSONL manifest with one reference transcript per clip.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Any


def _tokens(text: str) -> list[str]:
    return re.findall(r"[\w']+", text.casefold())


def _edit_distance(left: list[str], right: list[str]) -> int:
    previous = list(range(len(right) + 1))
    for i, left_item in enumerate(left, start=1):
        current = [i]
        for j, right_item in enumerate(right, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + (left_item != right_item),
                )
            )
        previous = current
    return previous[-1]


def _wer(reference: str, hypothesis: str) -> tuple[int, int]:
    reference_tokens = _tokens(reference)
    if not reference_tokens:
        raise ValueError("Reference transcript must contain at least one token.")
    return _edit_distance(reference_tokens, _tokens(hypothesis)), len(reference_tokens)


def _cer(reference: str, hypothesis: str) -> tuple[int, int]:
    reference_chars = list(reference.casefold())
    if not reference_chars:
        raise ValueError("Reference transcript must contain at least one character.")
    return _edit_distance(reference_chars, list(hypothesis.casefold())), len(reference_chars)


def _critical_mismatches(reference: str, hypothesis: str, annotations: dict[str, Any]) -> dict[str, list[str]]:
    def contains(text: str, term: str) -> bool:
        return re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text, flags=re.IGNORECASE) is not None

    mismatches: dict[str, list[str]] = {}
    for category, terms in annotations.items():
        missing = [str(term) for term in terms if contains(reference, str(term)) and not contains(hypothesis, str(term))]
        if missing:
            mismatches[category] = missing
    return mismatches


def _validate_entry(entry: Any, line_number: int, manifest_path: Path, seen_ids: set[str]) -> dict[str, Any]:
    if not isinstance(entry, dict):
        raise ValueError(f"Manifest line {line_number} must contain a JSON object.")

    clip_id = entry.get("id")
    if not isinstance(clip_id, str) or not clip_id.strip():
        raise ValueError(f"Manifest line {line_number}: 'id' must be a non-empty string.")
    clip_id = clip_id.strip()
    if clip_id in seen_ids:
        raise ValueError(f"Manifest line {line_number}, clip '{clip_id}': duplicate id.")
    seen_ids.add(clip_id)

    audio = entry.get("audio")
    if not isinstance(audio, str) or not audio.strip():
        raise ValueError(f"Manifest line {line_number}, clip '{clip_id}': 'audio' must be a non-empty path.")
    audio_path = (manifest_path.parent / audio).resolve()
    if not audio_path.is_file():
        raise ValueError(f"Manifest line {line_number}, clip '{clip_id}': audio file does not exist: {audio}")

    reference = entry.get("reference")
    if not isinstance(reference, str) or not reference.strip():
        raise ValueError(f"Manifest line {line_number}, clip '{clip_id}': 'reference' must be non-empty.")

    critical_terms = entry.get("critical_terms", {})
    if not isinstance(critical_terms, dict):
        raise ValueError(f"Manifest line {line_number}, clip '{clip_id}': 'critical_terms' must be an object.")
    for category, terms in critical_terms.items():
        if not isinstance(category, str) or not isinstance(terms, list) or any(
            not isinstance(term, str) or not term.strip() for term in terms
        ):
            raise ValueError(
                f"Manifest line {line_number}, clip '{clip_id}': critical_terms values must be lists of non-empty strings."
            )

    return {**entry, "id": clip_id, "audio": audio.strip(), "reference": reference.strip(), "critical_terms": critical_terms}


def _load_manifest(path: Path) -> list[dict[str, Any]]:
    entries = []
    seen_ids: set[str] = set()
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON on manifest line {line_number}: {exc}") from exc
        entries.append(_validate_entry(entry, line_number, path, seen_ids))
    return entries


def _run_model(model_name: str, entries: list[dict[str, Any]], args: argparse.Namespace) -> dict[str, Any]:
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_name, device=args.device, compute_type=args.compute_type)
        model_error = None
    except Exception as exc:
        model = None
        model_error = f"{type(exc).__name__}: {exc}"
    results = []
    total_wer_errors = total_wer_words = total_cer_errors = total_cer_chars = 0

    for entry in entries:
        audio_path = (args.manifest.parent / entry["audio"]).resolve()
        started = time.perf_counter()
        result: dict[str, Any] = {"id": entry["id"], "audio": str(audio_path), "model": model_name}
        try:
            if model_error:
                raise RuntimeError(model_error)
            segments, info = model.transcribe(str(audio_path))
            hypothesis = " ".join(segment.text.strip() for segment in segments).strip()
            wer_errors, wer_words = _wer(entry["reference"], hypothesis)
            cer_errors, cer_chars = _cer(entry["reference"], hypothesis)
            total_wer_errors += wer_errors
            total_wer_words += wer_words
            total_cer_errors += cer_errors
            total_cer_chars += cer_chars
            result.update(
                {
                    "reference": entry["reference"],
                    "hypothesis": hypothesis,
                    "wer": wer_errors / wer_words if wer_words else 0.0,
                    "cer": cer_errors / cer_chars if cer_chars else 0.0,
                    "critical_mismatches": _critical_mismatches(
                        entry["reference"], hypothesis, entry.get("critical_terms", {})
                    ),
                    "detected_language": getattr(info, "language", None),
                    "status": "success",
                }
            )
        except Exception as exc:  # Keep one failed clip from hiding other results.
            result.update({"status": "failed", "error": f"{type(exc).__name__}: {exc}"})
        result["duration_seconds"] = round(time.perf_counter() - started, 3)
        results.append(result)

    return {
        "model": model_name,
        "device": args.device,
        "compute_type": args.compute_type,
        "clip_count": len(entries),
        "successful_clips": sum(result.get("status") == "success" for result in results),
        "failed_clips": sum(result.get("status") == "failed" for result in results),
        "aggregate_note": "WER/CER are calculated from successful clips only; failed clips are excluded from the denominators and listed in results.",
        "wer": total_wer_errors / total_wer_words if total_wer_words else None,
        "cer": total_cer_errors / total_cer_chars if total_cer_chars else None,
        "results": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True, help="JSONL manifest path")
    parser.add_argument("--model", action="append", required=True, help="Model name; repeat to compare models")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--limit", type=int, default=None, help="Run only the first N manifest entries")
    parser.add_argument("--output", type=Path, help="Optional JSON output path")
    args = parser.parse_args()
    args.manifest = args.manifest.resolve()
    entries = _load_manifest(args.manifest)
    if args.limit is not None:
        entries = entries[: args.limit]
    report = {
        "manifest": str(args.manifest),
        "settings": {"device": args.device, "compute_type": args.compute_type},
        "models": [_run_model(model, entries, args) for model in args.model],
    }
    rendered = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
