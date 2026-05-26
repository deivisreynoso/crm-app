"use client";

import { useEffect, useState } from "react";

/** Hero art — desktop only so mobile skips the ~200KB+ download. */
export function HeroMascot() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setVisible(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!visible) return null;

  return (
    <div className="website-hero-image-area flex justify-center lg:justify-end website-float">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/website/hero-mascot-400.webp"
        srcSet="/website/hero-mascot-400.webp 400w, /website/hero-mascot.webp 800w"
        sizes="(min-width: 1024px) 400px"
        alt="ClickIn360 assistant"
        width={800}
        height={800}
        fetchPriority="high"
        decoding="async"
        className="w-full max-w-[min(100%,320px)] lg:max-w-[400px] h-auto drop-shadow-2xl"
      />
    </div>
  );
}
