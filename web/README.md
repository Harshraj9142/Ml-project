# CKD Risk Predictor - web app

Next.js 16 user interface for the CKD model. The model itself runs in the Python
API (`../api.py`); this app forwards every `/api/*` request to it (see `next.config.ts`).

```bash
# 1. in the project folder: start the Python API
source .venv/bin/activate
uvicorn api:app --reload --port 8000

# 2. in this folder: start the web app
npm install      # first time only
npm run dev      # http://localhost:3000
```

| File | What it does |
|---|---|
| `src/app/page.tsx` | The page: title, the predictor, footer |
| `src/components/Predictor.tsx` | Loads the form from the API, holds the values, calls predict |
| `src/components/PatientForm.tsx` | The four groups of input fields + example buttons + Predict |
| `src/components/ResultPanel.tsx` | Likely / unlikely CKD, the probability bar, the model's test scores |
| `src/lib/api.ts` | The two API calls (`/api/meta`, `/api/predict`) and their data types |
| `src/app/globals.css` | Colours for light and dark mode |

To point the app at an API somewhere else, set `API_URL` (default `http://127.0.0.1:8000`).
