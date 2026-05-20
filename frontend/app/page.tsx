"use client";

import Link from "next/link";
import { ArrowRight, FileImage, Layers3 } from "lucide-react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-paper">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
        <div className="mb-8 flex justify-end">
          <LanguageToggle />
        </div>
        <div className="mb-8">
          <p className="control-label mb-3">MVP v0.1</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-ink">
            Scientific Figure Studio
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {t(
              "Reference-based plotting, journal-style formatting, and multi-panel figure composition for research papers.",
              "面向科研论文的参考图驱动绘图、期刊格式统一排版和多面板 Figure 组合平台。"
            )}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/plot-studio" className="group panel-shell block rounded-lg p-6 transition hover:-translate-y-0.5">
            <FileImage className="mb-5 h-8 w-8 text-accent" />
            <h2 className="text-2xl font-semibold">{t("Plot Studio", "图表工作室")}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t(
                "Choose a scientific figure reference first, upload matching data, generate a publication-style plot, and save Plot A-D.",
                "先选择科研参考图模板，再上传匹配数据，生成投稿风格图，并保存为 Plot A-D。"
              )}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              {t("Open Plot Studio", "打开图表工作室")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link href="/figure-composer" className="group panel-shell block rounded-lg p-6 transition hover:-translate-y-0.5">
            <Layers3 className="mb-5 h-8 w-8 text-copper" />
            <h2 className="text-2xl font-semibold">{t("Figure Composer", "Figure 排版器")}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t(
                "Place saved plots into a simulated article page, apply journal presets, and export PNG or PDF.",
                "把已保存图表放入模拟论文页面，应用期刊尺寸预设，并导出 PNG 或 PDF。"
              )}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-copper">
              {t("Open Composer", "打开排版器")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
