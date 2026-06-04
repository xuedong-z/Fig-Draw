"use client";

/**
 * Module: i18n — whole-app English / 中文 switch.
 *
 * A single flat dictionary keyed by semantic ids. `translate()` is a pure
 * function (usable outside React); `useT()` binds it to the current language
 * from the store. The store NEVER imports this file, so there is no import
 * cycle — toast messages instead carry an i18n key and are translated at
 * render time (so they re-translate live when the language is switched).
 *
 * Strings may contain `{name}`-style placeholders filled from `vars`.
 */

import { useStore } from "./store";
import type { Lang } from "./types";

type Entry = { en: string; zh: string };

const STRINGS = {
  // ── App shell / TopBar ──────────────────────────────────────────────
  "app.tagline": { en: "figure editor", zh: "图表编辑器" },
  "act.import": { en: "Import", zh: "导入" },
  "act.undo": { en: "Undo", zh: "撤销" },
  "tip.undo": { en: "Undo (Ctrl+Z)", zh: "撤销 (Ctrl+Z)" },
  "act.redo": { en: "Redo", zh: "重做" },
  "tip.redo": { en: "Redo (Ctrl+Shift+Z)", zh: "重做 (Ctrl+Shift+Z)" },
  "act.trim": { en: "Trim", zh: "裁剪" },
  "tip.trim": { en: "Trim edge whitespace on every panel", zh: "裁剪所有面板的边缘空白" },
  "act.export": { en: "Export", zh: "导出" },
  "tip.lang": { en: "Switch language · 切换语言", zh: "切换语言 · Switch language" },

  // ── Example menu ────────────────────────────────────────────────────
  "act.examples": { en: "Examples", zh: "示例" },
  "tip.examples": { en: "Load a bundled example figure", zh: "加载内置示例图" },
  "examples.loadAll": { en: "Load all", zh: "全部加载" },
  "examples.panels": { en: "panels", zh: "个面板" },

  // ── Right sidebar tabs ──────────────────────────────────────────────
  "tab.color": { en: "Color", zh: "配色" },
  "tab.axis": { en: "Axis", zh: "坐标轴" },
  "tab.type": { en: "Type", zh: "字体" },
  "tab.emphasis": { en: "Emphasis", zh: "强调" },
  "tab.tune": { en: "Tune", zh: "微调" },
  "tab.export": { en: "Export", zh: "导出" },

  // ── Left sidebar: page & layout ─────────────────────────────────────
  "sec.page": { en: "Page", zh: "页面" },
  "page.width": { en: "Page width", zh: "页面宽度" },
  "page.mmWide": { en: "mm wide", zh: "mm 宽" },
  "sec.arrange": { en: "Arrange", zh: "排版" },
  "arrange.grid": { en: "Grid layout", zh: "网格布局" },
  "tip.gridArrange": { en: "Arrange panels into {n} columns, then lock", zh: "将面板排成 {n} 列并锁定" },
  "layout.locked": { en: "Locked", zh: "已锁定" },
  "layout.free": { en: "Free", zh: "自由" },
  "tip.layoutLocked": { en: "Layout locked — click to free-place / resize panels", zh: "布局已锁定——点击以自由摆放/缩放面板" },
  "tip.layoutFree": { en: "Free layout — click to lock", zh: "自由布局——点击以锁定" },
  "arrange.gap": { en: "Gap", zh: "间距" },
  "tip.gap": { en: "Spacing between grid cells", zh: "网格单元之间的间距" },
  "panel.innerPad": { en: "Panel inner padding", zh: "面板内边距" },
  "tip.innerPad": { en: "Whitespace added inside each panel (plot shrinks; panels stay put)", zh: "在每个面板内部增加空白（绘图区缩小，面板位置不变）" },
  "act.grid": { en: "Grid", zh: "网格" },
  "tip.grid": { en: "Toggle grid", zh: "显示/隐藏网格" },
  "act.snap": { en: "Snap", zh: "吸附" },
  "tip.snap": { en: "Toggle snapping", zh: "开启/关闭吸附" },

  // ── Left sidebar: panel list ────────────────────────────────────────
  "sec.panels": { en: "Panels", zh: "面板" },
  "panels.empty": { en: "No panels yet — import an SVG.", zh: "暂无面板——请导入 SVG。" },
  "panels.selSize": { en: "Selected size", zh: "选中尺寸" },
  "unit.W": { en: "W", zh: "宽" },
  "unit.Hmm": { en: "H mm", zh: "高 mm" },
  "tip.aspect": { en: "Width : height = {r}", zh: "宽 : 高 = {r}" },
  "act.autocropWs": { en: "Auto-crop whitespace", zh: "自动裁剪空白" },
  "tip.cropWs": { en: "Crop edge whitespace", zh: "裁剪边缘空白" },
  "tip.autocropRow": { en: "Auto-crop edge whitespace", zh: "自动裁剪边缘空白" },
  "panel.ticks": { en: "This panel’s ticks", zh: "此面板的刻度" },
  "act.inward": { en: "Inward", zh: "朝内" },
  "act.outward": { en: "Outward", zh: "朝外" },
  "tip.ticksInPanel": { en: "Ticks inward (this panel only)", zh: "刻度朝内（仅此面板）" },
  "tip.ticksOutPanel": { en: "Ticks outward (this panel only)", zh: "刻度朝外（仅此面板）" },

  // ── Align toolbar ───────────────────────────────────────────────────
  "align.sel": { en: "sel", zh: "已选" },
  "tip.align.left": { en: "Align left", zh: "左对齐" },
  "tip.align.hcenter": { en: "Align horizontal centers", zh: "水平居中对齐" },
  "tip.align.right": { en: "Align right", zh: "右对齐" },
  "tip.align.top": { en: "Align top", zh: "顶部对齐" },
  "tip.align.vcenter": { en: "Align vertical centers", zh: "垂直居中对齐" },
  "tip.align.bottom": { en: "Align bottom", zh: "底部对齐" },
  "tip.dist.h": { en: "Distribute horizontally", zh: "水平分布" },
  "tip.dist.v": { en: "Distribute vertically", zh: "垂直分布" },
  "tip.cropSel": { en: "Auto-crop whitespace on all selected panels", zh: "裁剪所有选中面板的空白" },
  "tip.matchSize": { en: "Match all selected panels to the first one’s size", zh: "将所有选中面板匹配到第一个的尺寸" },

  // ── Axis panel ──────────────────────────────────────────────────────
  "axis.importHint": { en: "Import an SVG to edit axes.", zh: "导入 SVG 以编辑坐标轴。" },
  "axis.title": { en: "Axes · all panels", zh: "坐标轴 · 所有面板" },
  "axis.frame": { en: "Axis frame", zh: "坐标轴框" },
  "frame.original": { en: "Orig", zh: "原始" },
  "tip.frame.original": { en: "Keep the imported frame", zh: "保留导入的边框" },
  "frame.full": { en: "Full", zh: "全框" },
  "tip.frame.full": { en: "Redraw a full box frame", zh: "重绘完整外框" },
  "frame.half": { en: "Half", zh: "半框" },
  "tip.frame.half": { en: "Redraw a half (L) frame: left + bottom", zh: "重绘半框（L 形）：左 + 下" },
  "frame.none": { en: "None", zh: "无" },
  "tip.frame.none": { en: "Hide the frame", zh: "隐藏边框" },
  "axis.tickDir": { en: "Tick direction", zh: "刻度方向" },
  "tip.tickDirIn": { en: "Ticks point inward", zh: "刻度朝内" },
  "tip.tickDirOut": { en: "Ticks point outward", zh: "刻度朝外" },
  "axis.tickMarks": { en: "Tick marks", zh: "刻度线" },
  "axis.xticks": { en: "X ticks", zh: "X 刻度" },
  "axis.yticks": { en: "Y ticks", zh: "Y 刻度" },
  "tip.xticks": { en: "Show / hide X-axis tick marks (all panels)", zh: "显示/隐藏 X 轴刻度（所有面板）" },
  "tip.yticks": { en: "Show / hide Y-axis tick marks (all panels)", zh: "显示/隐藏 Y 轴刻度（所有面板）" },
  "axis.tickLen": { en: "Tick length", zh: "刻度长度" },
  "tip.tickLen": { en: "Length of the tick marks (major/minor ratio preserved, all panels)", zh: "刻度线长度（保持主次比例，所有面板）" },
  "axis.tickLabelGap": { en: "Tick label gap", zh: "刻度标签间距" },
  "tip.tickLabelGap": { en: "Distance from tick labels to the axis (all panels)", zh: "刻度标签到坐标轴的距离（所有面板）" },
  "axis.titleGap": { en: "Axis title gap", zh: "轴标题间距" },
  "tip.titleGap": { en: "Distance from axis titles to the axis (all panels)", zh: "轴标题到坐标轴的距离（所有面板）" },
  "axis.centerTitles": { en: "Center axis titles", zh: "轴标题居中" },
  "tip.centerTitles": { en: "Center each axis title on its axis (all panels)", zh: "使每个轴标题在其坐标轴上居中（所有面板）" },
  "axis.transparentBg": { en: "Transparent background", zh: "透明背景" },
  "tip.transparentBg": { en: "Remove figure backgrounds (make transparent)", zh: "移除图表背景（设为透明）" },

  // ── Palette panel ───────────────────────────────────────────────────
  "color.library": { en: "Color library", zh: "配色库" },
  "color.desc": { en: "Click a palette to recolor every panel’s data series in order. Structure (axes, ticks, text) is left untouched.", zh: "点击调色板，按顺序为每个面板的数据系列重新着色。结构（坐标轴、刻度、文字）保持不变。" },
  "color.perSeries": { en: "Per-series color", zh: "单系列颜色" },
  "color.selectPanel": { en: "Select a panel to fine-tune colors.", zh: "选择一个面板以微调颜色。" },
  "color.noSeries": { en: "No data series detected in this panel.", zh: "此面板未检测到数据系列。" },

  // ── Emphasis panel ──────────────────────────────────────────────────
  "emp.title": { en: "Emphasis", zh: "强调" },
  "emp.desc": { en: "Rank data by importance so the key result stands out and supporting curves recede.", zh: "按重要性给数据排序，让关键结果突出、辅助曲线弱化。" },
  "emp.selectPanel": { en: "Select a panel first.", zh: "请先选择一个面板。" },
  "emphasis.primary": { en: "Primary", zh: "主要" },
  "emphasis.primary.hint": { en: "Spotlight — bolder, on top", zh: "聚焦——更粗、置顶" },
  "emphasis.secondary": { en: "Secondary", zh: "次要" },
  "emphasis.secondary.hint": { en: "Supporting — thinner, faded", zh: "辅助——更细、淡化" },
  "emphasis.auxiliary": { en: "Auxiliary", zh: "辅助" },
  "emphasis.auxiliary.hint": { en: "Background — grey, dashed", zh: "背景——灰色、虚线" },
  "emphasis.normal": { en: "Normal", zh: "普通" },
  "emphasis.normal.hint": { en: "Default weight", zh: "默认样式" },

  // ── Typography panel ────────────────────────────────────────────────
  "type.title": { en: "Typography", zh: "排版字体" },
  "type.desc": { en: "Targets by role; grey numbers are Nature recommendations. After laying panels out, click Unify to normalize every sub-figure to these sizes.", zh: "按角色设定目标值；灰色数字为 Nature 推荐值。排好面板后，点击“统一”将每个子图归一到这些尺寸。" },
  "type.fontFamily": { en: "Font family", zh: "字体" },
  "type.fontSize": { en: "Font size (pt)", zh: "字号 (pt)" },
  "type.axisLabel": { en: "Axis label", zh: "轴标签" },
  "type.tickLabel": { en: "Tick label", zh: "刻度标签" },
  "type.legend": { en: "Legend", zh: "图例" },
  "type.titleRow": { en: "Title", zh: "标题" },
  "type.lineWidth": { en: "Line width (pt)", zh: "线宽 (pt)" },
  "type.dataLine": { en: "Data line", zh: "数据线" },
  "type.axisFrame": { en: "Axis / frame", zh: "轴 / 框" },
  "type.tick": { en: "Tick", zh: "刻度" },
  "tip.reset": { en: "Reset all targets to Nature recommendations", zh: "将所有目标值重置为 Nature 推荐值" },
  "type.unify": { en: "Unify to Nature size", zh: "统一为 Nature 尺寸" },
  "type.panelLabels": { en: "Panel labels", zh: "面板标签" },
  "type.format": { en: "Format · fixed top-left", zh: "格式 · 固定左上角" },
  "type.sizePt": { en: "Size (pt)", zh: "大小 (pt)" },
  "type.gapPx": { en: "Gap (px)", zh: "间距 (px)" },
  "type.bold": { en: "Bold", zh: "加粗" },
  "type.whiteBacking": { en: "White backing", zh: "白色衬底" },

  // ── Tune panel ──────────────────────────────────────────────────────
  "tune.pickPanelEl": { en: "Select a panel, then an element.", zh: "先选择面板，再选择元素。" },
  "tune.editEl": { en: "Edit element", zh: "编辑元素" },
  "tune.pickEl": { en: "Pick an element", zh: "选择一个元素" },
  "tune.pickElPlaceholder": { en: "Select an element…", zh: "选择一个元素…" },
  "tune.orClick": { en: "…or click an element directly on the figure.", zh: "…或直接在图上点击某个元素。" },
  "tune.hidden": { en: "hidden", zh: "已隐藏" },
  "tune.text": { en: "Text", zh: "文字" },
  "tune.font": { en: "Font", zh: "字体" },
  "tune.fontSize": { en: "Font size (pt)", zh: "字号 (pt)" },
  "tune.textColor": { en: "Text color", zh: "文字颜色" },
  "tune.axisLabelPos": { en: "Axis label position", zh: "轴标签位置" },
  "act.center": { en: "Center", zh: "居中" },
  "tip.centerLabel": { en: "Center the label on the axis", zh: "使标签在坐标轴上居中" },
  "tip.closer": { en: "Closer to axis", zh: "靠近坐标轴" },
  "tip.farther": { en: "Farther from axis", zh: "远离坐标轴" },
  "tune.fillColor": { en: "Fill color", zh: "填充颜色" },
  "tune.gradientFill": { en: "Gradient fill · from palette", zh: "渐变填充 · 来自调色板" },
  "tip.gradient": { en: "Light → {c} gradient", zh: "浅色 → {c} 渐变" },
  "tune.edge": { en: "Edge", zh: "描边" },
  "tune.color": { en: "Color", zh: "颜色" },
  "tune.widthPt": { en: "Width (pt)", zh: "线宽 (pt)" },
  "tune.edgeDash": { en: "Edge dash", zh: "描边线型" },
  "tune.dash": { en: "Dash", zh: "线型" },
  "dash.solid": { en: "Solid", zh: "实线" },
  "dash.dashed": { en: "Dashed", zh: "虚线" },
  "dash.dotted": { en: "Dotted", zh: "点线" },
  "dash.dashdot": { en: "Dash-dot", zh: "点划线" },
  "tune.markerSize": { en: "Marker size (radius, whole series)", zh: "标记大小（半径，整个系列）" },
  "tune.opacity": { en: "Opacity", zh: "不透明度" },
  "tune.applyToRole": { en: "Apply to all “{role}” in this fig", zh: "应用到本图所有“{role}”" },
  "tip.applyToRole": { en: "Copy this element’s color to the same kind in THIS figure", zh: "将此元素的颜色复制到本图中的同类元素" },
  "act.show": { en: "Show", zh: "显示" },
  "act.hide": { en: "Hide", zh: "隐藏" },
  "tip.show": { en: "Show this element", zh: "显示此元素" },
  "tip.hide": { en: "Hide this element", zh: "隐藏此元素" },
  "act.delete": { en: "Delete", zh: "删除" },
  "tip.delete": { en: "Delete this element permanently", zh: "永久删除此元素" },

  // ── Export panel ────────────────────────────────────────────────────
  "export.title": { en: "Export", zh: "导出" },
  "export.desc": { en: "Renders the figure region only — panels and labels, no page chrome.", zh: "仅渲染图表区域——面板与标签，不含页面装饰。" },
  "export.journalSize": { en: "Journal size", zh: "期刊尺寸" },
  "export.widthMm": { en: "Width (mm)", zh: "宽度 (mm)" },
  "export.heightMm": { en: "Height (mm)", zh: "高度 (mm)" },
  "export.format": { en: "Format", zh: "格式" },
  "export.resolution": { en: "Resolution", zh: "分辨率" },
  "export.output": { en: "Output ≈", zh: "输出 ≈" },
  "export.vector": { en: "vector", zh: "矢量" },
  "export.rendering": { en: "Rendering…", zh: "渲染中…" },
  "export.exportBtn": { en: "Export {fmt}", zh: "导出 {fmt}" },
  "export.needPanel": { en: "Import a panel to enable export.", zh: "导入面板后即可导出。" },

  // ── Figure canvas empty state ───────────────────────────────────────
  "canvas.importBegin": { en: "Import an SVG to begin", zh: "导入 SVG 以开始" },
  "canvas.importHint": { en: "Import your exported sub-figures, or try an example:", zh: "导入你导出的子图，或试试示例：" },

  // ── Drag & drop ─────────────────────────────────────────────────────
  "drop.hint": { en: "Drop files to import", zh: "拖入文件以导入" },

  // ── Element roles (Tune dropdown / label) ───────────────────────────
  "role.data": { en: "Measured data", zh: "实测数据" },
  "role.fit": { en: "Fitted curve", zh: "拟合曲线" },
  "role.auxiliary": { en: "Auxiliary line", zh: "辅助线" },
  "role.scatter": { en: "Scatter", zh: "散点" },
  "role.errorbar": { en: "Error bar", zh: "误差棒" },
  "role.axis": { en: "Axis / frame", zh: "坐标轴 / 框" },
  "role.tick": { en: "Tick", zh: "刻度" },
  "role.grid": { en: "Grid", zh: "网格" },
  "role.background": { en: "Background", zh: "背景" },
  "role.legend": { en: "Legend", zh: "图例" },
  "role.text-tick": { en: "Tick label", zh: "刻度标签" },
  "role.text-axis": { en: "Axis label", zh: "轴标签" },
  "role.text-title": { en: "Title", zh: "标题" },
  "role.text-legend": { en: "Legend text", zh: "图例文字" },
  "role.decoration": { en: "Decoration", zh: "装饰" },
  "role.unknown": { en: "Unknown", zh: "未知" },

  // ── Palette categories ──────────────────────────────────────────────
  "cat.journal": { en: "Journal", zh: "期刊" },
  "cat.categorical": { en: "Categorical", zh: "分类" },
  "cat.theme": { en: "Editor themes", zh: "编辑器主题" },
  "cat.high-contrast": { en: "High-contrast", zh: "高对比" },
  "cat.muted": { en: "Muted / Morandi", zh: "柔和 / 莫兰迪" },
  "cat.sequential": { en: "Sequential / mono", zh: "渐进 / 单色" },
  "cat.diverging": { en: "Diverging", zh: "发散" },
  "cat.duo-trio": { en: "Duo / Trio", zh: "双色 / 三色" },
  "cat.gradient": { en: "Gradient / fill", zh: "渐变 / 填充" },

  // ── Import toasts (translated at render time in Messages) ───────────
  "warn.parse": { en: "{name}: This file could not be parsed as SVG.", zh: "{name}：无法将此文件解析为 SVG。" },
  "warn.text-as-path": { en: "{name}: Text in this SVG was converted to paths — fonts can’t be edited. Re-export keeping text (e.g. matplotlib svg.fonttype='none').", zh: "{name}：此 SVG 中的文字已转为路径——无法编辑字体。请重新导出并保留文字（如 matplotlib svg.fonttype='none'）。" },
  "warn.bitmap": { en: "{name}: This figure is mostly a bitmap image — layout only (its internal styles can’t be edited).", zh: "{name}：此图主要是位图——仅支持布局（无法编辑其内部样式）。" },
  "warn.color-scale": { en: "{name}: This looks like a continuous color-scale figure (heatmap/contour) — recoloring would change its meaning. Layout only is recommended.", zh: "{name}：这看起来是连续色阶图（热图/等高线）——重新着色会改变其含义。建议仅用于布局。" },
  "warn.no-data": { en: "{name}: No data series were found — Origin doesn’t export the data glyphs for box / stacked-column / error-bar / heatmap / pie plots (only the axes survive). Re-export this graph as a line / scatter / column plot, or export it as a PNG image instead.", zh: "{name}：未找到数据系列——Origin 不会导出箱线图 / 堆叠柱 / 误差棒 / 热图 / 饼图的数据图元（仅保留坐标轴）。请将此图重新导出为折线 / 散点 / 柱状图，或改为导出 PNG 图片。" },
  "warn.importFail": { en: "Failed to import {name}: {err}", zh: "导入 {name} 失败：{err}" },
  "warn.saveQuota": { en: "Auto-save failed: this figure is too large for browser storage. Export it to keep your work — a refresh will lose unsaved changes.", zh: "自动保存失败：此图太大，浏览器存不下。请导出以保存——刷新会丢失未保存的修改。" }
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;

/** Interpolation variables for `{token}` placeholders. */
export type TVars = Record<string, string | number>;

/** Pure translator. Accepts any string key (dynamic role/category keys fall
 *  through to the literal key if unknown). */
export function translate(lang: Lang, key: StringKey | string, vars?: TVars): string {
  const entry = (STRINGS as Record<string, Entry>)[key];
  let out = entry ? entry[lang] : key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
    }
  }
  return out;
}

/** React hook: returns a `t(key, vars?)` bound to the current UI language. */
export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: StringKey | string, vars?: TVars) => translate(lang, key, vars);
}
