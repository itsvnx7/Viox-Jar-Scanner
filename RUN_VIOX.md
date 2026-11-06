# Viox Jar Scanner — by Lawin

A purple Minecraft-inspired desktop-style interface for static inspection of Minecraft `.jar` mods.

## Run locally

### 1. Backend (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (new terminal)
```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://127.0.0.1:8000**.

The dashboard counters are live: they refresh every five seconds from the backend database and update after a completed scan. The background artwork is bundled locally in `frontend/public/viox-world-bg.png`.

## Important
- Uploads are limited to `.jar` files up to 50 MB.
- The scanner performs static analysis and does not execute uploaded JAR files.
- Findings are indicators for review, not proof that a mod is malicious. A clean scan is not a guarantee of safety.
