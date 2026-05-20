from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DataMapping(BaseModel):
    x: Optional[str] = None
    y: Optional[str] = None
    group: Optional[str] = None
    error: Optional[str] = None
    second_y: Optional[str] = None


class StyleSettings(BaseModel):
    figure_width: Optional[float] = None
    figure_height: Optional[float] = None
    font_family: Optional[str] = None
    font_size: Optional[float] = None
    axis_label_size: Optional[float] = None
    tick_size: Optional[float] = None
    line_width: Optional[float] = None
    marker_size: Optional[float] = None
    axis_line_width: Optional[float] = None
    tick_width: Optional[float] = None
    color_palette: Optional[str] = None
    legend_position: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    second_y_label: Optional[str] = None
    title: Optional[str] = None
    x_range: Optional[List[Optional[float]]] = None
    y_range: Optional[List[Optional[float]]] = None
    show_grid: Optional[bool] = None
    show_legend: Optional[bool] = None


class PlotRequest(BaseModel):
    dataset_id: str
    mapping: DataMapping
    plot_type: str
    template_id: str
    style: StyleSettings = Field(default_factory=StyleSettings)
    dpi: int = 300


class SemanticStyleOverrides(BaseModel):
    x_label: Optional[str] = None
    left_y_label: Optional[str] = None
    right_y_label: Optional[str] = None
    title: Optional[str] = None
    line_width: Optional[float] = None
    marker_size: Optional[float] = None
    font_size: Optional[float] = None
    axis_label_size: Optional[float] = None
    tick_size: Optional[float] = None
    axis_line_width: Optional[float] = None
    tick_width: Optional[float] = None
    figure_width: Optional[float] = None
    figure_height: Optional[float] = None
    x_range: Optional[List[Optional[float]]] = None
    left_y_range: Optional[List[Optional[float]]] = None
    right_y_range: Optional[List[Optional[float]]] = None
    dpi: Optional[int] = None


class QuickControlSettings(BaseModel):
    show_ce: bool = True
    show_markers: bool = True
    legend_position: Optional[str] = None
    palette: Optional[str] = None
    normalize_retention: bool = False
    show_retention_annotation: bool = False


class SemanticPlotRequest(BaseModel):
    selected_template_id: str
    uploaded_data_id: str
    semantic_column_mapping: Dict[str, Optional[str]]
    style_overrides: SemanticStyleOverrides = Field(default_factory=SemanticStyleOverrides)
    quick_control_settings: QuickControlSettings = Field(default_factory=QuickControlSettings)
    dpi: int = 300


class TableDatasetRequest(BaseModel):
    filename: str = "edited-table.csv"
    rows: List[Dict[str, Any]]


class PlotResponse(BaseModel):
    image: str
    warnings: List[str] = Field(default_factory=list)


class SavedPlotPayload(BaseModel):
    label: str
    image: str


class ComposerSettings(BaseModel):
    layout: str = "2x2"
    journal_preset_id: str = "nature_double"
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    dpi: int = 300
    font_family: str = "Arial"
    font_size: float = 8
    panel_label_size: float = 10
    panel_label_bold: bool = True
    panel_label_position: str = "top-left"
    all_axis_line_width: Optional[float] = None
    all_line_width: Optional[float] = None
    all_tick_width: Optional[float] = None
    horizontal_gap: float = 6
    vertical_gap: float = 6
    outer_margin: float = 8
    output_format: str = "png"


class ExportRequest(BaseModel):
    panels: List[Optional[SavedPlotPayload]]
    settings: ComposerSettings


class ExportResponse(BaseModel):
    file: str
    mime_type: str
