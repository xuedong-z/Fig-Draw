/**
 * Guided-tour steps — selector-anchored, bilingual. Consumed by Tour.tsx, which
 * drives driver.js with the current language. Anchors are `data-tour` attributes on
 * real UI elements; a step whose anchor isn't in the DOM is skipped. The script walks
 * the user through one full end-to-end workflow.
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
    selector: '[data-tour="examples"]',
    title: { en: "1. Import figures", zh: "1. 导入图片" },
    body: {
      en: "Start here — load a bundled example set (or use Import for your own SVG / PNG figures).",
      zh: "从这里开始 —— 加载一组内置示例图(或用「导入」放你自己的 SVG / PNG)。"
    },
    side: "bottom",
    align: "start"
  },
  {
    selector: '[data-tour="layout"]',
    title: { en: "2. Auto-arrange (3×3)", zh: "2. 自动排版 (3×3)" },
    body: {
      en: "Click the 3×3 grid preset — every panel snaps into a tidy grid and the layout locks.",
      zh: "点 3×3 网格预设,所有面板自动排成整齐网格并锁定。"
    },
    side: "right",
    align: "start"
  },
  {
    selector: '[data-tour="layout"]',
    title: { en: "3. Resize a panel", zh: "3. 调整尺寸" },
    body: {
      en: "Click Free to unlock, then drag the last panel taller — across two rows. Notice figsize keeps its fonts & line widths constant.",
      zh: "点「自由」解锁,然后把最后一张图拖高、跨两行 —— 注意 figsize 让字号和线宽保持不变。"
    },
    side: "right",
    align: "center"
  },
  {
    selector: '[data-tour="tabs"]',
    title: { en: "4. Axis", zh: "4. 坐标轴" },
    body: {
      en: "Open the Axis tab: set a half frame, ticks outward, tweak the axis & tick sizes, then click Apply.",
      zh: "打开坐标轴 tab:设半框、刻度朝外,调坐标轴和刻度尺寸,然后点「应用」。"
    },
    side: "left",
    align: "start"
  },
  {
    selector: '[data-tour="tabs"]',
    title: { en: "5. Typography", zh: "5. 字体" },
    body: {
      en: "Open the Typography tab and click Apply — fonts & line weights normalize across every panel.",
      zh: "打开字体 tab,点「应用」—— 字号和线宽统一到每个面板。"
    },
    side: "left",
    align: "start"
  },
  {
    selector: '[data-tour="tabs"]',
    title: { en: "6. Content & color", zh: "6. 内容配色" },
    body: {
      en: "Open the Content tab and pick a palette — every data series recolors in order.",
      zh: "打开内容 tab,选一个色卡 —— 所有数据系列按顺序重新着色。"
    },
    side: "left",
    align: "start"
  },
  {
    selector: '[data-tour="trim"]',
    title: { en: "7. Trim & tidy", zh: "7. 裁剪整理" },
    body: {
      en: "Click Trim to crop edge whitespace on every panel, then re-apply the 3×3 grid to tidy the layout back up.",
      zh: "点 Trim 裁掉每个面板的边缘空白,再点一次 3×3 网格让布局回到整齐。"
    },
    side: "bottom",
    align: "start"
  },
  {
    selector: '[data-tour="export"]',
    title: { en: "8. Export", zh: "8. 导出" },
    body: {
      en: "Pick a journal width + DPI and export a submission-ready PNG, or a re-editable SVG. Done!",
      zh: "选期刊宽度和 DPI,导出投稿级 PNG,或可再编辑的 SVG。完成!"
    },
    side: "bottom",
    align: "end"
  }
];
