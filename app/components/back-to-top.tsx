"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return visible ? <a className="back-to-top" href="#site-top" aria-label="Back to top">↑</a> : null;
}
