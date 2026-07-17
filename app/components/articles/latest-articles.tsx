import Link from "next/link";
import { ArticlesGrid } from "./articles-grid";
import type { BlogPost } from "../../../lib/blog";

export function LatestArticles({ posts }: { posts: BlogPost[] }) {
  return <section id="articles" className="section articles-section" aria-labelledby="latest-articles-title"><div className="section-heading"><div><p className="eyebrow">TECHNICAL WRITING</p><h2 id="latest-articles-title">Latest Articles</h2></div><Link className="button ghost articles-view-all" href="/blog">View All Articles <span aria-hidden="true">→</span></Link></div><ArticlesGrid articles={posts.slice(0, 3)} emptyMessage="No articles have been published yet." /></section>;
}
