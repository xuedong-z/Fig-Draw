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
    const steps = TOUR_STEPS.filter((s) => document.querySelector(s.selector)).map((s) => ({
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
      onDestroyed: () => endTour()
    });
    d.drive();
    return () => d.destroy();
  }, [tourActive, lang, endTour, t]);

  return null;
}
