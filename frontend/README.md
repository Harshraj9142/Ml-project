# CKD Risk Predictor - web app

Next.js 16 user interface for the project's two models. The models themselves run in the
Python API (`../api.py`); this app forwards every `/api/*` request to it (see `next.config.ts`).

| Page | Question | API calls |
|---|---|---|
| `/` - Part 1 · Diagnose CKD | Does the patient have CKD now? | `/api/meta`, `/api/predict` |
| `/future` - Part 2 · Future risk | Will the patient develop CKD stage 3-5 later? | `/api/future/meta`, `/api/future/predict` |

```bash
# 1. in the project folder: train both models once, then start the Python API
source .venv/bin/activate
python train.py && python future_ckd.py
uvicorn api:app --reload --port 8000

# 2. in this folder: start the web app
npm install      # first time only
npm run dev      # http://localhost:3000
```

| File | What it does |
|---|---|
| `src/app/layout.tsx` | Shared frame: the Part 1 / Part 2 tabs and the footer |
| `src/app/page.tsx` | Part 1 page |
| `src/app/future/page.tsx` | Part 2 page |
| `src/components/Nav.tsx` | The Part 1 / Part 2 tabs |
| `src/components/Predictor.tsx` | Loads a page's form from the API, holds the values, calls predict |
| `src/components/PatientForm.tsx` | The groups of input fields + example buttons + Predict |
| `src/components/ResultPanel.tsx` | The answer, the score bar, the model's test scores |
| `src/lib/api.ts` | The API calls and their data types |
| `src/app/globals.css` | Colours for light and dark mode |

Both pages use the same components; everything that differs (fields, labels, scores,
example patients) comes from the API. To point the app at an API somewhere else, set
`API_URL` (default `http://127.0.0.1:8000`).
