"use client";

import { Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { EXAMPLES, loadExample } from "@/lib/examples";

/** One-click: import all bundled examples at once (no dropdown). */
export function ExampleMenu() {
  const importSvg = useStore((s) => s.importSvg);
  const importImage = useStore((s) => s.importImage);
  const t = useT();

  const loadAll = async () => {
    for (const ex of EXAMPLES) await loadExample(ex, importSvg, importImage);
  };

  return (
    <button className="tool-btn" onClick={loadAll} title={t("tip.examples")} data-tour="examples">
      <Sparkles size={15} /> {t("act.examples")}
    </button>
  );
}
