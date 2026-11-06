# Viox Jar Scanner

**Made by Lawin**

A purple-themed Minecraft mod security scanner. The interface is branded Viox Jar Scanner; the backend analysis engine remains the original rule-based static scanner.

Scan Minecraft `.jar` mods for malware without running them. Detects RATs, Discord token stealers, session grabbers, and other common threats targeting players.

Built with FastAPI + React.

---

## What it checks for

- Discord webhook exfiltration
- Minecraft / Discord token theft
- Browser credential database access
- PowerShell / command execution
- Base64 payloads and obfuscated code
- Known Java obfuscators (Skidfuscator, Allatori, etc.)
- Keyloggers, clipboard hijacking, screen capture
- Hypixel API key theft
- Windows registry / persistence mechanisms
- Direct IP socket connections

Each finding includes a plain-English explanation, MITRE ATT&CK category, the file it was found in, and what to do about it.

---

## Stack

- **Backend** — FastAPI, SQLAlchemy, SQLite, aiosqlite
- **Frontend** — React, Vite, Tailwind CSS, Recharts
- **Analysis** — Regex-based static rules, no sandboxing or execution

---

## Setup

**Requirements:** Python 3.11+, Node.js 18+

**Backend**
```powershell
cd backend
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal)
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Security notes

- Uploaded files are never executed
- Temp files are deleted after the scan completes
- ZIP entries are path-sanitized to prevent traversal
- Entries over 5 MB are skipped (zip bomb protection)
- Only `.jar` files accepted, max 50 MB

---

## Adding detection rules

Rules live in `backend/app/scanner/detection_rules.py`. Each rule is a `DetectionRule` with regex patterns, severity, MITRE tactic, and user-facing descriptions. Risk score is additive and capped at 100.

| Score | Severity |
|-------|----------|
| 0–19  | Low      |
| 20–44 | Medium   |
| 45–69 | High     |
| 70+   | Critical |


## Important analysis limitations

This project uses static, rule-based analysis. Findings are indicators and can include false positives; a clean result does not guarantee a mod is safe. Uploaded JAR files are not executed by the scanner. Review the matched evidence and source context before treating a finding as malware.
