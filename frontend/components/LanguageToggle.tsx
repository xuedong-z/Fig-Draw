"use client";

import { Languages } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex h-10 items-center rounded border border-rule bg-white p-1 text-sm shadow-sm">
      <Languages className="mx-2 h-4 w-4 text-slate-500" />
      <button
        type="button"
        onClick={() => setLanguage("zh")}
        className={`h-8 rounded px-3 font-semibold transition ${language === "zh" ? "bg-ink text-white" : "text-slate-600 hover:bg-panel"}`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`h-8 rounded px-3 font-semibold transition ${language === "en" ? "bg-ink text-white" : "text-slate-600 hover:bg-panel"}`}
      >
        EN
      </button>
    </div>
  );
}
