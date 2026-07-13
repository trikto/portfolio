import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import { absoluteUrl, pageMetadata } from "@/lib/site";
import { CronEditor } from "./cron-editor";

const title = "Crontab Editor – Cron Generator & Validator | gajan.dev";
const description = "Free online crontab editor to build, validate, explain, and preview Linux cron expressions. See upcoming run times in your timezone.";
export const metadata: Metadata = {
  ...pageMetadata({ title, description, path: "/cron" }),
  openGraph: { type: "website", siteName: "gajan.dev", title, description, url: absoluteUrl("/cron") },
  twitter: { card: "summary_large_image", title, description },
};
const structuredData = { "@context": "https://schema.org", "@type": "WebApplication", name: "Cron Expression Editor and Validator", url: absoluteUrl("/cron"), description, applicationCategory: "DeveloperApplication", operatingSystem: "Any" };

export default function CronPage() { return <main className="site concept-cloud cron-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div><SiteHeader /><section className="cron-hero"><p className="eyebrow">DEVOPS UTILITIES / <a href="/tools">ALL TOOLS</a></p><h1>Cron Expression Editor</h1><p>Build, validate, and understand Linux cron schedules directly in your browser.</p></section><CronEditor /><footer className="cron-footer">Built for browser-only schedule checks · <a href="/tools">More DevOps tools</a></footer></main>; }
