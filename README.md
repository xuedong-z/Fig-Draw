# Scientific Figure Studio

MVP v0.1 for reference-based scientific plotting and multi-panel paper figure composition.

## Modules

- `backend/`: FastAPI API for data upload, parsing, matplotlib plot generation, reference templates, journal presets, and PNG/PDF figure export.
- `frontend/`: Next.js + React + TypeScript + Tailwind UI for Plot Studio and Figure Composer.

## Easiest Start For Non-Programmers

On Windows, double-click:

```text
Start Scientific Figure Studio.bat
```

The first launch may take several minutes because it automatically prepares portable Node.js, a Python virtual environment, backend dependencies, and frontend dependencies. After that it opens:

```text
http://127.0.0.1:3000
```

When finished, double-click:

```text
Stop Scientific Figure Studio.bat
```

If the app is already running, `Open Scientific Figure Studio.url` opens it in the browser.

## Developer Run Backend

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Test Flow

1. Open Plot Studio.
2. Choose `Battery & Electrochemistry` -> `Long cycling plot`.
3. Select a reference template, such as `Nature-style dual-axis long cycling comparison`.
4. Review the required semantic columns and download the example CSV if needed.
5. Upload `backend/sample_data/long_cycling_example.csv`.
6. Confirm template-aware mapping: `cycle`, `sample`, `capacity`, and optional `coulombic_efficiency`.
7. Generate the publication-style plot, adjust quick controls, and save it as Plot A-D.
8. Open Figure Composer, assign saved plots to panels, and export PNG or PDF.
