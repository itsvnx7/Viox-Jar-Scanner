import { useState } from 'react'
import {
  ShieldX, ShieldCheck, ChevronDown, ChevronUp,
  FileCode2, AlertTriangle, Info, Lightbulb, Tag, Hash
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Scan, Finding, SeverityLevel } from '../types'
import SeverityBadge from './SeverityBadge'
import RiskGauge from './RiskGauge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  scan: Scan
  onReset: () => void
}

const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low']
const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-900 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <SeverityBadge severity={finding.severity} size="sm" />
        <span className="flex-1 font-medium text-gray-300 text-sm">{finding.rule_name}</span>
        <span className="text-xs text-gray-700 font-mono hidden sm:block truncate max-w-[200px]">{finding.file_path}</span>
        <span className="text-xs text-gray-700 ml-2 flex-shrink-0">{finding.category}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-900 p-4 space-y-4 bg-[#080808]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">What this means</p>
                  <p className="text-gray-400">{finding.plain_english}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">Action</p>
                  <p className="text-gray-400">{finding.recommendation}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Tag className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">MITRE ATT&CK</p>
                  <p className="text-gray-500 font-mono text-xs">{finding.mitre_tactic ?? 'N/A'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <FileCode2 className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">File</p>
                  <p className="text-purple-600 font-mono text-xs break-all">{finding.file_path}</p>
                  {finding.line_number && <p className="text-gray-700 text-xs">line {finding.line_number}</p>}
                </div>
              </div>
              {finding.matched_content && (
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">Match</p>
                  <code className="block bg-black border border-gray-900 rounded p-2 text-xs text-purple-400 font-mono break-all">
                    {finding.matched_content}
                  </code>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-800 border-t border-gray-900 pt-3">
            <Hash className="w-3 h-3" />
            <span className="font-mono">{finding.rule_id}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScanResults({ scan, onReset }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const findings = scan.findings ?? []
  const score = scan.risk_score ?? 0
  const severity = scan.severity ?? 'low'
  const isSafe = findings.length === 0 && scan.status === 'completed'

  const severityCounts = SEVERITY_ORDER.map(s => ({
    name: s.toUpperCase(),
    count: findings.filter(f => f.severity === s).length,
    color: SEVERITY_COLOR[s],
  })).filter(d => d.count > 0)

  const categories = [...new Set(findings.map(f => f.category))]

  const filtered = findings.filter(f => {
    const catOk = categoryFilter === 'all' || f.category === categoryFilter
    const sevOk = severityFilter === 'all' || f.severity === severityFilter
    return catOk && sevOk
  })

  const sortedFindings = [...filtered].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )

  return (
    <div className="w-full max-w-5xl space-y-4">
      {/* Header */}
      <div className="bg-[#0f0f0f] border border-gray-900 rounded-xl p-5">
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
          <RiskGauge score={Math.round(score)} severity={severity} />

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              {isSafe
                ? <ShieldCheck className="w-4 h-4 text-emerald-500" />
                : <ShieldX className="w-4 h-4 text-red-500" />}
              <span className="font-semibold text-gray-200 break-all">{scan.filename}</span>
            </div>

            {isSafe
              ? <p className="text-emerald-500 text-sm">No threats detected.</p>
              : <p className="text-red-400 text-sm">{findings.length} indicator{findings.length !== 1 ? 's' : ''} found · review evidence before deciding</p>
            }

            <div className="flex flex-wrap gap-3 text-xs text-gray-700 font-mono pt-0.5">
              <span>{scan.file_hash.slice(0, 16)}…</span>
              <span>Confidence: {scan.confidence ?? 0}%</span>
              <span>{(scan.file_size / 1024).toFixed(1)} KB</span>
              <span>{scan.file_entries?.length ?? 0} files</span>
              {scan.completed_at && <span>{formatDistanceToNow(new Date(scan.completed_at))} ago</span>}
            </div>
            <p className="text-xs text-gray-500 pt-2">Threat score is a heuristic, not a malware probability. Confidence describes how specific the detected evidence is.</p>
          </div>

          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600 text-sm transition-colors"
          >
            Scan another
          </button>
        </div>
      </div>

      {/* Charts */}
      {findings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0f0f0f] border border-gray-900 rounded-xl p-5">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-4">Findings by Severity</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={severityCounts} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1f2937', borderRadius: 6 }}
                  labelStyle={{ color: '#6b7280' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {severityCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0f0f0f] border border-gray-900 rounded-xl p-5">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-4">By Category</p>
            <div className="space-y-2">
              {categories.map(cat => {
                const cnt = findings.filter(f => f.category === cat).length
                const maxCnt = Math.max(...categories.map(c => findings.filter(f => f.category === c).length))
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-32 truncate">{cat}</span>
                    <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(cnt / maxCnt) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-700 w-3 text-right">{cnt}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <div className="bg-[#0f0f0f] border border-gray-900 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <span className="text-xs text-gray-600 uppercase tracking-wide flex-1">
              Indicators ({sortedFindings.length})
            </span>
            <div className="flex gap-2">
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="text-xs bg-black border border-gray-800 rounded px-2 py-1.5 text-gray-500 focus:outline-none focus:border-purple-800"
              >
                <option value="all">All severities</option>
                {SEVERITY_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs bg-black border border-gray-800 rounded px-2 py-1.5 text-gray-500 focus:outline-none focus:border-purple-800"
              >
                <option value="all">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            {sortedFindings.map(f => <FindingCard key={f.id} finding={f} />)}
            {sortedFindings.length === 0 && (
              <p className="text-center text-gray-700 py-8">No findings match the filters.</p>
            )}
          </div>
        </div>
      )}

      {isSafe && (
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-5 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-600 text-sm">No known threats found. Still, only use mods from trusted sources.</p>
        </div>
      )}

      {scan.status === 'failed' && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{scan.error_message ?? 'Scan failed.'}</p>
        </div>
      )}
    </div>
  )
}
