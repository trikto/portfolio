"use client";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export default function BlogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="site concept-cloud blog-page"><div className="utility"><span className="pulse" /> DEVOPS FIELD NOTES</div><SiteHeader /><section className="blog-hero blog-error" aria-labelledby="blog-error-title"><p className="eyebrow">TEMPORARILY UNAVAILABLE</p><h1 id="blog-error-title">Articles could not load.</h1><p>The portfolio is still available. Retry the article page when you are ready.</p><button className="button primary" onClick={reset}>Try again <span aria-hidden="true">↻</span></button></section><SiteFooter /></main>;
}
