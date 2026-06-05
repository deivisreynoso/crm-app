"use client";

import { useEffect } from "react";
import { ga4Events } from "@/lib/analytics/ga4-events";

export function ScrollDepthTracker() {
  useEffect(() => {
    const tracked = new Set<number>();

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      if (documentHeight <= windowHeight) return;
      // Avoid firing depth milestones before the user scrolls (e.g. short booking page).
      if (window.scrollY < 80) return;

      const scrollPercentage =
        (window.scrollY + windowHeight) / documentHeight;

      if (scrollPercentage >= 0.5 && !tracked.has(50)) {
        ga4Events.scrollDepth(50);
        tracked.add(50);
      }
      if (scrollPercentage >= 0.75 && !tracked.has(75)) {
        ga4Events.scrollDepth(75);
        tracked.add(75);
      }
      if (scrollPercentage >= 0.9 && !tracked.has(90)) {
        ga4Events.scrollDepth(90);
        tracked.add(90);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return null;
}
