import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  coverImage?: string;
  mediumUrl?: string;
  draft: boolean;
  readingMinutes: number;
};

export type BlogPost = BlogPostMeta & { content: string };

const contentDirectory = path.join(process.cwd(), "content", "blog");
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9][a-z0-9-]*$/;

function requiredString(value: unknown, field: string, fileName: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${fileName}: frontmatter "${field}" must be a non-empty string.`);
  return value.trim();
}

function optionalString(value: unknown, field: string, fileName: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${fileName}: frontmatter "${field}" must be a string when provided.`);
  return value.trim() || undefined;
}

function date(value: unknown, field: string, fileName: string, required: boolean): string | undefined {
  const parsed = required ? requiredString(value, field, fileName) : optionalString(value, field, fileName);
  const parsedDate = parsed ? new Date(`${parsed}T00:00:00Z`) : undefined;
  if (parsed && (!datePattern.test(parsed) || Number.isNaN(parsedDate?.getTime()) || parsedDate?.toISOString().slice(0, 10) !== parsed)) {
    throw new Error(`${fileName}: frontmatter "${field}" must use YYYY-MM-DD.`);
  }
  return parsed;
}

export function calculateReadingMinutes(content: string): number {
  const text = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_[\]()|~-]/g, " ");
  const words = text.trim().match(/\S+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}

export function parseBlogPostSource(slug: string, source: string): BlogPost {
  const fileName = `${slug}.mdx`;
  const { data, content } = matter(source);
  const publishedAt = date(data.publishedAt, "publishedAt", fileName, true)!;
  const updatedAt = date(data.updatedAt, "updatedAt", fileName, false);

  if (!Array.isArray(data.tags) || data.tags.length === 0 || data.tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
    throw new Error(`${fileName}: frontmatter "tags" must be a non-empty array of strings.`);
  }
  if (typeof data.draft !== "boolean") throw new Error(`${fileName}: frontmatter "draft" must be a boolean.`);

  const coverImage = optionalString(data.coverImage, "coverImage", fileName);
  if (coverImage && (!coverImage.startsWith(`/blog/${slug}/`) || coverImage.includes(".."))) {
    throw new Error(`${fileName}: frontmatter "coverImage" must be a local /blog/${slug}/ path.`);
  }
  if (coverImage && !existsSync(path.join(process.cwd(), "public", ...coverImage.split("/").filter(Boolean)))) {
    throw new Error(`${fileName}: frontmatter "coverImage" references a missing local file: ${coverImage}.`);
  }

  const mediumUrl = optionalString(data.mediumUrl, "mediumUrl", fileName);
  if (mediumUrl) {
    let url: URL;
    try {
      url = new URL(mediumUrl);
    } catch {
      throw new Error(`${fileName}: frontmatter "mediumUrl" must be a valid Medium HTTPS URL.`);
    }
    if (url.protocol !== "https:") throw new Error(`${fileName}: frontmatter "mediumUrl" must be a valid Medium HTTPS URL.`);
  }

  return {
    slug,
    title: requiredString(data.title, "title", fileName),
    description: requiredString(data.description, "description", fileName),
    publishedAt,
    updatedAt,
    author: requiredString(data.author, "author", fileName),
    tags: data.tags.map((tag: string) => tag.trim()),
    coverImage,
    mediumUrl,
    draft: data.draft,
    readingMinutes: calculateReadingMinutes(content),
    content: content.trim(),
  };
}

function parsePost(slug: string): BlogPost {
  return parseBlogPostSource(slug, readFileSync(path.join(contentDirectory, `${slug}.mdx`), "utf8"));
}

export function getAllPostSlugs(): string[] {
  if (!existsSync(contentDirectory)) return [];
  return readdirSync(contentDirectory)
    .filter((fileName) => fileName.endsWith(".mdx") && fileName !== "_template.mdx")
    .map((fileName) => fileName.slice(0, -4))
    .filter((slug) => slugPattern.test(slug));
}

export function getAllPosts(): BlogPost[] {
  return getAllPostSlugs()
    .map(parsePost)
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function getPublishedPosts(): BlogPost[] {
  return getAllPosts().filter((post) => !post.draft);
}

export function getPostBySlug(slug: string): BlogPost | null {
  if (!slugPattern.test(slug) || !existsSync(path.join(contentDirectory, `${slug}.mdx`))) return null;
  return parsePost(slug);
}

export function getRelatedPosts(post: BlogPost, posts = getPublishedPosts(), limit = 3): BlogPost[] {
  const tags = new Set(post.tags.map((tag) => tag.toLowerCase()));
  return posts
    .filter((candidate) => candidate.slug !== post.slug && !candidate.draft)
    .map((candidate) => ({ candidate, matches: candidate.tags.filter((tag) => tags.has(tag.toLowerCase())).length }))
    .filter(({ matches }) => matches > 0)
    .sort((left, right) => right.matches - left.matches || Date.parse(right.candidate.publishedAt) - Date.parse(left.candidate.publishedAt))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
