import Link from "next/link";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";

export default function NotFound() {
  return <main id="site-top" className="site concept-cloud blog-page"><div className="utility"><span className="pulse" /> DEVOPS FIELD NOTES</div><SiteHeader /><section className="blog-hero blog-error" aria-labelledby="not-found-title"><p className="eyebrow">404 / ROUTE NOT FOUND</p><h1 id="not-found-title">This page drifted off course.</h1><p>The page you requested does not exist, but the portfolio and tools are still online.</p><Link className="button primary" href="/">Return home <span aria-hidden="true">→</span></Link></section><SiteFooter /></main>;
}
