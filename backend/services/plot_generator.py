from __future__ import annotations

import base64
from io import BytesIO
from typing import Any, Dict, List, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from models.schemas import DataMapping, QuickControlSettings, SemanticStyleOverrides, StyleSettings
from services.template_loader import get_reference_template


PALETTES = {
    "nature": ["#2F6B8F", "#D98332", "#4C8C6A", "#9B5E73", "#6B6F82"],
    "battery": ["#1F5E5A", "#C56B2C", "#5F6F94", "#8A7C52", "#A44744"],
    "electrochem": ["#284B63", "#7A5195", "#EF5675", "#FFA600", "#3A7D44"],
    "mono": ["#222222", "#666666", "#999999", "#BBBBBB"],
    "nature_low_saturation": ["#315F72", "#A65E4E", "#617A55", "#7B6B90", "#B18A47", "#6E7D86"],
    "battery_muted": ["#295E55", "#9F6846", "#596B8F", "#8B6D3F", "#7C4F63", "#4F777B"],
    "minimal_mono": ["#222222", "#555555", "#7A7A7A", "#A0A0A0"],
    "submission_nmc": ["#153C66", "#8FA4BC", "#F28B28", "#6F945D"],
}


def mm_to_in(mm: float) -> float:
    return mm / 25.4


def merge_style(template: Dict[str, Any], overrides: StyleSettings) -> Dict[str, Any]:
    style = dict(template.get("style", {}))
    layout = template.get("layout", {})
    style["figure_width"] = overrides.figure_width or mm_to_in(layout.get("width_mm", 89))
    style["figure_height"] = overrides.figure_height or mm_to_in(layout.get("height_mm", 65))
    for key, value in overrides.model_dump().items():
        if value is not None:
            style[key] = value
    style.setdefault("font_family", "Arial")
    style.setdefault("font_size", 8)
    style.setdefault("axis_label_size", 8)
    style.setdefault("tick_size", 7)
    style.setdefault("line_width", 1.0)
    style.setdefault("marker_size", 3)
    style.setdefault("axis_line_width", 0.8)
    style.setdefault("tick_width", 0.8)
    style.setdefault("legend_position", "best")
    style.setdefault("show_grid", style.get("grid", False))
    style.setdefault("show_legend", True)
    style.setdefault("color_palette", style.get("palette", "nature"))
    return style


def _series(df: pd.DataFrame, column: str, field_name: str) -> Tuple[pd.Series, List[str]]:
    if not column:
        raise ValueError(f"Please select a column for {field_name}.")
    if column not in df.columns:
        raise ValueError(f"Column '{column}' was not found in the uploaded data.")
    numeric = pd.to_numeric(df[column], errors="coerce")
    invalid = int(numeric.isna().sum() - df[column].isna().sum())
    warnings = []
    if invalid > 0:
        warnings.append(f"Column '{column}' contains {invalid} non-numeric value(s); those rows were ignored.")
    return numeric, warnings


def _prepare_xy(df: pd.DataFrame, mapping: DataMapping) -> Tuple[pd.DataFrame, List[str]]:
    x, x_warnings = _series(df, mapping.x or "", "x axis")
    y, y_warnings = _series(df, mapping.y or "", "y axis")
    data = pd.DataFrame({"x": x, "y": y})
    warnings = x_warnings + y_warnings
    if mapping.group and mapping.group in df.columns:
        data["group"] = df[mapping.group].astype(str)
    if mapping.error and mapping.error in df.columns:
        err, err_warnings = _series(df, mapping.error, "error")
        data["error"] = err
        warnings.extend(err_warnings)
    if mapping.second_y and mapping.second_y in df.columns:
        second, second_warnings = _series(df, mapping.second_y, "second y axis")
        data["second_y"] = second
        warnings.extend(second_warnings)
    data = data.dropna(subset=["x", "y"])
    if data.empty:
        raise ValueError("No numeric x/y rows remain after parsing. Please check the selected columns.")
    return data.sort_values("x"), warnings


