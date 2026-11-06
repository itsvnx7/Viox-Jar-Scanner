import axios from 'axios'
import type { Scan, ScanSummary, ScanStatusResponse } from '../types'

const api = axios.create({ baseURL: '/api' })

export async function uploadMod(file: File): Promise<{ scan_id: string }> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getScanStatus(scanId: string): Promise<ScanStatusResponse> {
  const { data } = await api.get(`/scans/${scanId}/status`)
  return data
}

export async function getScan(scanId: string): Promise<Scan> {
  const { data } = await api.get(`/scans/${scanId}`)
  return data
}

export async function listScans(): Promise<ScanSummary[]> {
  const { data } = await api.get('/scans')
  return data
}

export async function deleteScan(scanId: string): Promise<void> {
  await api.delete(`/scans/${scanId}`)
}


export interface DashboardStats {
  scans_today: number
  total_scans: number
  threat_indicators: number
  flagged_scans: number
  flagged_scan_rate: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/stats')
  return data
}
