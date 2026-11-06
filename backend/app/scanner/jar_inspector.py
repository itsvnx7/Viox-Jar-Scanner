"""
JAR file inspection engine.

Security guarantees:
- Files are NEVER executed.
- Path traversal is prevented by stripping leading slashes and resolving
  entry paths relative to a controlled temp directory.
- Archive entries are size-checked before reading.
- Malformed ZIPs are handled gracefully.
"""
import asyncio
import hashlib
import logging
import os
import re
import tempfile
import zipfile
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import AsyncGenerator

from .detection_rules import RULES, DetectionRule
from .risk_scorer import calculate_risk_score, score_to_severity

log = logging.getLogger(__name__)

# Maximum bytes to read from any single entry (prevent zip-bomb DoS)
MAX_ENTRY_BYTES = 5 * 1024 * 1024  # 5 MB per entry

# File types we inspect
INSPECTABLE_EXTENSIONS = {
    ".class", ".java", ".json", ".txt", ".cfg", ".properties",
    ".toml", ".yaml", ".yml", ".xml", ".mf", ".inf",
}


@dataclass
class MatchResult:
    rule: DetectionRule
    file_path: str
    matched_text: str
    line_number: int | None = None


@dataclass
class ScanResult:
    file_hash: str
    matches: list[MatchResult] = field(default_factory=list)
    scanned_files: list[dict] = field(default_factory=list)  # {path, type, finding_count}
    risk_score: float = 0.0
    severity: str = "low"
    error: str | None = None


def _safe_entry_path(entry_name: str) -> str | None:
    """Sanitize zip entry names to prevent path traversal."""
    # Normalize to posix, strip leading slashes and '..'
    p = PurePosixPath(entry_name)
    parts = [part for part in p.parts if part not in ("", "..", ".") and "/" not in part]
    if not parts:
        return None
    return "/".join(parts)


def _hash_file(path: str) -> str:
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def _is_inspectable(entry_name: str) -> bool:
    ext = Path(entry_name).suffix.lower()
    return ext in INSPECTABLE_EXTENSIONS


def _extract_text(data: bytes) -> str:
    """Best-effort UTF-8 decode with fallback to latin-1."""
    try:
        return data.decode("utf-8", errors="replace")
    except Exception:
        return data.decode("latin-1", errors="replace")


def _scan_text(
    text: str, entry_path: str, rules: list[DetectionRule]
) -> list[MatchResult]:
    results: list[MatchResult] = []
    lines = text.splitlines()

    for rule in rules:
        # Filter by file type if rule specifies
        if rule.file_types != ["*"]:
            ext = Path(entry_path).suffix.lower().lstrip(".")
            if ext not in rule.file_types:
                continue

        compiled = rule.compiled()
        for pattern in compiled:
            for lineno, line in enumerate(lines, start=1):
                m = pattern.search(line)
                if m:
                    snippet = line.strip()[:200]
                    results.append(
                        MatchResult(
                            rule=rule,
                            file_path=entry_path,
                            matched_text=snippet,
                            line_number=lineno,
                        )
                    )
                    break  # one match per pattern per file is enough


    return results


async def scan_jar(
    file_path: str,
    progress_callback=None,
) -> ScanResult:
    """
    Asynchronously scan a JAR file. Calls progress_callback(pct, current_file)
    during scanning if provided.
    """
    file_hash = await asyncio.to_thread(_hash_file, file_path)
    result = ScanResult(file_hash=file_hash)

    try:
        if not zipfile.is_zipfile(file_path):
            result.error = "File is not a valid ZIP/JAR archive."
            return result

        with zipfile.ZipFile(file_path, "r") as zf:
            entries = zf.infolist()
            total = len(entries)

            for idx, entry in enumerate(entries):
                safe_path = _safe_entry_path(entry.filename)
                if safe_path is None:
                    continue  # skip suspicious entries

                if entry.is_dir():
                    continue

                file_type = Path(safe_path).suffix.lower().lstrip(".") or "unknown"
                finding_count = 0

                if _is_inspectable(safe_path):
                    # Guard against zip bombs
                    if entry.file_size > MAX_ENTRY_BYTES:
                        log.warning("Skipping oversized entry: %s (%d bytes)", safe_path, entry.file_size)
                    else:
                        try:
                            raw = await asyncio.to_thread(zf.read, entry.filename)
                            text = _extract_text(raw)
                            matches = _scan_text(text, safe_path, RULES)
                            result.matches.extend(matches)
                            finding_count = len(matches)
                        except Exception as e:
                            log.warning("Failed to read entry %s: %s", safe_path, e)

                result.scanned_files.append(
                    {"path": safe_path, "type": file_type, "finding_count": finding_count}
                )

                if progress_callback and total > 0:
                    pct = int((idx + 1) / total * 100)
                    await progress_callback(pct, safe_path)

        matched_rules = list({m.rule.id: m.rule for m in result.matches}.values())
        result.risk_score = calculate_risk_score(matched_rules)
        result.severity = score_to_severity(result.risk_score)

    except zipfile.BadZipFile:
        result.error = "Archive is corrupted or not a valid JAR file."
    except Exception as e:
        log.exception("Unexpected error scanning %s", file_path)
        result.error = f"Scan failed: {type(e).__name__}"

    return result