def _style_axes(ax: plt.Axes, style: Dict[str, Any]) -> None:
    for side in ["top", "right"]:
        if not style.get("show_box", False):
            ax.spines[side].set_visible(False)
    for spine in ax.spines.values():
        spine.set_linewidth(style["axis_line_width"])
    direction = style.get("tick_direction", "out")
    ax.tick_params(
        direction=direction,
        width=style["tick_width"],
        labelsize=style["tick_size"],
        length=3,
    )
    if style.get("show_grid", False):
        ax.grid(True, color="#D8D8D8", linewidth=0.4, alpha=0.75)
    else:
        ax.grid(False)


def _plot_grouped(ax: plt.Axes, data: pd.DataFrame, style: Dict[str, Any], mode: str) -> None:
    palette = PALETTES.get(style.get("color_palette", "nature"), PALETTES["nature"])
    groups = [None] if "group" not in data.columns else list(data["group"].dropna().unique())
    for idx, group in enumerate(groups):
        subset = data if group is None else data[data["group"] == group]
        color = palette[idx % len(palette)]
        label = None if group is None else str(group)
        if mode == "line":
            ax.plot(
                subset["x"],
                subset["y"],
                linewidth=style["line_width"],
                marker=style.get("marker", "o"),
                markersize=style["marker_size"],
                color=color,
                label=label,
            )
        elif mode == "scatter":
            ax.scatter(
                subset["x"],
                subset["y"],
                s=style["marker_size"] ** 2,
                color=color,
                edgecolors="white",
                linewidths=0.35,
                label=label,
            )


def _plot_bar(ax: plt.Axes, data: pd.DataFrame, style: Dict[str, Any]) -> None:
    palette = PALETTES.get(style.get("color_palette", "nature"), PALETTES["nature"])
    if "group" in data.columns:
        grouped = data.groupby(["x", "group"], as_index=False)["y"].mean()
        x_values = list(grouped["x"].drop_duplicates())
        group_values = list(grouped["group"].drop_duplicates())
        width = 0.75 / max(len(group_values), 1)
        positions = np.arange(len(x_values))
        for idx, group in enumerate(group_values):
            subset = grouped[grouped["group"] == group].set_index("x").reindex(x_values)
            ax.bar(
                positions + (idx - (len(group_values) - 1) / 2) * width,
                subset["y"],
                width=width,
                color=palette[idx % len(palette)],
                label=str(group),
                linewidth=0,
            )
        ax.set_xticks(positions)
        ax.set_xticklabels([str(x) for x in x_values])
    else:
        ax.bar(data["x"], data["y"], color=palette[0], width=0.7, linewidth=0)


