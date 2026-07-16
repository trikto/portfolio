import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export default function BlogLoading() {
  return <main className="site concept-cloud blog-page" aria-busy="true"><div className="utility"><span className="pulse" /> DEVOPS FIELD NOTES</div><SiteHeader /><section className="blog-hero"><p className="eyebrow">TECHNICAL WRITING</p><h1>Articles</h1><p>Loading practical DevOps and cloud infrastructure articles.</p></section><section className="blog-content" aria-label="Loading articles"><div className="articles-grid">{Array.from({ length: 6 }, (_, index) => <div className="article-skeleton" aria-hidden="true" key={index}><div /><span /><span /><span /></div>)}</div></section><SiteFooter /></main>;
}
