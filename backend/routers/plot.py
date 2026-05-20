from fastapi import APIRouter, HTTPException, Response

from models.schemas import PlotRequest, PlotResponse, SemanticPlotRequest
from services.data_store import get_dataset
from services.plot_generator import generate_plot, generate_semantic_plot, generate_template_preview
from services.template_loader import load_journal_presets, load_reference_templates

router = APIRouter(prefix="/api", tags=["plot"])


@router.get("/reference-templates")
def reference_templates():
    return load_reference_templates()


@router.get("/reference-templates/{template_id}/preview")
def reference_template_preview(template_id: str):
    try:
        return Response(content=generate_template_preview(template_id), media_type="image/png")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc).strip("'")) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reference preview generation failed: {exc}") from exc


@router.get("/journal-presets")
def journal_presets():
    return load_journal_presets()


@router.post("/plot", response_model=PlotResponse)
def create_plot(request: PlotRequest):
    try:
        dataset = get_dataset(request.dataset_id)
        image, warnings = generate_plot(
            dataset.dataframe,
            request.mapping,
            request.plot_type,
            request.template_id,
            request.style,
            request.dpi,
        )
        return PlotResponse(image=image, warnings=warnings)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc).strip("'")) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Plot generation failed: {exc}") from exc


@router.post("/plot/semantic", response_model=PlotResponse)
def create_semantic_plot(request: SemanticPlotRequest):
    try:
        dataset = get_dataset(request.uploaded_data_id)
        image, warnings = generate_semantic_plot(
            dataset.dataframe,
            request.selected_template_id,
            request.semantic_column_mapping,
            request.style_overrides,
            request.quick_control_settings,
            request.style_overrides.dpi or request.dpi,
        )
        return PlotResponse(image=image, warnings=warnings)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc).strip("'")) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Template-driven plot generation failed: {exc}") from exc
