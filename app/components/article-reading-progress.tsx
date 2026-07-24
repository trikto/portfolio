"use client";

import { useEffect, useState } from "react";

export function ArticleReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const prose = document.querySelector(".article-prose");
      const footer = document.querySelector(".article-footer");
      if (!prose || !footer) return;
      const start = prose.getBoundingClientRect().top + window.scrollY;
      const end = footer.getBoundingClientRect().bottom + window.scrollY;
      const next = Math.round(Math.min(100, Math.max(0, ((window.scrollY - start) / (end - start)) * 100)));
      setProgress((current) => current === next ? current : next);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="article-reading-progress" aria-hidden="true"><div className="article-reading-progress-track"><span className="article-reading-progress-fill" style={{ transform: `scaleX(${progress / 100})` }} /></div><span className="article-reading-progress-label">{progress}%</span></div>;
}
