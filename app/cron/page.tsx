import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import { absoluteUrl, pageMetadata } from "@/lib/site";

const description = "Validate cron expressions, understand each field, and preview upcoming execution times directly in your browser.";

export const metadata: Metadata = pageMetadata({ title: "Cron Expression Validator & Generator | Gajan", description, path: "/cron" });

const structuredData = { "@context": "https://schema.org", "@type": "WebApplication", name: "Cron Expression Validator", url: absoluteUrl("/cron"), description, applicationCategory: "DeveloperApplication", operatingSystem: "Any" };

export default function CronPage() {
  return <main className="site concept-cloud tool-placeholder"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><div className="utility"><span className="pulse" /> DEVOPS UTILITIES</div><SiteHeader /><section><p className="eyebrow">CRON SCHEDULE TOOL</p><h1>Cron Expression Validator</h1><p>Validate a crontab validator expression, inspect each field with a cron parser, and preview the next cron execution time with a schedule generator.</p><Link className="button primary" href="/tools">Back to tools <span>←</span></Link></section></main>;
}
