import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(255))
    file_size: Mapped[int] = mapped_column(Integer)
    file_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | scanning | completed | failed
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # low | medium | high | critical
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    findings: Mapped[list["Finding"]] = relationship(
        "Finding", back_populates="scan", cascade="all, delete-orphan"
    )
    file_entries: Mapped[list["ScannedFile"]] = relationship(
        "ScannedFile", back_populates="scan", cascade="all, delete-orphan"
    )


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scans.id"))
    rule_id: Mapped[str] = mapped_column(String(100))
    rule_name: Mapped[str] = mapped_column(String(200))
    severity: Mapped[str] = mapped_column(String(20))
    category: Mapped[str] = mapped_column(String(100))
    mitre_tactic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    plain_english: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(500))
    matched_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    line_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    scan: Mapped["Scan"] = relationship("Scan", back_populates="findings")


class ScannedFile(Base):
    __tablename__ = "scanned_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scans.id"))
    entry_path: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(50))
    finding_count: Mapped[int] = mapped_column(Integer, default=0)

    scan: Mapped["Scan"] = relationship("Scan", back_populates="file_entries")
