"use client";

import Image from "next/image";
import { useState } from "react";

export function ArticleImage({ image, title }: { image?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const source = image && !failed ? image : "/article-fallback.svg";
  return <div className="article-cover"><Image alt={`${title} article cover`} fill onError={() => setFailed(true)} sizes="(max-width: 800px) 100vw, (max-width: 1100px) 50vw, 33vw" src={source} /></div>;
}
