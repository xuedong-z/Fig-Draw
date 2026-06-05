/**
 * User-manual content — long-form, bilingual. Kept out of the flat i18n STRINGS
 * dict (which holds short UI labels) so prose doesn't bloat it. Components read
 * `chapter.title[lang]` / `chapter.body[lang]`; a missing language is a type error.
 */
export type Lang = "en" | "zh";

export interface HelpChapter {
  id: string;
  title: { en: string; zh: string };
  body: { en: string[]; zh: string[] };
}

export const HELP_CHAPTERS: HelpChapter[] = [
  {
    id: "import",
    title: { en: "Import", zh: "导入" },
    body: {
      en: [
        "SciCompose composes figures you already made — it does not plot data.",
        "Import the SVGs you exported from Origin, matplotlib, GraphPad Prism, etc. — drag-and-drop onto the canvas, or use the Import button. Multiple files at once is fine.",
        "Raster images (PNG/JPG/WebP) come in as image panels you can scale and crop — handy for micrographs or schematics.",
        "Everything runs locally in your browser; no data is uploaded."
      ],
      zh: [
        "SciCompose 是把你已经画好的图拼成一张大图 —— 它本身不画数据。",
        "导入你从 Origin、matplotlib、GraphPad Prism 等导出的 SVG —— 直接拖到画布上,或用「导入」按钮,可一次选多个文件。",
        "位图(PNG/JPG/WebP)会作为图片面板导入,可缩放和裁剪 —— 适合电镜图或示意图。",
        "一切都在你的浏览器本地运行,不上传任何数据。"
      ]
    }
  },
  {
    id: "layout",
    title: { en: "Layout", zh: "布局" },
    body: {
      en: [
        "Each imported figure becomes a panel. Arrange panels with the grid presets (2×2, 3×2…), or unlock to free-place and resize.",
        "Tune the gap between panels and the inner padding from the left sidebar.",
        "Select two or more panels (shift-click) to align & distribute, or match their sizes.",
        "Panels auto-label (a)(b)(c) by order — reorder them in the panel list on the left."
      ],
      zh: [
        "每张导入的图就是一个面板。用网格预设(2×2、3×2…)排版,或解锁后自由摆放、缩放。",
        "在左栏调整面板间距和内边距。",
        "按住 Shift 选中两个及以上面板,即可对齐、分布或统一尺寸。",
        "面板按顺序自动编号 (a)(b)(c) —— 在左侧面板列表里可重新排序。"
      ]
    }
  },
  {
    id: "axis",
    title: { en: "Axis", zh: "坐标轴" },
    body: {
      en: [
        "The Axis tab edits axes across all panels: frame style (full / half / none), tick direction & length, tick-mark visibility, and the distances from ticks and titles to the axis.",
        "Axis & tick font sizes and line widths live here too — edit them, then click Apply to push them to every panel.",
        "'Center axis titles' re-centers each title along its axis."
      ],
      zh: [
        "坐标轴 tab 统一编辑所有面板的轴:边框样式(全框/半框/无)、刻度方向与长度、刻度线显隐,以及刻度、标题到轴的距离。",
        "坐标轴与刻度的字号、线宽也在这里 —— 改好后点「应用」推到每个面板。",
        "「轴标题居中」会让每个轴标题在其坐标轴上居中。"
      ]
    }
  },
  {
    id: "content",
    title: { en: "Content", zh: "内容" },
    body: {
      en: [
        "The Content tab is everything about the plotted data.",
        "Click a palette to recolor every series in order; structure (axes, ticks, text) stays untouched. Colorblind-safe palettes are marked with an eye.",
        "Select a panel to fine-tune individual series colors, set emphasis (primary / secondary / auxiliary), and the data line width.",
        "Bar charts recolor per bar; legends recolor together with their series."
      ],
      zh: [
        "内容 tab 管的是绘图数据本身。",
        "点一个色卡,按顺序为每个系列重新着色;结构(坐标轴、刻度、文字)保持不变。色盲友好的色卡有眼睛标记。",
        "选中一个面板后,可微调单个系列的颜色、设置强调(主/次/辅),以及数据线宽。",
        "柱状图按柱着色;图例会随其数据系列一起变色。"
      ]
    }
  },
  {
    id: "legend",
    title: { en: "Legend", zh: "图例" },
    body: {
      en: [
        "The Legend tab lists each legend entry of the selected panel.",
        "Change a swatch color (the data series recolors with it), rename the label text, or hide an entry — the change is written straight back to the figure.",
        "Nudge an entry's position with the arrow buttons; legend font size is on the Typography tab."
      ],
      zh: [
        "图例 tab 列出选中面板的每个图例项。",
        "改色块颜色(数据系列会一起变)、改标签文字,或隐藏某项 —— 改动直接写回图里。",
        "用箭头按钮微调每项位置;图例字号在「字体」tab。"
      ]
    }
  },
  {
    id: "type",
    title: { en: "Typography", zh: "排版" },
    body: {
      en: [
        "Set the figure-wide font family, the title and legend sizes, and panel-label styling here.",
        "Apply pushes the typography — including the axis/tick sizes and line widths from the Axis & Content tabs — consistently to every panel, in points, so it matches the export.",
        "Reset returns to Nature submission defaults (sans-serif, 5–7 pt, ≥0.25 pt lines)."
      ],
      zh: [
        "在这里设置整张图的字体、标题与图例字号,以及面板编号样式。",
        "「应用」会把排版(包括坐标轴/内容 tab 里的轴刻度字号和线宽)以「磅(pt)」为单位一致地推到每个面板,与导出一致。",
        "「重置」回到 Nature 投稿默认值(无衬线、5–7 pt、线宽 ≥0.25 pt)。"
      ]
    }
  },
  {
    id: "export",
    title: { en: "Export", zh: "导出" },
    body: {
      en: [
        "Pick a journal width (Nature 89 / 183 mm, Science, or custom).",
        "Export a PNG at 300 / 600 / 1200 DPI for submission, or a re-editable SVG you can open in SciCompose again later.",
        "PNG can be exported with a transparent background."
      ],
      zh: [
        "选择期刊宽度(Nature 89 / 183 mm、Science,或自定义)。",
        "导出 300 / 600 / 1200 DPI 的 PNG 用于投稿,或导出可再次编辑的 SVG(以后能再用 SciCompose 打开)。",
        "PNG 可选透明背景导出。"
      ]
    }
  },
  {
    id: "tips",
    title: { en: "Tips", zh: "技巧" },
    body: {
      en: [
        "Tune is the fall-back editor — click any element on the figure to edit its text / color / stroke / marker, or hide & delete it.",
        "Trim crops edge whitespace on every panel at once.",
        "Undo / redo with Ctrl+Z and Ctrl+Shift+Z.",
        "Switch EN / 中文 anytime from the top bar. Your work auto-saves and survives a page refresh."
      ],
      zh: [
        "「微调」是兜底编辑器 —— 点图上任意元素即可改它的文字/颜色/描边/标记,或隐藏、删除。",
        "「Trim」一键裁掉所有面板的边缘空白。",
        "用 Ctrl+Z、Ctrl+Shift+Z 撤销/重做。",
        "随时在顶栏切换 EN / 中文。你的工作会自动保存,刷新也不会丢。"
      ]
    }
  }
];
