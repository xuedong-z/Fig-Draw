"use client";

import { useEffect, useRef } from "react";
import { useStore, FIG_PX_PER_MM } from "@/lib/store";
import { fakeParagraph } from "@/lib/fakeText";
import { FigureCanvas } from "./FigureCanvas";
import { AlignToolbar } from "./AlignToolbar";

/** Editable caption continuation (keeps cursor stable, syncs on undo/redo). */
function CaptionEditor() {
  const caption = useStore((s) => s.caption);
  const setCaption = useStore((s) => s.setCaption);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.textContent !== caption) ref.current.textContent = caption;
  }, [caption]);
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={(e) => setCaption((e.target as HTMLElement).textContent ?? "")}
      className="cursor-text rounded-sm outline-none focus:bg-yellow-50"
    />
  );
}

export function NaturePage() {
  const pageWidthMm = useStore((s) => s.pageWidthMm);
  const figW = pageWidthMm * FIG_PX_PER_MM;
  const pagePadding = 52;
  // single-column page (≤100mm) → single-column body text; double → two columns
  const cols = pageWidthMm <= 100 ? "columns-1" : "columns-2";
  const isPpt = pageWidthMm >= 320; // PowerPoint preset → a plain 16:9 slide, no article text

  // PowerPoint mode: a clean 16:9 slide (the figure canvas is the slide), no journal chrome.
  if (isPpt) {
    return (
      <div className="flex min-h-full items-center justify-center p-10">
        <figure className="relative h-fit rounded-[2px] shadow-paper" style={{ width: figW }}>
          <FigureCanvas />
          <AlignToolbar />
        </figure>
      </div>
    );
  }

  return (
    <div className="flex min-h-full justify-center px-8 py-10">
      <div
        className="journal-paper relative h-fit rounded-[2px] bg-paper shadow-paper"
        style={{ width: figW + pagePadding * 2, paddingLeft: pagePadding, paddingRight: pagePadding, paddingTop: 44, paddingBottom: 56 }}
      >
        {/* running head — faint, slightly blurred background context */}
        <div className="mb-5 flex items-baseline justify-between border-b border-neutral-200 pb-2 blur-[1px]">
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Article</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Nature · Research</span>
        </div>

        <h1 className="mb-3 font-serif text-[19px] font-semibold leading-snug text-neutral-900 blur-[1.2px]">
          Interfacial engineering of electrocatalysts for stable energy storage
        </h1>
        <p className="mb-4 text-[11px] italic leading-snug text-neutral-500 blur-[1.2px]">
          A. Researcher, B. Coauthor &amp; C. Principal · Department of Materials Science
        </p>

        {/* body text: column count follows the page width, gently blurred so the figure stays the focus */}
        <div className={`mb-1 ${cols} gap-6 blur-[1.2px]`}>
          <p className="body-col mb-3 text-[13.5px] leading-[1.5] text-neutral-800">{fakeParagraph(7, 5)}</p>
          <p className="body-col text-[13.5px] leading-[1.5] text-neutral-800">{fakeParagraph(23, 4)}</p>
        </div>

        {/* ── Figure region (the editing stage; only this is exported) — kept sharp ── */}
        <figure className="relative my-4" style={{ width: figW }}>
          <FigureCanvas />
          <AlignToolbar />
          <figcaption className="mt-3 text-[12px] leading-snug text-neutral-800">
            <b>Figure 1 |</b> <CaptionEditor />
          </figcaption>
        </figure>

        <div className={`mt-4 ${cols} gap-6 blur-[1.2px]`}>
          <p className="body-col mb-3 text-[13.5px] leading-[1.5] text-neutral-800">{fakeParagraph(41, 5)}</p>
          <p className="body-col text-[13.5px] leading-[1.5] text-neutral-800">{fakeParagraph(58, 4)}</p>
        </div>

        {/* corner watermark (never exported) */}
        <div className="pointer-events-none absolute bottom-2 right-3 select-none text-[9px] uppercase tracking-widest text-neutral-300">
          SciCompose preview
        </div>
      </div>
    </div>
  );
}