def generate_plot(df: pd.DataFrame, mapping: DataMapping, plot_type: str, template_id: str, overrides: StyleSettings, dpi: int = 300) -> Tuple[str, List[str]]:
    template = get_reference_template(template_id)
    if template["chart_type"] != plot_type:
        raise ValueError("Selected reference template does not match the selected plot type.")

    for field in template.get("required_fields", []):
        if field in {"x", "y", "second_y"} and not getattr(mapping, field):
            raise ValueError(f"The selected template requires '{field}', but no matching column was selected.")
    if template.get("style", {}).get("dual_axis") and not mapping.second_y:
        raise ValueError("This dual-axis template requires a second y axis column.")

    style = merge_style(template, overrides)
    data, warnings = _prepare_xy(df, mapping)

    if template.get("style", {}).get("dual_axis") and "second_y" not in data.columns:
        raise ValueError("Second y axis data could not be parsed. Please choose a numeric second y column.")

    with plt.rc_context({"font.family": style["font_family"], "font.size": style["font_size"]}):
        fig, ax = plt.subplots(figsize=(style["figure_width"], style["figure_height"]), dpi=dpi)
        fig.patch.set_facecolor("white")
        ax.set_facecolor("white")

        if plot_type in {"line", "long_cycling", "cv_curve"}:
            _plot_grouped(ax, data, style, "line")
        elif plot_type == "scatter":
            _plot_grouped(ax, data, style, "scatter")
        elif plot_type == "bar":
            _plot_bar(ax, data, style)
        elif plot_type == "nyquist":
            nyquist_data = data.copy()
            nyquist_data["y"] = -nyquist_data["y"].abs()
            _plot_grouped(ax, nyquist_data, style, "scatter" if style.get("marker_only") else "line")
            ax.set_aspect("equal", adjustable="datalim")
        else:
            raise ValueError(f"Unsupported plot type: {plot_type}")

        if template.get("style", {}).get("dual_axis"):
            ax2 = ax.twinx()
            palette = PALETTES.get(style.get("color_palette", "nature"), PALETTES["nature"])
            ax2.plot(
                data["x"],
                data["second_y"],
                linewidth=style["line_width"],
                marker="s",
                markersize=style["marker_size"],
                color=palette[1],
                label=style.get("second_y_label") or mapping.second_y,
            )
            ax2.set_ylabel(style.get("second_y_label") or mapping.second_y, fontsize=style["axis_label_size"])
            ax2.tick_params(direction=style.get("tick_direction", "out"), width=style["tick_width"], labelsize=style["tick_size"], length=3)
            ax2.spines["top"].set_visible(False)
            ax2.spines["right"].set_linewidth(style["axis_line_width"])

        ax.set_xlabel(style.get("x_label") or mapping.x or "x", fontsize=style["axis_label_size"])
        ax.set_ylabel(style.get("y_label") or mapping.y or "y", fontsize=style["axis_label_size"])
        if style.get("title"):
            ax.set_title(style["title"], fontsize=style["axis_label_size"], pad=5)
        if style.get("x_range") and len(style["x_range"]) == 2 and all(v is not None for v in style["x_range"]):
            ax.set_xlim(style["x_range"])
        if style.get("y_range") and len(style["y_range"]) == 2 and all(v is not None for v in style["y_range"]):
            ax.set_ylim(style["y_range"])
        _style_axes(ax, style)

        if style.get("show_legend", True) and ("group" in data.columns or template.get("style", {}).get("dual_axis")):
            handles, labels = ax.get_legend_handles_labels()
            if handles:
                ax.legend(handles, labels, frameon=False, fontsize=style["tick_size"], loc=style["legend_position"])

        fig.tight_layout(pad=0.8)
        buffer = BytesIO()
        fig.savefig(buffer, format="png", dpi=dpi, facecolor="white", bbox_inches="tight")
        plt.close(fig)

    image = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    return image, warnings


