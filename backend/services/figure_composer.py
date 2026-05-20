from __future__ import annotations

import base64
from io import BytesIO
from typing import List, Optional, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.image as mpimg
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

from models.schemas import ComposerSettings, SavedPlotPayload
from services.template_loader import load_journal_presets


def _decode_image(image_data: str):
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    return mpimg.imread(BytesIO(base64.b64decode(image_data)))


def _layout_shape(layout: str) -> Tuple[int, int]:
    rows, cols = layout.lower().split("x")
    return int(rows.strip()), int(cols.strip())


def _preset_size(settings: ComposerSettings) -> Tuple[float, float]:
    width_mm = settings.width_mm
    height_mm = settings.height_mm
    if not width_mm:
        for preset in load_journal_presets():
            if preset["id"] == settings.journal_preset_id:
                width_mm = preset["width_mm"]
                height_mm = preset.get("height_mm") or width_mm * 0.72
                break
    width_mm = width_mm or 183
    height_mm = height_mm or width_mm * 0.72
    return width_mm / 25.4, height_mm / 25.4


def compose_figure(panels: List[Optional[SavedPlotPayload]], settings: ComposerSettings) -> Tuple[str, str]:
    rows, cols = _layout_shape(settings.layout)
    width_in, height_in = _preset_size(settings)
    fig, axes = plt.subplots(rows, cols, figsize=(width_in, height_in), dpi=settings.dpi)
    fig.patch.set_facecolor("white")
    axes_list = list(axes.flat) if hasattr(axes, "flat") else [axes]

    for idx, ax in enumerate(axes_list):
        ax.axis("off")
        panel = panels[idx] if idx < len(panels) else None
        if panel and panel.image:
            ax.imshow(_decode_image(panel.image))
        label = chr(ord("a") + idx)
        ax.text(
            0.0,
            1.02,
            label,
            transform=ax.transAxes,
            ha="left",
            va="bottom",
            fontsize=settings.panel_label_size,
            fontfamily=settings.font_family,
            fontweight="bold" if settings.panel_label_bold else "normal",
            color="#111111",
        )

    margin = settings.outer_margin / 100
    hspace = settings.vertical_gap / 20
    wspace = settings.horizontal_gap / 20
    fig.subplots_adjust(left=margin, right=1 - margin, top=1 - margin, bottom=margin, hspace=hspace, wspace=wspace)

    output_format = settings.output_format.lower()
    buffer = BytesIO()
    if output_format == "pdf":
        with PdfPages(buffer) as pdf:
            pdf.savefig(fig, facecolor="white", bbox_inches="tight")
        mime = "application/pdf"
    else:
        fig.savefig(buffer, format="png", dpi=settings.dpi, facecolor="white", bbox_inches="tight")
        mime = "image/png"
    plt.close(fig)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:{mime};base64,{encoded}", mime
