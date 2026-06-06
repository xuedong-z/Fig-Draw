"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { TOUR_STEPS } from "@/lib/tour";

/** Drives driver.js when tourActive flips true (first run or "Replay tour"). Steps,
 * popovers and buttons are translated at drive time, so the tour follows EN / 中文.
 * Anchors not present in the DOM are skipped. Mounted at the Editor root. */
export function Tour() {
  const tourActive = useStore((s) => s.tourActive);
  const endTour = useStore((s) => s.endTour);
  const lang = useStore((s) => s.lang);
  const t = useT();

  useEffect(() => {
    if (!tourActive) return;
    const scrollCanvas = (to: "top" | "bottom") => {
      const main = document.querySelector('[data-tour="canvas"]');
      if (main) main.scrollTo({ top: to === "bottom" ? main.scrollHeight : 0, behavior: "smooth" });
    };
    const filtered = TOUR_STEPS.filter((s) => document.querySelector(s.selector));
    const steps = filtered.map((s) => ({
      element: s.selector,
      popover: {
        title: s.title[lang],
        description: s.body[lang],
        side: s.side ?? "bottom",
        align: s.align ?? "start"
      }
    }));
    if (!steps.length) {
      endTour();
      return;
    }
    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: t("tour.next"),
      prevBtnText: t("tour.prev"),
      doneBtnText: t("tour.done"),
      steps,
      // Scroll the canvas workspace into the right spot AFTER each step highlights, so the
      // relevant panel is in view (e.g. the LAST panel for the resize step). Per-step hooks
      // proved unreliable in driver 1.4; the global hook + activeIndex maps back to the
      // original step's `scrollCanvas`.
      onHighlighted: (_el, _step, opts) => {
        const orig = filtered[opts.state.activeIndex ?? -1];
        // defer so driver's own highlight-scroll settles first, then position the canvas
        if (orig?.scrollCanvas) window.setTimeout(() => scrollCanvas(orig.scrollCanvas!), 150);
      },
      onDestroyed: () => endTour()
    });
    d.drive();
    return () => d.destroy();
  }, [tourActive, lang, endTour, t]);

  return null;
}
