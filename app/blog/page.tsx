import type { Metadata } from "next";
import { ArticlesGrid } from "../components/articles/articles-grid";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getMediumArticles } from "../../lib/medium";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "DevOps Articles | Gajan",
  description: "Practical articles about DevOps, Linux, cloud infrastructure, CI/CD, Kubernetes and automation.",
  path: "/blog",
});

export default async function BlogPage() {
  const feed = await getMediumArticles();
  return <main className="site concept-cloud blog-page"><div className="utility"><span className="pulse" /> DEVOPS FIELD NOTES</div><SiteHeader /><section className="blog-hero" aria-labelledby="articles-title"><p className="eyebrow">TECHNICAL WRITING</p><h1 id="articles-title">Articles</h1><p>Practical writing about DevOps, cloud infrastructure, Linux, CI/CD, Kubernetes, automation, and the operational lessons behind reliable systems.</p></section><section className="blog-content" aria-label="Published articles">{feed.source === "catalog" && feed.articles.length > 0 ? <p className="articles-notice" role="status">Medium is temporarily unavailable. Showing saved articles.</p> : null}<ArticlesGrid articles={feed.articles} emptyMessage={feed.source === "catalog" ? "Articles are temporarily unavailable. Please try again later." : "No articles have been published yet."} /></section><SiteFooter /></main>;
}
