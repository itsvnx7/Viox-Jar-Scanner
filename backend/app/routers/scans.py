from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Finding, Scan
from ..schemas import ScanOut, ScanSummary
from ..scanner.risk_scorer import calculate_confidence

router = APIRouter(prefix="/api", tags=["scans"])




@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    start_of_day = datetime(now.year, now.month, now.day)
    total_scans = (await db.execute(select(func.count(Scan.id)))).scalar_one()
    scans_today = (await db.execute(select(func.count(Scan.id)).where(Scan.created_at >= start_of_day))).scalar_one()
    threat_indicators = (await db.execute(select(func.count(Finding.id)))).scalar_one()
    flagged_scans = (await db.execute(select(func.count(func.distinct(Finding.scan_id))))).scalar_one()
    return {
        "scans_today": scans_today,
        "total_scans": total_scans,
        "threat_indicators": threat_indicators,
        "flagged_scans": flagged_scans,
        "flagged_scan_rate": round((flagged_scans / total_scans) * 100) if total_scans else 0,
    }

@router.get("/scans", response_model=list[ScanSummary])
async def list_scans(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Scan, func.count(Finding.id).label("finding_count"))
        .outerjoin(Finding, Finding.scan_id == Scan.id)
        .group_by(Scan.id)
        .order_by(Scan.created_at.desc())
        .limit(50)
    )
    rows = (await db.execute(stmt)).all()
    results = []
    for scan, finding_count in rows:
        summary = ScanSummary.model_validate(scan)
        summary.finding_count = finding_count
        results.append(summary)
    return results


@router.get("/scans/{scan_id}", response_model=ScanOut)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Scan)
        .where(Scan.id == scan_id)
        .options(
            selectinload(Scan.findings),
            selectinload(Scan.file_entries),
        )
    )
    scan = (await db.execute(stmt)).scalar_one_or_none()
    if not scan:
        raise HTTPException(404, detail="Scan not found.")
    response = ScanOut.model_validate(scan)
    response.confidence = calculate_confidence(scan.findings)
    return response


@router.delete("/scans/{scan_id}", status_code=204)
async def delete_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    scan = await db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(404, detail="Scan not found.")
    await db.delete(scan)
    await db.commit()


@router.get("/scans/{scan_id}/status")
async def get_scan_status(scan_id: str, db: AsyncSession = Depends(get_db)):
    scan = await db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(404, detail="Scan not found.")
    return {
        "scan_id": scan.id,
        "status": scan.status,
        "risk_score": scan.risk_score,
        "severity": scan.severity,
    }
