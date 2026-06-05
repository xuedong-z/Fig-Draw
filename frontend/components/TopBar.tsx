"use client";

import { useRef } from "react";
import { Upload, Undo2, Redo2, Download, FlaskConical, Scissors, Languages, CircleHelp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { importFiles } from "@/lib/importFiles";
import { ExampleMenu } from "./ExampleMenu";

export function TopBar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const importSvg = useStore((s) => s.importSvg);
  const importImage = useStore((s) => s.importImage);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const setRightTab = useStore((s) => s.setRightTab);
  const cropAll = useStore((s) => s.cropAll);
  const panelCount = useStore((s) => s.panels.length);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const toggleHelp = useStore((s) => s.toggleHelp);

  const onFiles = async (files: FileList | null) => {
    await importFiles(files, { importSvg, importImage });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <div className="flex items-center gap-2 pr-3">
        <FlaskConical size={18} className="text-accent" />
        <span className="text-sm font-semibold tracking-tight">SciCompose</span>
        <span className="hidden text-2xs text-faint sm:inline">{t("app.tagline")}</span>
      </div>

      <div className="h-5 w-px bg-line" />

      <button className="tool-btn tool-btn-primary" onClick={() => fileRef.current?.click()}>
        <Upload size={15} /> {t("act.import")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <ExampleMenu />

      <div className="h-5 w-px bg-line" />

      <button className="tool-btn" onClick={undo} disabled={!canUndo} title={t("tip.undo")}>
        <Undo2 size={15} /> {t("act.undo")}
      </button>
      <button className="tool-btn" onClick={redo} disabled={!canRedo} title={t("tip.redo")}>
        <Redo2 size={15} /> {t("act.redo")}
      </button>

      <div className="h-5 w-px bg-line" />

      <button
        className="tool-btn"
        onClick={cropAll}
        disabled={panelCount === 0}
        title={t("tip.trim")}
      >
        <Scissors size={15} /> {t("act.trim")}
      </button>

      <div className="ml-auto" />

      <button className="tool-btn px-1.5" onClick={() => toggleHelp()} title={t("help.open")} data-tour="help">
        <CircleHelp size={15} />
      </button>

      {/* Language toggle — EN | 中 segmented switch */}
      <div className="flex items-center overflow-hidden rounded-md border border-line" title={t("tip.lang")}>
        <button
          className={`flex items-center gap-1 px-2 py-1 text-2xs ${lang === "en" ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
          onClick={() => setLang("en")}
        >
          <Languages size={13} /> EN
        </button>
        <button
          className={`px-2 py-1 text-2xs ${lang === "zh" ? "bg-accent text-white" : "text-muted hover:text-ink"}`}
          onClick={() => setLang("zh")}
        >
          中
        </button>
      </div>

      <div className="h-5 w-px bg-line" />

      <button
        className="tool-btn tool-btn-primary"
        onClick={() => setRightTab("export")}
        disabled={panelCount === 0}
      >
        <Download size={15} /> {t("act.export")}
      </button>
    </header>
  );
}
