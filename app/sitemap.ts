import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts: MetadataRoute.Sitemap = getPublishedPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(`${post.updatedAt || post.publishedAt}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [{ url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 }, { url: absoluteUrl("/services"), changeFrequency: "monthly", priority: 0.9 }, { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 }, ...posts, { url: absoluteUrl("/tools"), changeFrequency: "monthly", priority: 0.8 }, { url: absoluteUrl("/cron"), changeFrequency: "monthly", priority: 0.7 }, { url: absoluteUrl("/yaml"), changeFrequency: "monthly", priority: 0.7 }, { url: absoluteUrl("/workouts"), changeFrequency: "weekly", priority: 0.3 }];
}
