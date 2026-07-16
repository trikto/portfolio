import Link from "next/link";
import { ArticlesGrid } from "./articles-grid";
import type { ArticleFeed } from "../../../types/article";

export function LatestArticles({ feed }: { feed: ArticleFeed }) {
  const articles = feed.articles.slice(0, 3);
  return <section id="articles" className="section articles-section" aria-labelledby="latest-articles-title"><div className="section-heading"><div><p className="eyebrow">TECHNICAL WRITING</p><h2 id="latest-articles-title">Latest Articles</h2></div><Link className="button ghost articles-view-all" href="/blog">View All Articles <span aria-hidden="true">→</span></Link></div>{feed.source === "catalog" && articles.length > 0 ? <p className="articles-notice" role="status">Medium is temporarily unavailable. Showing saved articles.</p> : null}<ArticlesGrid articles={articles} emptyMessage={feed.source === "catalog" ? "Articles are temporarily unavailable." : "No articles have been published yet."} /></section>;
}
