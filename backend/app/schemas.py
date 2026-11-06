from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FindingOut(BaseModel):
    id: str
    rule_id: str
    rule_name: str
    severity: str
    category: str
    mitre_tactic: Optional[str]
    description: str
    plain_english: str
    recommendation: str
    file_path: str
    matched_content: Optional[str]
    line_number: Optional[int]

    model_config = {"from_attributes": True}


class ScannedFileOut(BaseModel):
    entry_path: str
    file_type: str
    finding_count: int

    model_config = {"from_attributes": True}


class ScanOut(BaseModel):
    id: str
    filename: str
    file_size: int
    file_hash: str
    status: str
    risk_score: Optional[float]
    severity: Optional[str]
    confidence: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]
    findings: list[FindingOut] = []
    file_entries: list[ScannedFileOut] = []

    model_config = {"from_attributes": True}


class ScanSummary(BaseModel):
    id: str
    filename: str
    file_size: int
    status: str
    risk_score: Optional[float]
    severity: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    finding_count: int = 0

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    scan_id: str
    message: str


class ScanProgress(BaseModel):
    scan_id: str
    status: str
    progress: int
    current_file: Optional[str] = None
