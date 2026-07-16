import { XMLParser } from "fast-xml-parser";
import catalogData from "../data/articles.json" with { type: "json" };
import type { Article, ArticleFeed } from "../types/article.ts";

export const MEDIUM_PROFILE_URL = "https://trikto.medium.com";
export const MEDIUM_FEED_URL = `${MEDIUM_PROFILE_URL}/feed`;

type FeedItem = Record<string, unknown>;

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
const catalogArticles = catalogData as Article[];
const defaultDescription = "Read the full article on Medium.";

function list<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object" && "#text" in value) return text((value as { "#text": unknown })["#text"]);
  return "";
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, code: string) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const point = Number.parseInt(code[1].toLowerCase() === "x" ? code.slice(2) : code.slice(1), code[1].toLowerCase() === "x" ? 16 : 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
  });
}

function plainText(html: string): string {
  // ponytail: the feed only needs a safe excerpt; add an HTML parser if Medium's markup outgrows this boundary.
  return decodeEntities(html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value: string, length = 190): string {
  if (!value) return defaultDescription;
  if (value.length <= length) return value;
  const shortened = value.slice(0, length + 1);
  return `${shortened.slice(0, shortened.lastIndexOf(" ") > length / 2 ? shortened.lastIndexOf(" ") : length).trim()}…`;
}

function imageFrom(html: string): string | undefined {
  const candidate = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  if (!candidate) return undefined;
  try {
    const url = new URL(decodeEntities(candidate));
    return url.protocol === "https:" && (url.hostname === "medium.com" || url.hostname.endsWith(".medium.com")) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function articleSlug(value: string): string | undefined {
  try {
    const url = new URL(value);
    const slug = url.pathname.split("/").filter(Boolean).at(-1);
    return url.protocol === "https:" && slug && /^[a-z0-9][a-z0-9-]*$/i.test(slug) ? slug : undefined;
  } catch {
    return undefined;
  }
}

function normalizeItem(item: FeedItem): Article | undefined {
  const title = text(item.title);
  const url = text(item.link);
  const slug = articleSlug(url);
  const date = new Date(text(item.pubDate));
  if (!title || !url || !slug || Number.isNaN(date.getTime())) return undefined;

  const bodyHtml = text(item["content:encoded"]) || text(item.description);
  const body = plainText(bodyHtml);
  const words = body ? body.split(/\s+/).length : 0;
  const categories = list(item.category).map(text).filter(Boolean);

  return {
    title: decodeEntities(title),
    description: excerpt(body),
    url,
    slug,
    image: imageFrom(bodyHtml),
    publishedAt: date.toISOString(),
    readingTime: words ? `${Math.max(1, Math.ceil(words / 200))} min read` : undefined,
    categories: categories.length ? categories : undefined,
  };
}

export function parseMediumFeed(xml: string): Article[] {
  const document = parser.parse(xml) as { rss?: { channel?: { item?: FeedItem | FeedItem[] } | string } };
  const channel = document.rss?.channel;
  if (channel === undefined) throw new Error("Medium feed did not contain an RSS channel.");
  if (typeof channel !== "object" || channel === null) return [];

  const items = list(channel.item);
  const articles = items.flatMap((item) => {
    const article = normalizeItem(item);
    return article ? [article] : [];
  });
  if (items.length && !articles.length) throw new Error("Medium feed contained no valid article entries.");
  return articles.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function mergeArticles(saved: Article[], incoming: Article[]): Article[] {
  const merged = new Map(saved.map((article) => [article.slug, article]));

  for (const article of incoming) {
    const current = merged.get(article.slug);
    merged.set(article.slug, {
      ...current,
      ...article,
      description: current && article.description === defaultDescription ? current.description : article.description,
      image: article.image ?? current?.image,
      readingTime: article.readingTime ?? current?.readingTime,
      categories: article.categories?.length ? article.categories : current?.categories,
    });
  }

  return [...merged.values()].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export async function getMediumArticles(): Promise<ArticleFeed> {
  try {
    const response = await fetch(MEDIUM_FEED_URL, {
      headers: { Accept: "application/rss+xml, application/xml;q=0.9", "User-Agent": "gajan.dev article feed" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Medium feed returned ${response.status}.`);
    return { articles: mergeArticles(catalogArticles, parseMediumFeed(await response.text())), source: "medium" };
  } catch (error) {
    console.error("Unable to load Medium articles; using the saved catalog.", error);
    return { articles: mergeArticles(catalogArticles, []), source: "catalog" };
  }
}
