import type { Metadata } from "next";

export const siteUrl = "https://gajan.dev";

export function absoluteUrl(path = "/") {
  return path === "/" ? siteUrl : new URL(path, siteUrl).toString();
}

export function pageMetadata({ title, description, path, noIndex = false }: { title: string; description: string; path: string; noIndex?: boolean }): Metadata {
  return { title, description, alternates: { canonical: path }, robots: noIndex ? { index: false, follow: false } : { index: true, follow: true }, openGraph: { type: "website", siteName: "Gajan.dev", title, description, url: absoluteUrl(path) }, twitter: { card: "summary", title, description } };
}
