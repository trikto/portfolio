import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 }, { url: absoluteUrl("/tools"), changeFrequency: "monthly", priority: 0.8 }, { url: absoluteUrl("/workouts"), changeFrequency: "weekly", priority: 0.3 }];
}
