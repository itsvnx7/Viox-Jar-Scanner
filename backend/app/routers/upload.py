import asyncio
import logging
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import Finding, Scan, ScannedFile
from ..schemas import ScanOut, UploadResponse
from ..scanner.jar_inspector import scan_jar

router = APIRouter(prefix="/api", tags=["upload"])
log = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jar"}
_SAFE_FILENAME = re.compile(r"[^a-zA-Z0-9._\-]")


def _sanitize_filename(name: str) -> str:
    stem = Path(name).stem
    suffix = Path(name).suffix.lower()
    safe_stem = _SAFE_FILENAME.sub("_", stem)[:100]
    return safe_stem + suffix


@router.post("/upload", response_model=UploadResponse)
async def upload_mod(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, detail="Only .jar files are accepted.")

    # Read and validate size
    content = await file.read()
    if len(content) > settings.max_file_bytes:
        raise HTTPException(
            413,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB} MB.",
        )
    if len(content) < 4:
        raise HTTPException(400, detail="File is too small to be a valid JAR.")

    safe_name = _sanitize_filename(file.filename or "upload.jar")
    tmp_id = str(uuid.uuid4())
    tmp_path = os.path.join(settings.UPLOAD_DIR, f"{tmp_id}_{safe_name}")

    async with aiofiles.open(tmp_path, "wb") as f:
        await f.write(content)

    # Create a pending Scan record
    scan = Scan(
        filename=safe_name,
        file_size=len(content),
        file_hash="pending",
        status="scanning",
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    background_tasks.add_task(_run_scan, scan.id, tmp_path)

    return UploadResponse(scan_id=scan.id, message="Scan started.")


async def _run_scan(scan_id: str, tmp_path: str):
    from ..database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            result = await scan_jar(tmp_path)

            scan = await db.get(Scan, scan_id)
            if not scan:
                return

            scan.file_hash = result.file_hash
            scan.risk_score = result.risk_score
            scan.severity = result.severity
            scan.completed_at = datetime.utcnow()

            if result.error:
                scan.status = "failed"
                scan.error_message = result.error
            else:
                scan.status = "completed"

            # Deduplicate: one Finding per (rule, file_path)
            seen = set()
            for match in result.matches:
                key = (match.rule.id, match.file_path)
                if key in seen:
                    continue
                seen.add(key)
                db.add(
                    Finding(
                        scan_id=scan_id,
                        rule_id=match.rule.id,
                        rule_name=match.rule.name,
                        severity=match.rule.severity.value,
                        category=match.rule.category,
                        mitre_tactic=match.rule.mitre_tactic,
                        description=match.rule.description,
                        plain_english=match.rule.plain_english,
                        recommendation=match.rule.recommendation,
                        file_path=match.file_path,
                        matched_content=match.matched_text,
                        line_number=match.line_number,
                    )
                )

            for entry in result.scanned_files:
                db.add(
                    ScannedFile(
                        scan_id=scan_id,
                        entry_path=entry["path"],
                        file_type=entry["type"],
                        finding_count=entry["finding_count"],
                    )
                )

            await db.commit()

        except Exception:
            log.exception("Background scan failed for %s", scan_id)
            async with AsyncSessionLocal() as db2:
                s = await db2.get(Scan, scan_id)
                if s:
                    s.status = "failed"
                    s.error_message = "Internal scan error."
                    await db2.commit()
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
