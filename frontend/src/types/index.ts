export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed'

export interface Finding {
  id: string
  rule_id: string
  rule_name: string
  severity: SeverityLevel
  category: string
  mitre_tactic: string | null
  description: string
  plain_english: string
  recommendation: string
  file_path: string
  matched_content: string | null
  line_number: number | null
}

export interface ScannedFile {
  entry_path: string
  file_type: string
  finding_count: number
}

export interface Scan {
  id: string
  filename: string
  file_size: number
  file_hash: string
  status: ScanStatus
  risk_score: number | null
  severity: SeverityLevel | null
  confidence?: number | null
  created_at: string
  completed_at: string | null
  error_message: string | null
  findings: Finding[]
  file_entries: ScannedFile[]
}

export interface ScanSummary {
  id: string
  filename: string
  file_size: number
  status: ScanStatus
  risk_score: number | null
  severity: SeverityLevel | null
  created_at: string
  completed_at: string | null
  finding_count: number
}

export interface ScanStatusResponse {
  scan_id: string
  status: ScanStatus
  risk_score: number | null
  severity: SeverityLevel | null
}
