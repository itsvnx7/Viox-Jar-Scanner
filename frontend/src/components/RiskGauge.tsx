interface Props {
  score: number
  severity: string
}

const severityColor: Record<string, string> = {
  low:      '#10b981',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444',
}

export default function RiskGauge({ score, severity }: Props) {
  const color = severityColor[severity] ?? '#6b7280'
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const dashOffset = circumference - progress

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#111" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500 uppercase tracking-widest">THREAT / 100</span>
        </div>
      </div>
      <span
        className="text-xs font-mono font-semibold tracking-widest uppercase px-3 py-1 rounded"
        style={{ color, backgroundColor: color + '22', border: `1px solid ${color}44` }}
      >
        {severity}
      </span>
    </div>
  )
}
