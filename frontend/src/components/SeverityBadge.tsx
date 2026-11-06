import type { SeverityLevel } from '../types'

const CONFIG: Record<SeverityLevel, { label: string; classes: string; dot: string }> = {
  low:      { label: 'LOW',      classes: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50', dot: 'bg-emerald-400' },
  medium:   { label: 'MEDIUM',   classes: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50',   dot: 'bg-yellow-400' },
  high:     { label: 'HIGH',     classes: 'bg-purple-900/40 text-purple-300 border border-purple-700/50',   dot: 'bg-purple-400' },
  critical: { label: 'CRITICAL', classes: 'bg-red-900/40 text-red-300 border border-red-700/50',           dot: 'bg-red-500' },
}

interface Props {
  severity: SeverityLevel
  size?: 'sm' | 'md'
}

export default function SeverityBadge({ severity, size = 'md' }: Props) {
  const cfg = CONFIG[severity] ?? CONFIG.low
  const textSize = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded font-mono font-semibold tracking-wider ${textSize} ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