def _semantic_fields(template: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    fields: Dict[str, Dict[str, Any]] = {}
    for field in template.get("required_semantic_fields", []) + template.get("optional_semantic_fields", []):
        fields[field["key"]] = field
    return fields


def _numeric_semantic(df: pd.DataFrame, column: str, label: str) -> Tuple[pd.Series, List[str]]:
    if column not in df.columns:
        raise ValueError(f"Mapped column '{column}' for {label} was not found in the uploaded data.")
    numeric = pd.to_numeric(df[column], errors="coerce")
    invalid = int(numeric.isna().sum() - df[column].isna().sum())
    warnings = []
    if invalid > 0:
        warnings.append(f"{label} column '{column}' contains {invalid} non-numeric value(s); those rows were ignored.")
    return numeric, warnings


def _merged_semantic_style(template: Dict[str, Any], overrides: SemanticStyleOverrides, quick: QuickControlSettings) -> Dict[str, Any]:
    style = dict(template.get("style_preset", {}))
    layout = template.get("layout_preset", {})
    style["figure_width"] = overrides.figure_width or mm_to_in(layout.get("width_mm", 89))
    style["figure_height"] = overrides.figure_height or mm_to_in(layout.get("height_mm", 65))
    for key, value in overrides.model_dump().items():
        if value is not None and key != "dpi":
            style[key] = value
    if quick.legend_position:
        style["legend_position"] = quick.legend_position
    if quick.palette:
        style["palette"] = quick.palette
    style.setdefault("font_family", "Arial")
    style.setdefault("font_size", 8)
    style.setdefault("axis_label_size", style["font_size"])
    style.setdefault("tick_size", 7)
    style.setdefault("line_width", 1.0)
    style.setdefault("marker_size", 3)
    style.setdefault("axis_line_width", 0.8)
    style.setdefault("tick_width", 0.8)
    style.setdefault("tick_direction", "in")
    style.setdefault("legend_position", "best")
    style.setdefault("palette", "nature_low_saturation")
    return style


def _apply_semantic_axes(ax: plt.Axes, style: Dict[str, Any]) -> None:
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for spine in ax.spines.values():
        spine.set_linewidth(style["axis_line_width"])
    ax.tick_params(
        direction=style.get("tick_direction", "in"),
        width=style["tick_width"],
        labelsize=style["tick_size"],
        length=3,
    )
    if style.get("grid", False):
        ax.grid(True, color="#D8D8D8", linewidth=0.4, alpha=0.75)
    else:
        ax.grid(False)


def _range_is_valid(value: Any) -> bool:
    return isinstance(value, list) and len(value) == 2 and all(item is not None for item in value)


def _profile_to_dataframe(profile: Dict[str, Any]) -> pd.DataFrame:
    if profile.get("type") != "long_cycling_submission_panel":
        raise ValueError(f"Unsupported reference profile type: {profile.get('type')}")

    start = int(profile.get("cycle_start", 0))
    end = int(profile.get("cycle_end", 1000))
    step = int(profile.get("cycle_step", 10))
    cycles = np.arange(start, end + step, step)
    rows = []
    for sample in profile.get("samples", []):
        name = sample["name"]
        initial = float(sample["initial_capacity"])
        final = float(sample["final_capacity"])
        ce_initial = float(sample.get("ce_initial", 86))
        ce_final = float(sample.get("ce_final", 99.5))
        for cycle in cycles:
            progress = 0 if end == start else (cycle - start) / (end - start)
            # Smooth, manuscript-like long-cycling decay: steeper early fade, slower tail.
            capacity = initial - (initial - final) * (0.68 * progress + 0.32 * (1 - np.exp(-3.2 * progress)))
            capacity += 1.2 * np.sin(progress * np.pi * 2.2)
            ce = ce_final - (ce_final - ce_initial) * np.exp(-cycle / 6 if cycle else 0)
            rows.append(
                {
                    "cycle": int(cycle),
                    "sample": name,
                    "capacity": round(float(capacity), 2),
                    "coulombic_efficiency": round(float(ce), 2),
                }
            )
    return pd.DataFrame(rows)


def _build_semantic_frame(
    df: pd.DataFrame,
    template: Dict[str, Any],
    mapping: Dict[str, str | None],
) -> Tuple[pd.DataFrame, List[str]]:
    warnings: List[str] = []
    fields = _semantic_fields(template)
    required = [field["key"] for field in template.get("required_semantic_fields", [])]
    missing = [key for key in required if not mapping.get(key)]
    if missing:
        labels = [fields[key]["label"] for key in missing]
        raise ValueError("Missing required semantic field mapping: " + ", ".join(labels))

    semantic = pd.DataFrame(index=df.index)
    for key, column in mapping.items():
        if not column:
            continue
        field = fields.get(key)
        if not field:
            continue
        if field.get("type") == "numeric":
            semantic[key], field_warnings = _numeric_semantic(df, column, field["label"])
            warnings.extend(field_warnings)
        else:
            if column not in df.columns:
                raise ValueError(f"Mapped column '{column}' for {field['label']} was not found in the uploaded data.")
            semantic[key] = df[column].astype(str)

    semantic = semantic.dropna(subset=required)
    if semantic.empty:
        raise ValueError("No valid rows remain after applying the selected template mapping.")
    return semantic, warnings


def _add_retention_annotations(ax: plt.Axes, data: pd.DataFrame, palette: List[str], style: Dict[str, Any]) -> None:
    for idx, (sample, subset) in enumerate(data.groupby("sample")):
        subset = subset.sort_values("cycle")
        if subset.empty:
            continue
        first = subset["capacity"].iloc[0]
        last = subset["capacity"].iloc[-1]
        if first == 0 or pd.isna(first) or pd.isna(last):
            continue
        retention = last / first * 100
        ax.annotate(
            f"{retention:.0f}%",
            xy=(subset["cycle"].iloc[-1], last),
            xytext=(4, 0),
            textcoords="offset points",
            va="center",
            fontsize=style["tick_size"],
            color=palette[idx % len(palette)],
        )


def generate_semantic_plot(
    df: pd.DataFrame,
    template_id: str,
    semantic_mapping: Dict[str, str | None],
    overrides: SemanticStyleOverrides,
    quick: QuickControlSettings,
    dpi: int = 300,
) -> Tuple[str, List[str]]:
    template = get_reference_template(template_id)
    if template.get("figure_type") != "long_cycling":
        raise ValueError("MVP v0.1 currently supports template-driven generation for long cycling templates.")

    data, warnings = _build_semantic_frame(df, template, semantic_mapping)
    has_ce = "coulombic_efficiency" in data.columns and data["coulombic_efficiency"].notna().any()
    wants_ce = quick.show_ce and template.get("chart_structure", {}).get("right_y") == "coulombic_efficiency"
    if wants_ce and not has_ce:
        warnings.append("Coulombic efficiency was not mapped or contains no numeric values, so a capacity-only version was generated.")

    style = _merged_semantic_style(template, overrides, quick)
    labels = template.get("default_labels", {})
    palette = PALETTES.get(style.get("palette"), PALETTES["nature_low_saturation"])
    marker = "o" if quick.show_markers else None
    marker_size = style["marker_size"] if quick.show_markers else 0

    plot_data = data.copy()
    y_label = overrides.left_y_label or labels.get("left_y", "Specific capacity (mAh g⁻¹)")
    if quick.normalize_retention:
        normalized_parts = []
        for _, subset in plot_data.groupby("sample"):
            subset = subset.sort_values("cycle").copy()
            first = subset["capacity"].iloc[0]
            if first and not pd.isna(first):
                subset["capacity"] = subset["capacity"] / first * 100
            normalized_parts.append(subset)
        plot_data = pd.concat(normalized_parts, ignore_index=True)
        y_label = "Capacity retention (%)"

    with plt.rc_context({"font.family": style["font_family"], "font.size": style["font_size"]}):
        fig, ax = plt.subplots(figsize=(style["figure_width"], style["figure_height"]), dpi=dpi)
        fig.patch.set_facecolor("white")
        ax.set_facecolor("white")

        groups = list(plot_data["sample"].dropna().unique())
        for idx, sample in enumerate(groups):
            subset = plot_data[plot_data["sample"] == sample].sort_values("cycle")
            color = palette[idx % len(palette)]
            open_markers = bool(style.get("open_markers", False))
            marker_kwargs = {
                "marker": marker,
                "markersize": marker_size,
            }
            if open_markers and marker:
                marker_kwargs.update({"markerfacecolor": "white", "markeredgewidth": 0.8})

            if "error" in subset.columns and subset["error"].notna().any():
                ax.errorbar(
                    subset["cycle"],
                    subset["capacity"],
                    yerr=subset["error"],
                    linewidth=style["line_width"],
                    capsize=2,
                    elinewidth=max(style["line_width"] * 0.75, 0.4),
                    color=color,
                    label=str(sample),
                    **marker_kwargs,
                )
            else:
                ax.plot(
                    subset["cycle"],
                    subset["capacity"],
                    linewidth=style["line_width"],
                    color=color,
                    label=str(sample),
                    **marker_kwargs,
                )

        ax2 = None
        if wants_ce and has_ce:
            ax2 = ax.twinx()
            for idx, sample in enumerate(groups):
                subset = plot_data[plot_data["sample"] == sample].sort_values("cycle")
                if "coulombic_efficiency" not in subset.columns:
                    continue
                color = palette[idx % len(palette)]
                ax2.plot(
                    subset["cycle"],
                    subset["coulombic_efficiency"],
                    linewidth=max(style["line_width"] * 0.8, 0.5),
                    marker="o" if quick.show_markers else None,
                    markersize=max(marker_size - 0.4, 1.8) if quick.show_markers else 0,
                    linestyle=style.get("ce_line_style", "--"),
                    alpha=0.72,
                    color=color,
                    markerfacecolor="white" if style.get("open_markers", False) and quick.show_markers else color,
                    markeredgewidth=0.75,
                )
            ax2.set_ylabel(overrides.right_y_label or labels.get("right_y", "Coulombic efficiency (%)"), fontsize=style["axis_label_size"])
            ax2.tick_params(direction=style.get("tick_direction", "in"), width=style["tick_width"], labelsize=style["tick_size"], length=3)
            ax2.spines["top"].set_visible(False)
            ax2.spines["right"].set_linewidth(style["axis_line_width"])
            if _range_is_valid(style.get("right_y_range")):
                ax2.set_ylim(style["right_y_range"])

        ax.set_xlabel(overrides.x_label or labels.get("x", "Cycle number"), fontsize=style["axis_label_size"])
        ax.set_ylabel(y_label, fontsize=style["axis_label_size"])
        if style.get("title"):
            ax.set_title(style["title"], fontsize=style["axis_label_size"], pad=5)
        if _range_is_valid(style.get("x_range")):
            ax.set_xlim(style["x_range"])
            if style["x_range"] == [0, 1000]:
                ax.set_xticks(np.arange(0, 1001, 200))
        if _range_is_valid(style.get("left_y_range")):
            ax.set_ylim(style["left_y_range"])
            if style["left_y_range"] == [0, 250]:
                ax.set_yticks(np.arange(0, 251, 50))
        _apply_semantic_axes(ax, style)
        if ax2 is not None and _range_is_valid(style.get("right_y_range")) and style["right_y_range"] == [0, 120]:
            ax2.set_yticks(np.arange(0, 121, 20))
        if quick.show_retention_annotation:
            _add_retention_annotations(ax, plot_data, palette, style)
        if style.get("condition_annotation"):
            ax.text(
                0.965,
                0.08,
                str(style["condition_annotation"]),
                transform=ax.transAxes,
                ha="right",
                va="bottom",
                fontsize=style["tick_size"],
                color="#111111",
            )
        if style.get("panel_label"):
            ax.text(
                -0.075,
                1.04,
                str(style["panel_label"]),
                transform=ax.transAxes,
                ha="left",
                va="bottom",
                fontsize=max(style["axis_label_size"] + 2, 10),
                fontweight="bold",
                color="#111111",
                clip_on=False,
            )
        if groups:
            ax.legend(frameon=False, fontsize=style["tick_size"], loc=style["legend_position"])

        fig.tight_layout(pad=0.8)
        buffer = BytesIO()
        fig.savefig(buffer, format="png", dpi=dpi, facecolor="white", bbox_inches="tight")
        plt.close(fig)

    image = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    return image, warnings


def generate_template_preview(template_id: str) -> bytes:
    template = get_reference_template(template_id)
    if template.get("standard_reference_profile"):
        df = _profile_to_dataframe(template["standard_reference_profile"])
    else:
        rows = template.get("standard_reference_data") or template.get("example_rows")
        if not rows:
            raise ValueError("This reference template does not include preview data.")
        df = pd.DataFrame(rows)

    if df.empty:
        raise ValueError("This reference template does not include preview data.")
    mapping = {}
    for field in template.get("required_semantic_fields", []) + template.get("optional_semantic_fields", []):
        key = field["key"]
        if key in df.columns:
            mapping[key] = key

    style = SemanticStyleOverrides()
    quick = QuickControlSettings(
        show_ce=bool(template.get("chart_structure", {}).get("right_y") and "coulombic_efficiency" in df.columns),
        show_markers=True,
        legend_position=str(template.get("style_preset", {}).get("legend_position", "upper right")),
        palette=str(template.get("style_preset", {}).get("palette", "nature_low_saturation")),
        normalize_retention=False,
        show_retention_annotation=template_id == "battery_long_cycling_capacity_retention",
    )
    image, _ = generate_semantic_plot(df, template_id, mapping, style, quick, 300)
    return base64.b64decode(image.split(",", 1)[1])
