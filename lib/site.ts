import type { Metadata } from "next";

export const siteUrl = "https://gajan.dev";

export function absoluteUrl(path = "/") {
  return path === "/" ? siteUrl : new URL(path, siteUrl).toString();
}

export function pageMetadata({ title, description, path, keywords = [], noIndex = false }: { title: string; description: string; path: string; keywords?: string[]; noIndex?: boolean }): Metadata {
  const url = absoluteUrl(path);
  return { title, description, keywords, alternates: { canonical: path }, robots: noIndex ? { index: false, follow: false } : { index: true, follow: true }, openGraph: { type: "website", siteName: "Gajan.dev", title, description, url }, twitter: { card: "summary", title, description } };
}
