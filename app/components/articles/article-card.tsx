import Link from "next/link";
import { ArticleImage } from "./article-image";
import type { BlogPost } from "../../../lib/blog";

export function ArticleCard({ article }: { article: BlogPost }) {
  return <article className="article-card"><Link href={`/blog/${article.slug}`} aria-label={`Read ${article.title}`}><ArticleImage image={article.coverImage} title={article.title} /><div className="article-card-body"><div className="article-card-meta"><span className="article-badge">Article</span><time dateTime={article.publishedAt}>{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${article.publishedAt}T00:00:00Z`))}</time><span>{article.readingMinutes} min read</span></div><h2>{article.title}</h2><p>{article.description}</p>{article.tags.length ? <div className="article-tags" aria-label="Article topics">{article.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}<span className="article-action">Read article <b aria-hidden="true">→</b></span></div></Link></article>;
}
