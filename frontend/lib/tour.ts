/**
 * Guided-tour steps — selector-anchored, bilingual. Consumed by Tour.tsx, which
 * drives driver.js with the current language. Anchors are `data-tour` attributes on
 * real UI elements; a step whose anchor isn't in the DOM is skipped.
 */
export interface TourStep {
  selector: string;
  title: { en: string; zh: string };
  body: { en: string; zh: string };
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="import"]',
    title: { en: "1. Import your figures", zh: "1. 导入你的图" },
    body: {
      en: "Bring in the SVGs you exported from Origin, matplotlib, Prism… (or drag them onto the canvas). Images work too.",
      zh: "导入你从 Origin、matplotlib、Prism 等导出的 SVG(也可直接拖到画布上),图片也行。"
    },
    side: "bottom",
    align: "start"
  },
  {
    selector: '[data-tour="examples"]',
    title: { en: "2. Or try an example", zh: "2. 或试个示例" },
    body: {
      en: "No file handy? Load a bundled sample to explore everything first.",
      zh: "没有文件?先加载一个内置示例来体验所有功能。"
    },
    side: "bottom",
    align: "start"
  },
  {
    selector: '[data-tour="layout"]',
    title: { en: "3. Arrange panels", zh: "3. 排版面板" },
    body: {
      en: "Each figure is a panel. Use grid presets or free-place, set gaps, and reorder — they auto-label (a)(b)(c).",
      zh: "每张图是一个面板。用网格预设或自由摆放、设间距、重排序 —— 会自动编号 (a)(b)(c)。"
    },
    side: "right",
    align: "start"
  },
  {
    selector: '[data-tour="tabs"]',
    title: { en: "4. Edit by object", zh: "4. 按对象编辑" },
    body: {
      en: "Tabs are grouped by target: Axis, Content (data & color), Legend, Typography, Tune (any element), Export.",
      zh: "tab 按对象分组:坐标轴、内容(数据与配色)、图例、字体、微调(任意元素)、导出。"
    },
    side: "left",
    align: "start"
  },
  {
    selector: '[data-tour="canvas"]',
    title: { en: "5. The page preview", zh: "5. 页面预览" },
    body: {
      en: "Your figure on a realistic journal page. Click an element to edit it; drag panels to move or resize.",
      zh: "你的图呈现在仿真期刊页上。点元素即可编辑;拖动面板来移动或缩放。"
    },
    side: "left",
    align: "center"
  },
  {
    selector: '[data-tour="export"]',
    title: { en: "6. Export", zh: "6. 导出" },
    body: {
      en: "Export a submission-ready PNG (300–1200 DPI) or a re-editable SVG at journal widths.",
      zh: "导出投稿级 PNG(300–1200 DPI)或期刊宽度的可再编辑 SVG。"
    },
    side: "bottom",
    align: "end"
  },
  {
    selector: '[data-tour="help"]',
    title: { en: "Find help anytime", zh: "随时查帮助" },
    body: {
      en: "Reopen this manual from the ? button whenever you need it. Enjoy!",
      zh: "随时点 ? 按钮重新打开手册。开始吧!"
    },
    side: "bottom",
    align: "end"
  }
];
