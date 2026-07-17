import { ArticleCard } from "./article-card";
import type { BlogPost } from "../../../lib/blog";

export function ArticlesGrid({ articles, emptyMessage = "No articles are available yet." }: { articles: BlogPost[]; emptyMessage?: string }) {
  if (!articles.length) return <div className="articles-empty" role="status"><p>{emptyMessage}</p></div>;
  return <div className="articles-grid">{articles.map((article) => <ArticleCard article={article} key={article.slug} />)}</div>;
}
