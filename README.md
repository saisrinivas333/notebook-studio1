# Notebook Studio — Combined Platform

Heart Vitals + Fake Jobs Analysis in one Next.js app.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000  → auto-redirects to /vitals

## Pages

| Route | Description |
|---|---|
| `/vitals` | ❤ Heart Rate & SpO₂ — 8 interactive charts (upload CSV) |
| `/analysis` | 🔬 Statistical analysis, zone breakdown, anomaly detection, download report |
| `/ipynb/fake-jobs` | 💼 Fake Jobs tutorial — 8-step walkthrough + CSV upload |
| `/ipynb/fake-jobs/charts` | 📊 6 live job market charts — all update when you upload a CSV |

## Key fixes vs previous version

- `dynamic()` imports for all Chart.js components → fixes SSR/hydration chart rendering
- Centralized `chartSetup.js` → avoids duplicate registration crashes
- `mounted` state guard → charts only render after client hydration
- Fake jobs charts now pre-load with sample data (no blank screen)
- CSV upload on charts page refreshes all 6 charts live

## CSV Formats

**Heart CSV** — columns: `time` (optional), `hr`/`bpm`/`heartrate`, `spo2`/`o2`/`oxygen`

**Jobs CSV** — columns: `job_title`, `company`, `location`, `salary_min`, `salary_max`, `job_type`, `industry`, `experience_level`, `remote`

Sample files in `public/data/`.

## Deploy to Cloudflare Pages

- Build command: `npm run build`
- Output directory: `out`
