"use client";

import { useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { EXAMPLES, loadExample } from "@/lib/examples";

export function ExampleMenu() {
  const importSvg = useStore((s) => s.importSvg);
  const t = useT();
  const [open, setOpen] = useState(false);

  const loadOne = async (file: string) => {
    setOpen(false);
    const ex = EXAMPLES.find((e) => e.file === file);
    if (ex) await loadExample(ex, importSvg);
  };

  const loadAll = async () => {
    setOpen(false);
    for (const ex of EXAMPLES) await loadExample(ex, importSvg);
  };

  return (
    <div className="relative">
      <button className="tool-btn" onClick={() => setOpen((o) => !o)} title={t("tip.examples")}>
        <Sparkles size={15} /> {t("act.examples")} <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-md border border-line bg-panel p-1 shadow-pop">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.file}
                onClick={() => loadOne(ex.file)}
                className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left hover:bg-hover"
              >
                <span className="text-xs text-ink">{ex.name}</span>
                <span className="text-2xs text-faint">{ex.desc}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <button
              onClick={loadAll}
              className="w-full rounded px-2 py-1.5 text-left text-xs text-accent hover:bg-hover"
            >
              {t("examples.loadAll")} ({EXAMPLES.length} {t("examples.panels")})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
