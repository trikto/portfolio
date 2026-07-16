import { ArticleImage } from "./article-image";
import type { Article } from "../../../types/article";

export function ArticleCard({ article }: { article: Article }) {
  return <article className="article-card"><a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Read ${article.title} on Medium (opens in a new tab)`}><ArticleImage image={article.image} title={article.title} /><div className="article-card-body"><div className="article-card-meta"><span className="medium-badge">Medium</span><time dateTime={article.publishedAt}>{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(article.publishedAt))}</time>{article.readingTime && <span>{article.readingTime}</span>}</div><h2>{article.title}</h2><p>{article.description}</p>{article.categories?.length ? <div className="article-categories" aria-label="Article topics">{article.categories.slice(0, 3).map((category) => <span key={category}>{category}</span>)}</div> : null}<span className="article-action">Read on Medium <b aria-hidden="true">↗</b></span></div></a></article>;
}
