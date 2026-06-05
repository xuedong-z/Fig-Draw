"use client";

import { useEffect, useState } from "react";
import { X, BookOpen, PlayCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { HELP_CHAPTERS } from "@/lib/helpContent";

/** User-manual modal: chapter rail + content, bilingual via helpContent. Mounted at
 * the Editor root; transient (helpOpen in store, not in undo history). */
export function HelpPanel() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const helpOpen = useStore((s) => s.helpOpen);
  const toggleHelp = useStore((s) => s.toggleHelp);
  const startTour = useStore((s) => s.startTour);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, toggleHelp]);

  if (!helpOpen) return null;
  const chapter = HELP_CHAPTERS[active];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]"
      onClick={() => toggleHelp(false)}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-paper shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <BookOpen size={16} className="text-accent" />
          <span className="text-sm font-semibold">{t("help.title")}</span>
          <button className="tool-btn ml-auto px-1.5" onClick={() => toggleHelp(false)} title={t("help.close")}>
            <X size={15} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-28 shrink-0 overflow-y-auto border-r border-line p-2">
            {HELP_CHAPTERS.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActive(i)}
                className={`mb-0.5 block w-full rounded px-2 py-1.5 text-left text-2xs ${
                  i === active ? "bg-accent/15 text-accent" : "text-muted hover:bg-hover hover:text-ink"
                }`}
              >
                {c.title[lang]}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <h2 className="mb-3 text-base font-semibold text-ink">{chapter.title[lang]}</h2>
            <div className="flex flex-col gap-2.5">
              {chapter.body[lang].map((p, i) => (
                <p key={i} className="text-xs leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-2.5">
          <button className="tool-btn" onClick={() => startTour()}>
            <PlayCircle size={14} /> {t("help.replayTour")}
          </button>
          <button className="tool-btn tool-btn-primary ml-auto" onClick={() => toggleHelp(false)}>
            {t("help.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
