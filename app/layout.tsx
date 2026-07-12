import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { pageMetadata, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...pageMetadata({ title: "Gajan Rajah | DevOps and Cloud Engineer", description: "DevOps engineer portfolio covering cloud engineering, Linux, Kubernetes, AWS, infrastructure automation, and observability.", path: "/", keywords: ["DevOps engineer", "cloud engineering", "infrastructure automation", "Linux", "Kubernetes", "AWS", "DevOps portfolio"] }),
  icons: { icon: "/favicon.svg" },
};

const structuredData = { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", name: "Gajan.dev", url: siteUrl, description: "DevOps engineering portfolio and browser-based developer tools." }, { "@type": "Person", name: "Gajan Rajah", url: siteUrl, jobTitle: "DevOps and Cloud Engineer", sameAs: ["https://www.linkedin.com/in/gajanrajah", "https://github.com/trikto/portfolio"] }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />{children}</body></html>; }
