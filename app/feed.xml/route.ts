import { getPublishedPosts } from "../../lib/blog";
import { absoluteUrl, siteUrl } from "../../lib/site";

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[character] ?? character);
}

export function GET() {
  const items = getPublishedPosts().map((post) => `<item><title>${escapeXml(post.title)}</title><link>${absoluteUrl(`/blog/${post.slug}`)}</link><guid isPermaLink="true">${absoluteUrl(`/blog/${post.slug}`)}</guid><description>${escapeXml(post.description)}</description><pubDate>${new Date(`${post.publishedAt}T00:00:00Z`).toUTCString()}</pubDate><dc:creator>${escapeXml(post.author)}</dc:creator>${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}${post.coverImage ? `<media:content url="${absoluteUrl(post.coverImage)}" medium="image" />` : ""}</item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Gajan.dev — DevOps Field Notes</title><link>${siteUrl}</link><description>Practical writing about DevOps, cloud infrastructure, Linux, CI/CD, Kubernetes, automation, and reliable systems.</description><language>en</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate><atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
