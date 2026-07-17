import type { Metadata } from "next";
import { BackToTop } from "../components/back-to-top";
import { ArticlesGrid } from "../components/articles/articles-grid";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getPublishedPosts } from "../../lib/blog";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "DevOps Articles | Gajan",
  description: "Practical articles about DevOps, Linux, cloud infrastructure, CI/CD, Kubernetes and automation.",
  path: "/blog",
});

export default function BlogPage() {
  return <main id="site-top" className="site concept-cloud blog-page"><div className="utility"><span className="pulse" /> DEVOPS FIELD NOTES</div><SiteHeader /><section className="blog-hero" aria-labelledby="articles-title"><p className="eyebrow">TECHNICAL WRITING</p><h1 id="articles-title">Articles</h1><p>Practical writing about DevOps, cloud infrastructure, Linux, CI/CD, Kubernetes, automation, and the operational lessons behind reliable systems.</p></section><section className="blog-content" aria-label="Published articles"><ArticlesGrid articles={getPublishedPosts()} emptyMessage="No articles have been published yet." /></section><SiteFooter /><BackToTop /></main>;
}
