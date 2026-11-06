import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import { listScans, deleteScan } from '../api/client'
import type { ScanSummary } from '../types'
import SeverityBadge from './SeverityBadge'

interface Props {
  onSelectScan: (id: string) => void
  refreshTrigger?: number
}

const statusDot: Record<string, string> = {
  completed: 'bg-emerald-500',
  scanning:  'bg-purple-500 animate-pulse',
  pending:   'bg-gray-700',
  failed:    'bg-red-500',
}

export default function ScanHistory({ onSelectScan, refreshTrigger }: Props) {
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setScans(await listScans())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refreshTrigger])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteScan(id)
    setScans(s => s.filter(x => x.id !== id))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="w-4 h-4 text-gray-800 animate-spin" />
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="py-10 text-center text-gray-700 text-sm">
        No scans yet.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-600 uppercase tracking-wide">History ({scans.length})</span>
        <button onClick={load} className="text-gray-700 hover:text-gray-500 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {scans.map(scan => (
        <div
          key={scan.id}
          onClick={() => scan.status === 'completed' && onSelectScan(scan.id)}
          className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-900 transition-colors ${
            scan.status === 'completed' ? 'cursor-pointer hover:border-gray-800 hover:bg-white/[0.02]' : 'cursor-default'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[scan.status] ?? 'bg-gray-700'}`} />

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">{scan.filename}</p>
            <p className="text-xs text-gray-700">
              {formatDistanceToNow(new Date(scan.created_at))} ago
              {scan.finding_count > 0 && ` · ${scan.finding_count}`}
            </p>
          </div>

          {scan.severity && scan.status === 'completed' && (
            <SeverityBadge severity={scan.severity} size="sm" />
          )}
          {scan.status === 'scanning' && (
            <span className="text-xs text-purple-700">scanning…</span>
          )}
          {scan.status === 'failed' && (
            <span className="text-xs text-red-700">failed</span>
          )}

          <button
            onClick={e => handleDelete(e, scan.id)}
            className="text-gray-800 hover:text-red-700 transition-colors p-0.5 -mr-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
