from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import export, plot, upload

app = FastAPI(title="Scientific Figure Studio API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(plot.router)
app.include_router(export.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
