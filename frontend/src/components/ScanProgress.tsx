import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getScanStatus, getScan } from '../api/client'
import type { Scan, ScanStatus } from '../types'

interface Props {
  scanId: string
  onComplete: (scan: Scan) => void
}

const POLL_MS = 1500

export default function ScanProgress({ scanId, onComplete }: Props) {
  const [status, setStatus] = useState<ScanStatus>('scanning')
  const [dots, setDots] = useState('.')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const dotTimer = setInterval(() => setDots(d => (d.length >= 3 ? '.' : d + '.')), 500)
    return () => clearInterval(dotTimer)
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const s = await getScanStatus(scanId)
        setStatus(s.status)
        if (s.status === 'completed' || s.status === 'failed') {
          clearInterval(intervalRef.current!)
          const full = await getScan(scanId)
          onComplete(full)
        }
      } catch {
        // keep polling on transient errors
      }
    }, POLL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [scanId, onComplete])

  const stages = [
    { label: 'File received', done: true },
    { label: 'Extracting archive', done: status !== 'pending' },
    { label: 'Scanning entries', done: status === 'completed' || status === 'failed' },
    { label: 'Calculating risk score', done: status === 'completed' || status === 'failed' },
  ]

  return (
    <div className="w-full max-w-2xl bg-[#0f0f0f] border border-gray-900 rounded-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
        <span className="text-gray-300 font-medium">Scanning{dots}</span>
      </div>

      <div className="space-y-3">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                stage.done ? 'border-purple-500 bg-purple-500' : 'border-gray-800 bg-transparent'
              }`}
            >
              {stage.done && (
                <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${stage.done ? 'text-gray-400' : 'text-gray-700'}`}>{stage.label}</span>
            {!stage.done && i === stages.findIndex(s => !s.done) && (
              <span className="text-xs text-purple-600 animate-scan-pulse">running</span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-800 font-mono">{scanId}</p>
    </div>
  )
}
