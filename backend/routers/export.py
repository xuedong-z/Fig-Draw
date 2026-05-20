from fastapi import APIRouter, HTTPException

from models.schemas import ExportRequest, ExportResponse
from services.figure_composer import compose_figure

router = APIRouter(prefix="/api/export", tags=["export"])


@router.post("", response_model=ExportResponse)
def export_figure(request: ExportRequest):
    try:
        file_data, mime_type = compose_figure(request.panels, request.settings)
        return ExportResponse(file=file_data, mime_type=mime_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Figure export failed: {exc}") from exc
