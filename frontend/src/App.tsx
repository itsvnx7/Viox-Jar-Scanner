import { useState, useCallback, useEffect } from 'react'
import {
  Shield, Search, History, ShieldCheck, BarChart3,
  Settings, Info, Crown, Layers, AlertTriangle, Sparkles, Upload
} from 'lucide-react'
import FileUpload from './components/FileUpload'
import ScanProgress from './components/ScanProgress'
import ScanResults from './components/ScanResults'
import ScanHistory from './components/ScanHistory'
import type { Scan } from './types'
import { getDashboardStats } from './api/client'

type View = 'upload' | 'scanning' | 'results'
type Section = 'scan' | 'history' | 'rules' | 'stats' | 'settings' | 'about'

const checks = [
  'RATs and remote access tools',
  'Discord token stealers',
  'Minecraft session / account grabbers',
  'Hypixel API key theft',
  'Command execution (CMD / PowerShell)',
  'Base64 payloads and obfuscation',
  'Keyloggers, clipboard hijacking, screen capture',
  'Browser credential database access',
  'Windows registry / persistence',
  'Direct IP socket connections',
]

export default function App() {
  const [view, setView] = useState<View>('upload')
  const [section, setSection] = useState<Section>('scan')
  const [activeScanId, setActiveScanId] = useState<string | null>(null)
  const [completedScan, setCompletedScan] = useState<Scan | null>(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [scanStats, setScanStats] = useState({ scans_today: 0, total_scans: 0, threat_indicators: 0, flagged_scan_rate: 0 })

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try { const stats = await getDashboardStats(); if (alive) setScanStats(stats) } catch { /* API may be offline while the UI is open */ }
    }
    refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [historyRefresh])


  const handleScanStarted = (scanId: string) => {
    setActiveScanId(scanId)
    setSection('scan')
    setView('scanning')
  }

  const handleScanComplete = useCallback((scan: Scan) => {
    setCompletedScan(scan)
    setHistoryRefresh(n => n + 1)
    setView('results')
  }, [])

  const handleReset = () => {
    setView('upload')
    setSection('scan')
    setActiveScanId(null)
    setCompletedScan(null)
    setHistoryRefresh(n => n + 1)
  }

  const handleSelectHistoryScan = async (id: string) => {
    const { getScan } = await import('./api/client')
    const scan = await getScan(id)
    setCompletedScan(scan)
    setSection('scan')
    setView('results')
  }

  const nav = [
    { id: 'scan' as const, label: 'Scan Mod', icon: Search },
    { id: 'history' as const, label: 'Scan History', icon: History },
    { id: 'rules' as const, label: 'Detection Rules', icon: ShieldCheck },
    { id: 'stats' as const, label: 'Statistics', icon: BarChart3 },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'about' as const, label: 'About', icon: Info },
  ]

  return (
    <div className="viox-shell min-h-screen text-gray-100">
      <aside className="viox-sidebar">
        <div className="brand-lockup">
          <div className="brand-icon"><img src="/viox-mark.svg" alt="" /></div>
          <div><div className="brand-name">Viox Jar Scanner</div><div className="brand-subtitle">Minecraft Mod Security Scanner</div></div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {nav.map(item => {
            const Icon = item.icon
            return <button key={item.id} onClick={() => { setSection(item.id); if (item.id === 'scan') setView(completedScan ? 'results' : 'upload') }} className={`nav-item ${section === item.id ? 'active' : ''}`}>
              <Icon size={19} /><span>{item.label}</span>
            </button>
          })}
        </nav>
        <div className="sidebar-credit"><Crown size={17} /> <span>Made by <b>Lawin</b></span></div>
      </aside>

      <main className="viox-main">
        <header className="topbar">
          <div className="mobile-brand"><img src="/viox-mark.svg" alt="" /> Viox Jar Scanner</div>
          <div className="topbar-status"><span className="status-dot" /> Scanner online · Static analysis only</div>
          <div className="topbar-credit"><Crown size={14} /> Made by <b>Lawin</b></div>
        </header>

        {section === 'scan' && <>
          {view === 'upload' && <section className="hero">
            <div className="hero-content">
              <div className="hero-cube"><img src="/viox-mark.svg" alt="" /></div>
              <div className="eyebrow"><Sparkles size={14}/> MINECRAFT MOD SECURITY</div>
              <h1><span>Viox</span> Jar Scanner</h1>
              <p>Advanced Minecraft Mod Malware Scanner</p>
              <div className="made-pill"><Crown size={15}/> Made by <b>Lawin</b></div>
            </div>
          </section>}

          <div className="content-grid">
            <section className="primary-panel upload-panel">
              {view === 'upload' && <>
                <div className="upload-intro"><div className="upload-symbol"><Upload size={30}/></div><h2>Drop your <em>.jar</em> mod here</h2><p>or click to browse</p></div>
                <div className="upload-pills"><span><Layers size={15}/> .jar only</span><span><Layers size={15}/> Max 50 MB</span><span><ShieldCheck size={15}/> Static Analysis (No Execution)</span></div>
                <FileUpload onScanStarted={handleScanStarted}/>
              </>}
              {view === 'scanning' && activeScanId && <ScanProgress scanId={activeScanId} onComplete={handleScanComplete}/>}
              {view === 'results' && completedScan && <ScanResults scan={completedScan} onReset={handleReset}/>}
            </section>

            <aside className="checks-panel">
              <div className="checks-title"><Shield size={21}/><h2>What it checks for</h2></div>
              <ul>{checks.map(check => <li key={check}><span className="check-dot">✓</span>{check}</li>)}</ul>
              <div className="checks-foot">Static rules · Results need human review</div>
            </aside>
          </div>
          {view === 'upload' && <section className="stats-grid live-stats">
            <div className="stat-card"><ShieldCheck/><strong>{scanStats.scans_today}</strong><span>Scans Today</span></div>
            <div className="stat-card"><Layers/><strong>{scanStats.total_scans}</strong><span>Total Scans</span></div>
            <div className="stat-card"><AlertTriangle/><strong>{scanStats.threat_indicators}</strong><span>Threats Found</span></div>
            <div className="stat-card"><BarChart3/><strong>{scanStats.flagged_scan_rate}%</strong><span>Detection Rate</span></div>
          </section>}
          {view === 'upload' && <div className="live-note"><span className="status-dot"/> Dashboard metrics refresh automatically from your scan history.</div>}
        </>}
        {section === 'history' && <section className="page-panel"><div className="section-heading"><div><h1>Scan History</h1><p>Review previous mod scans.</p></div><History className="section-large-icon"/></div><ScanHistory onSelectScan={handleSelectHistoryScan} refreshTrigger={historyRefresh}/></section>}
        {section === 'rules' && <section className="page-panel"><div className="section-heading"><div><h1>Detection Rules</h1><p>Threat categories inspected by the static scanner.</p></div><ShieldCheck className="section-large-icon"/></div><div className="rule-grid">{checks.map((c,i)=><div className="rule-card" key={c}><span>0{i+1}</span><b>{c}</b><small>Static indicator · Requires context review</small></div>)}</div></section>}
        {section === 'stats' && <section className="page-panel"><div className="section-heading"><div><h1>Statistics</h1><p>Scanner capabilities and limits.</p></div><BarChart3 className="section-large-icon"/></div><div className="stats-grid"><div className="stat-card"><ShieldCheck/><strong>50 MB</strong><span>Maximum JAR size</span></div><div className="stat-card"><Layers/><strong>5 MB</strong><span>Per-entry inspection limit</span></div><div className="stat-card"><AlertTriangle/><strong>Static</strong><span>No sandbox execution</span></div><div className="stat-card"><Search/><strong>Regex</strong><span>Rule-based analysis</span></div></div><p className="disclaimer">A clean scan does not prove a mod is safe. Static signatures can produce false positives and may miss obfuscated threats.</p></section>}
        {section === 'settings' && <section className="page-panel"><div className="section-heading"><div><h1>Settings</h1><p>Viox Jar Scanner appearance and scan information.</p></div><Settings className="section-large-icon"/></div><div className="settings-row"><div><b>Appearance</b><small>Viox Purple theme</small></div><span className="theme-chip">● Purple / Violet</span></div><div className="settings-row"><div><b>Scan mode</b><small>Files are inspected without being executed.</small></div><span className="theme-chip">Static analysis</span></div><div className="settings-row"><div><b>Upload limit</b><small>Maximum supported JAR file size.</small></div><span className="theme-chip">50 MB</span></div></section>}
        {section === 'about' && <section className="page-panel about-panel"><div className="section-heading"><div><h1>About Viox</h1><p>A Minecraft mod security scanner.</p></div><Info className="section-large-icon"/></div><img className="showcase-image" src="/viox-dashboard-concept.png" alt="Viox Jar Scanner purple dashboard concept"/><div className="about-credit"><Crown/> <span>Designed and branded by <b>Lawin</b></span></div><p className="disclaimer">Viox performs static analysis only. It does not execute uploaded JAR files. Findings are indicators, not proof of malware.</p></section>}
        <footer className="footer"><span>VIOX JAR SCANNER</span><span>Made with care by <b>Lawin</b></span></footer>
      </main>
    </div>
  )
}
